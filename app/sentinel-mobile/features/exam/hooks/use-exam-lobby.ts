import { useCallback, useEffect, useRef, useState } from 'react';
import { useColorScheme, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '@/constants/theme';
import { useApi, useAuth, useExamLobbyCountQuery, useExamQuery } from '@sentinel/hooks';
import {
    checkIntoExamLobby,
    getExamLobbyAdmissionStatus,
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
    const exam = rawExam ? adaptExamForMobile(rawExam) : undefined;
    const [isStartingSession, setIsStartingSession] = useState(false);
    const [admissionStatus, setAdmissionStatus] = useState<LobbyAdmissionStatus>(null);

    const { supabase, session: authSession } = useAuth();
    const [presenceCount, setPresenceCount] = useState(0);

    const [isMediaPipeCalibrated, setIsMediaPipeCalibrated] = useState(false);
    const [isAudioReady, setIsAudioReady] = useState(false);

    // Monotonic counter to prevent stale out-of-order responses from overwriting newer status
    const statusSequenceRef = useRef<number>(0);

    const requiresInstructorAdmission =
        exam?.configuration?.lobbyAdmissionMode === 'INSTRUCTOR_GATED';
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

    const updateStatusSafely = useCallback((newStatus: string | null | undefined, seq: number) => {
        if (seq < statusSequenceRef.current) {
            return; // Ignore stale out-of-order response
        }
        statusSequenceRef.current = seq;
        if (newStatus === 'APPROVED' || newStatus === 'WAITING' || newStatus === 'REJECTED') {
            setAdmissionStatus(newStatus);
        }
    }, []);

    // Initial check-in on mount
    useEffect(() => {
        if (!id) {
            return;
        }

        const currentSeq = ++statusSequenceRef.current;
        void checkIntoExamLobby(apiClient, id)
            .then(async (checkInResult) => {
                if (checkInResult?.status) {
                    updateStatusSafely(checkInResult.status, currentSeq);
                }
                await refetchExam();
                await refetchLobbyCount();
            })
            .catch(async () => {
                const statusRes = await getExamLobbyAdmissionStatus(apiClient, id).catch(
                    () => null,
                );
                if (statusRes?.status) {
                    updateStatusSafely(statusRes.status, currentSeq);
                }
                await refetchExam();
                await refetchLobbyCount();
            });
    }, [apiClient, id, refetchExam, refetchLobbyCount, updateStatusSafely]);

    // Track calibration and audio readiness — stops polling once both are ready
    useEffect(() => {
        if (!id) return;
        if (isMediaPipeCalibrated && isAudioReady) return;

        const checkReadiness = async () => {
            const profile = await readStoredMobileCalibrationProfile(id);
            const audioReadyStr = await AsyncStorage.getItem(`sentinel-mobile:audio-ready:${id}`);
            const audioReady = audioReadyStr === 'true';

            setIsMediaPipeCalibrated(!isMediaPipeConfigured || !!profile);
            setIsAudioReady(!requiresMicrophone || audioReady);
        };

        void checkReadiness();

        const interval = setInterval(checkReadiness, 1000);
        return () => clearInterval(interval);
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

    // Real-time Postgres changes for instant admission approval
    useEffect(() => {
        if (!supabase || !authSession?.user || !id) return;

        const channelName = `lobby:admissions:${id}`;
        const channel = supabase
            .channel(channelName)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'exam_lobby_admissions',
                    filter: `exam_id=eq.${id}`,
                },
                async () => {
                    const currentSeq = ++statusSequenceRef.current;
                    try {
                        const statusRes = await getExamLobbyAdmissionStatus(apiClient, id);
                        if (statusRes?.status) {
                            updateStatusSafely(statusRes.status, currentSeq);
                            if (statusRes.status === 'APPROVED') {
                                await refetchExam();
                            }
                        }
                    } catch {
                        // Ignore transient network errors
                    } finally {
                        void refetchLobbyCount();
                    }
                },
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [apiClient, id, refetchExam, refetchLobbyCount, authSession?.user, supabase, updateStatusSafely]);

    // Jittered background polling fallback (30s - 45s randomized interval)
    // Prevents 200+ students from hitting the backend admission status endpoint at the same second
    useEffect(() => {
        if (!id || canEnterExam) {
            return;
        }

        let timeoutId: ReturnType<typeof setTimeout> | null = null;
        let isMounted = true;

        const scheduleNextPoll = () => {
            if (!isMounted) return;
            // 30s to 45s randomized jitter
            const jitterMs = 30_000 + Math.floor(Math.random() * 15_000);
            timeoutId = setTimeout(async () => {
                const currentSeq = ++statusSequenceRef.current;
                try {
                    const statusRes = await getExamLobbyAdmissionStatus(apiClient, id);
                    if (statusRes?.status && isMounted) {
                        updateStatusSafely(statusRes.status, currentSeq);
                        if (statusRes.status === 'APPROVED') {
                            await refetchExam();
                        }
                    }
                } catch {
                    // Ignore error during fallback check
                } finally {
                    if (isMounted) {
                        void refetchLobbyCount();
                        scheduleNextPoll();
                    }
                }
            }, jitterMs);
        };

        scheduleNextPoll();

        return () => {
            isMounted = false;
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        };
    }, [apiClient, canEnterExam, id, refetchExam, refetchLobbyCount, updateStatusSafely]);

    useFocusEffect(
        useCallback(() => {
            if (!id) {
                return undefined;
            }

            const currentSeq = ++statusSequenceRef.current;
            void getExamLobbyAdmissionStatus(apiClient, id)
                .then(async (statusRes) => {
                    if (statusRes?.status) {
                        updateStatusSafely(statusRes.status, currentSeq);
                        if (statusRes.status === 'APPROVED') {
                            await refetchExam();
                        }
                    }
                })
                .catch(() => null)
                .finally(() => {
                    void refetchLobbyCount();
                });

            return undefined;
        }, [apiClient, id, refetchExam, refetchLobbyCount, updateStatusSafely]),
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
