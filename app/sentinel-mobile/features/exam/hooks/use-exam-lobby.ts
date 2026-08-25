import { useCallback, useEffect, useRef, useState } from 'react';
import { useColorScheme, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '@/constants/theme';
import {
    useApi,
    useAuth,
    useExamLobbyCountQuery,
    useExamQuery,
    useExamLobbyAdmissionStatusQuery,
    useLobbyRealtime,
} from '@sentinel/hooks';
import {
    checkIntoExamLobby,
    startExamSession,
} from '@sentinel/services';
import { adaptExamForMobile } from '@/features/exam/lib/mobile-exam-adapter';
import { getMobileExamLobbyEntryLabel } from '@/features/exam/lib/mobile-exam-lobby';
import {
    writeStoredMobileExamSession,
    readStoredMobileCalibrationProfile,
} from '@/features/exam/lib/mobile-exam-storage';

export type LobbyAdmissionStatus = 'WAITING' | 'APPROVED' | 'REJECTED' | null;

function generateRequestId(): string {
    if (typeof globalThis.crypto?.randomUUID === 'function') {
        return globalThis.crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

export function useExamLobby() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const apiClient = useApi();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const isDark = colorScheme === 'dark';
    const insets = useSafeAreaInsets();

    const { data: rawExam, refetch: refetchExam } = useExamQuery(id);
    const { data: lobbyCount, refetch: refetchLobbyCount } = useExamLobbyCountQuery(id);
    const {
        data: admissionData,
        refetch: refetchAdmissionStatus,
    } = useExamLobbyAdmissionStatusQuery(id);

    const exam = rawExam ? adaptExamForMobile(rawExam) : undefined;
    const [isStartingSession, setIsStartingSession] = useState(false);

    const { supabase, session: authSession } = useAuth();
    const [presenceCount, setPresenceCount] = useState(0);

    const [isMediaPipeCalibrated, setIsMediaPipeCalibrated] = useState(false);
    const [isAudioReady, setIsAudioReady] = useState(false);

    const requiresInstructorAdmission =
        exam?.configuration?.lobbyAdmissionMode === 'INSTRUCTOR_GATED';

    const admissionStatus: LobbyAdmissionStatus =
        admissionData?.status ?? (!requiresInstructorAdmission ? 'APPROVED' : null);

    const isHardRuntimeBlock =
        exam?.runtimeAccess?.state === 'closed' ||
        exam?.runtimeAccess?.state === 'locked' ||
        exam?.runtimeAccess?.state === 'before_start';
    const isApprovedRuntimeAccess = exam?.runtimeAccess?.state === 'lobby_approved';

    const hasApprovedInstructorAdmission =
        admissionStatus === 'APPROVED' &&
        (isApprovedRuntimeAccess ||
            Boolean(exam?.runtimeAccess?.canStart) ||
            Boolean(exam?.runtimeAccess?.canResume));

    const requiresMicrophone = exam?.configuration?.micRequired ?? true;
    const isMediaPipeConfigured = Boolean(
        exam?.mediaPipeSandbox?.enabled &&
        exam?.mediaPipeSandbox?.captureDuringCheckup,
    );

    // Properly gated: instructor-gated exams strictly require hasApprovedInstructorAdmission
    const canEnterExam = Boolean(
        !isHardRuntimeBlock &&
        isMediaPipeCalibrated &&
        isAudioReady &&
        (requiresInstructorAdmission
            ? hasApprovedInstructorAdmission
            : Boolean(exam?.runtimeAccess?.canStart || exam?.runtimeAccess?.canResume)),
    );

    const entryLabel = getMobileExamLobbyEntryLabel({
        isStartingSession,
        canEnterExam,
        runtimeAccess: exam?.runtimeAccess,
    });

    const handleGoBack = () => router.back();

    const handleEnterExam = async () => {
        if (!exam || isStartingSession) {
            return;
        }

        if (!isMediaPipeCalibrated || !isAudioReady) {
            Alert.alert(
                'Checkup Incomplete',
                'Please complete the system checkup and calibration before entering the exam.',
                [{ text: 'OK' }],
            );
            return;
        }

        if (!canEnterExam) {
            return;
        }

        const resumeRequestId = generateRequestId();

        setIsStartingSession(true);

        try {
            const examSession = await startExamSession(apiClient, {
                examId: exam.id,
                resumeRequestId,
            });

            if (!examSession.sessionId) {
                throw new Error(examSession.error || 'Exam session could not be initialized.');
            }

            await writeStoredMobileExamSession({
                examId: exam.id,
                sessionId: examSession.sessionId,
                isResumed: Boolean(examSession.isResumed),
            });

            router.replace(`/exam/${id}/session/${examSession.sessionId}`);
        } catch (err: any) {
            Alert.alert(
                'Unable to Start Exam',
                err?.message || 'Could not initialize your exam session. Please check your connection and try again.',
                [{ text: 'OK' }],
            );
        } finally {
            setIsStartingSession(false);
        }
    };

    // Initial check-in on mount
    useEffect(() => {
        if (!id) {
            return;
        }

        void checkIntoExamLobby(apiClient, id)
            .then(async () => {
                await Promise.allSettled([
                    refetchAdmissionStatus(),
                    refetchExam(),
                    refetchLobbyCount(),
                ]);
            })
            .catch(async () => {
                await Promise.allSettled([
                    refetchAdmissionStatus(),
                    refetchExam(),
                    refetchLobbyCount(),
                ]);
            });
    }, [apiClient, id, refetchAdmissionStatus, refetchExam, refetchLobbyCount]);

    // Track calibration and audio readiness — evaluates immediately and only intervals if incomplete
    useEffect(() => {
        if (!id) return;
        if (isMediaPipeCalibrated && isAudioReady) return;

        let isMounted = true;
        let interval: ReturnType<typeof setInterval> | null = null;

        const checkReadiness = async (): Promise<boolean> => {
            try {
                const [profile, audioReadyStr] = await Promise.all([
                    readStoredMobileCalibrationProfile(id),
                    AsyncStorage.getItem(`sentinel-mobile:audio-ready:${id}`),
                ]);
                if (!isMounted) return false;

                const audioReady = audioReadyStr === 'true';
                const mediaPipeReady = !isMediaPipeConfigured || Boolean(profile);
                const micReady = !requiresMicrophone || audioReady;

                setIsMediaPipeCalibrated(mediaPipeReady);
                setIsAudioReady(micReady);

                return mediaPipeReady && micReady;
            } catch {
                return false;
            }
        };

        void checkReadiness().then((isReady) => {
            if (!isReady && isMounted) {
                interval = setInterval(async () => {
                    const ready = await checkReadiness();
                    if (ready && interval) {
                        clearInterval(interval);
                        interval = null;
                    }
                }, 1000);
            }
        });

        return () => {
            isMounted = false;
            if (interval) {
                clearInterval(interval);
            }
        };
    }, [id, isMediaPipeConfigured, requiresMicrophone, isMediaPipeCalibrated, isAudioReady]);

    // Supabase Presence tracking for real-time count
    useEffect(() => {
        if (!supabase || !authSession?.user || !id) return;

        const userId = authSession.user.id;
        const channelName = `presence:lobby:${id}`;

        const channel = supabase
            .channel(channelName, {
                config: {
                    presence: {
                        key: userId,
                    },
                },
            })
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState<any>();
                const uniqueUserIds = new Set<string>();

                Object.values(state).forEach((presences) => {
                    presences.forEach((p: any) => {
                        if (p.user_id) uniqueUserIds.add(p.user_id);
                    });
                });

                setPresenceCount(uniqueUserIds.size);
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({
                        user_id: userId,
                        online_at: new Date().toISOString(),
                    });
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [supabase, authSession?.user, id]);

    // Real-time Postgres changes listener via shared useLobbyRealtime (optimistic cache mutation)
    useLobbyRealtime({
        examId: typeof id === 'string' ? id : '',
        enabled: Boolean(id),
        onAdmissionChange: (payload) => {
            const newRow = payload?.new as Record<string, any> | undefined;
            if (newRow?.status === 'APPROVED') {
                void refetchExam();
            }
            void refetchAdmissionStatus();
            void refetchLobbyCount();
        },
    });

    // Adaptive short-polling fallback (2.5s) while waiting for instructor admission
    useEffect(() => {
        if (!id || !requiresInstructorAdmission || admissionStatus === 'APPROVED') {
            return;
        }

        let isMounted = true;
        const interval = setInterval(async () => {
            if (!isMounted) return;
            const res = await refetchAdmissionStatus();
            if (res.data?.status === 'APPROVED') {
                await refetchExam();
            }
        }, 2500);

        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [admissionStatus, id, refetchAdmissionStatus, refetchExam, requiresInstructorAdmission]);

    useFocusEffect(
        useCallback(() => {
            if (!id) {
                return undefined;
            }

            void Promise.allSettled([
                refetchAdmissionStatus(),
                refetchExam(),
                refetchLobbyCount(),
            ]);

            return undefined;
        }, [id, refetchAdmissionStatus, refetchExam, refetchLobbyCount]),
    );

    return {
        exam,
        readyCount: lobbyCount?.count ?? presenceCount ?? 0,
        canEnterExam,
        entryLabel,
        admissionStatus,
        colors,
        isDark,
        insets,
        isStartingSession,
        handleGoBack,
        handleEnterExam,
        isMediaPipeCalibrated,
        isAudioReady,
    };
}
