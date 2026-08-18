import { useCallback, useEffect, useState } from 'react';
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
    const [admissionStatus, setAdmissionStatus] = useState<string | null>(null);

    const { supabase, session } = useAuth();
    const [presenceCount, setPresenceCount] = useState(0);

    const [isMediaPipeCalibrated, setIsMediaPipeCalibrated] = useState(false);
    const [isAudioReady, setIsAudioReady] = useState(false);

    const requiresInstructorAdmission =
        exam?.configuration?.lobbyAdmissionMode === 'INSTRUCTOR_GATED';
    const isHardRuntimeBlock =
        exam?.runtimeAccess?.state === 'closed' ||
        exam?.runtimeAccess?.state === 'locked' ||
        exam?.runtimeAccess?.state === 'before_start';

    const hasApprovedInstructorAdmission =
        admissionStatus === 'APPROVED' || exam?.runtimeAccess?.state === 'lobby_approved';

    const requiresMicrophone = exam?.configuration?.micRequired ?? true;
    const isMediaPipeConfigured = Boolean(
        exam?.mediaPipeSandbox?.enabled &&
        exam?.mediaPipeSandbox?.captureDuringCheckup,
    );

    const canEnterExam = Boolean(
        !isHardRuntimeBlock &&
        isMediaPipeCalibrated &&
        isAudioReady &&
        (exam?.runtimeAccess?.canStart ||
            exam?.runtimeAccess?.canResume ||
            hasApprovedInstructorAdmission ||
            (!requiresInstructorAdmission &&
                (exam?.runtimeAccess?.canStart || exam?.runtimeAccess?.canResume))),
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

        const resumeRequestId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });

        setIsStartingSession(true);

        try {
            const session = await startExamSession(apiClient, {
                examId: exam.id,
                resumeRequestId,
            });

            if (!session.sessionId) {
                throw new Error(session.error || 'Exam session could not be initialized.');
            }

            await writeStoredMobileExamSession({
                examId: exam.id,
                sessionId: session.sessionId,
                isResumed: Boolean(session.isResumed),
            });

            router.replace(`/exam/${id}/session/${session.sessionId}`);
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
            .then(async (checkInResult) => {
                if (checkInResult?.status) {
                    setAdmissionStatus(checkInResult.status);
                }
                await refetchExam();
                await refetchLobbyCount();
            })
            .catch(async () => {
                const statusRes = await getExamLobbyAdmissionStatus(apiClient, id).catch(
                    () => null,
                );
                if (statusRes?.status) {
                    setAdmissionStatus(statusRes.status);
                }
                await refetchExam();
                await refetchLobbyCount();
            });
    }, [apiClient, id, refetchExam, refetchLobbyCount]);

    // Track calibration and audio readiness
    useEffect(() => {
        if (!id) return;

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
    }, [id, isMediaPipeConfigured, requiresMicrophone]);

    // Supabase Presence tracking for real-time count
    useEffect(() => {
        if (!supabase || !session?.user || !id) return;

        const userId = session.user.id;
        const channelName = `presence:lobby:${id}`;

        const channel = supabase.channel(channelName, {
            config: {
                presence: {
                    key: userId,
                },
            },
        });

        channel
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
            void supabase.removeChannel(channel);
        };
    }, [supabase, session?.user, id]);

    // Real-time Postgres changes for instant admission approval
    useEffect(() => {
        if (!supabase || !session?.user || !id) return;

        const channelName = `lobby:admissions:${id}`;
        const channel = supabase.channel(channelName);

        channel
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'exam_lobby_admissions',
                    filter: `exam_id=eq.${id}`,
                },
                async () => {
                    try {
                        const statusRes = await getExamLobbyAdmissionStatus(apiClient, id);
                        if (statusRes?.status) {
                            setAdmissionStatus(statusRes.status);
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
            void supabase.removeChannel(channel);
        };
    }, [apiClient, id, refetchExam, refetchLobbyCount, session?.user, supabase]);

    // Low-frequency (45s) background heartbeat fallback
    useEffect(() => {
        if (!id || canEnterExam) {
            return;
        }

        const fallbackSync = async () => {
            try {
                const statusRes = await getExamLobbyAdmissionStatus(apiClient, id);
                if (statusRes?.status) {
                    setAdmissionStatus(statusRes.status);
                    if (statusRes.status === 'APPROVED') {
                        await refetchExam();
                    }
                }
            } catch {
                // Ignore error during fallback check
            } finally {
                void refetchLobbyCount();
            }
        };

        const interval = setInterval(() => {
            void fallbackSync();
        }, 45000);

        return () => clearInterval(interval);
    }, [apiClient, canEnterExam, id, refetchExam, refetchLobbyCount]);

    useFocusEffect(
        useCallback(() => {
            if (!id) {
                return undefined;
            }

            void getExamLobbyAdmissionStatus(apiClient, id)
                .then(async (statusRes) => {
                    if (statusRes?.status) {
                        setAdmissionStatus(statusRes.status);
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
        }, [apiClient, id, refetchExam, refetchLobbyCount]),
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
