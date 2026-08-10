import { useCallback, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '@/constants/theme';
import { useApi, useExamLobbyCountQuery, useExamQuery } from '@sentinel/hooks';
import {
    checkIntoExamLobby,
    getExamLobbyAdmissionStatus,
    startExamSession,
} from '@sentinel/services';
import { adaptExamForMobile } from '@/features/exam/lib/mobile-exam-adapter';
import { getMobileExamLobbyEntryLabel } from '@/features/exam/lib/mobile-exam-lobby';
import { writeStoredMobileExamSession } from '@/features/exam/lib/mobile-exam-storage';

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

    const requiresInstructorAdmission =
        exam?.configuration?.lobbyAdmissionMode === 'INSTRUCTOR_GATED';
    const isHardRuntimeBlock =
        exam?.runtimeAccess?.state === 'closed' ||
        exam?.runtimeAccess?.state === 'locked' ||
        exam?.runtimeAccess?.state === 'before_start';

    const hasApprovedInstructorAdmission =
        admissionStatus === 'APPROVED' || exam?.runtimeAccess?.state === 'lobby_approved';

    const canEnterExam = Boolean(
        !isHardRuntimeBlock &&
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

        if (!canEnterExam) {
            return;
        }

        setIsStartingSession(true);

        try {
            const session = await startExamSession(apiClient, {
                examId: exam.id,
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

    useEffect(() => {
        if (!id || canEnterExam) {
            return;
        }

        const pollAdmission = async () => {
            try {
                const statusRes = await getExamLobbyAdmissionStatus(apiClient, id);
                if (statusRes?.status) {
                    setAdmissionStatus(statusRes.status);
                    if (statusRes.status === 'APPROVED') {
                        await refetchExam();
                    }
                }
            } catch {
                // Ignore error during polling
            } finally {
                void refetchLobbyCount();
            }
        };

        const interval = setInterval(() => {
            void pollAdmission();
        }, 2000);

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
        readyCount: lobbyCount?.count ?? 0,
        canEnterExam,
        entryLabel,
        admissionStatus,
        colors,
        isDark,
        insets,
        isStartingSession,
        handleGoBack,
        handleEnterExam,
    };
}
