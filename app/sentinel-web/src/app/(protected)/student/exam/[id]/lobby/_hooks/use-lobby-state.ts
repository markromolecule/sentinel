import { useEffect, useState } from 'react';
import { useApi } from '@sentinel/hooks';
import { checkIntoExamLobby, getExamLobbyAdmissionStatus } from '@sentinel/services';
import { readStoredExamSession } from '../../_lib/exam-session-storage';
import { useLobbyTimer } from './use-lobby-timer';
import { useLobbyMediaPipe } from './use-lobby-mediapipe';
import { useLobbyReadiness } from './use-lobby-readiness';
import { useLobbyActions } from './use-lobby-actions';
import type { ExamConfig, ExamData } from '@sentinel/shared/types';
import type { StudentExamMediaPipeSandboxLike } from '../../_lib/student-exam-flow';
import type { ExamLobbyAdmissionStatus } from '@sentinel/services';

/**
 * Coordinates lobby admission state, reconnect re-check-in, and entry gating
 * so instructor-gated reconnects remain in the lobby until fresh approval.
 */
export function useLobbyState(args: {
    examId: string;
    exam?: ExamData | null;
    configuration: ExamConfig;
    mediaPipeSandbox: StudentExamMediaPipeSandboxLike;
    refetchExam: () => Promise<unknown>;
}) {
    const { examId, exam, configuration, mediaPipeSandbox, refetchExam } = args;
    const apiClient = useApi();
    const [isAdmissionPendingRefresh, setIsAdmissionPendingRefresh] = useState(false);
    const [admissionStatus, setAdmissionStatus] = useState<ExamLobbyAdmissionStatus | null>(null);

    // 1. Core Timer
    const { currentTime, countdownLabel } = useLobbyTimer(exam?.runtimeAccess);

    // 2. MediaPipe Status
    const { mediaPipeActivation, mediaPipeLobbyMessage } = useLobbyMediaPipe({
        examId,
        configuration,
        mediaPipeSandbox,
        currentTime,
    });

    // 3. Derived Access State
    const runtimeAccess = exam?.runtimeAccess;

    // 4. Readiness Tracking
    const { hasCompletedFlow } = useLobbyReadiness({
        examId,
        isMediaPipeValid: mediaPipeActivation.isValid,
        configuration,
        runtimeAccess,
    });

    const reopenedUntil = runtimeAccess?.reopenedUntil
        ? new Date(runtimeAccess.reopenedUntil)
        : null;
    const storedSession = readStoredExamSession(examId);
    const requiresInstructorAdmission = configuration.lobbyAdmissionMode === 'INSTRUCTOR_GATED';
    const hasResumableAttempt = Boolean(
        runtimeAccess?.canResume && runtimeAccess?.hasActiveAttempt,
    );
    const shouldSkipLobbySync = hasResumableAttempt && !requiresInstructorAdmission;
    const isApprovedRuntimeAccess = runtimeAccess?.state === 'lobby_approved';
    const isHardRuntimeBlock =
        runtimeAccess?.state === 'closed' ||
        runtimeAccess?.state === 'locked' ||
        runtimeAccess?.state === 'before_start';
    const hasApprovedInstructorAdmission =
        admissionStatus === 'APPROVED' &&
        (isApprovedRuntimeAccess || Boolean(runtimeAccess?.canStart));
    const hasFreshInstructorAdmission =
        !requiresInstructorAdmission || (hasApprovedInstructorAdmission && !isHardRuntimeBlock);
    const canEnterExam = Boolean(
        !isAdmissionPendingRefresh &&
        ((hasResumableAttempt && !requiresInstructorAdmission) ||
            (hasFreshInstructorAdmission && (runtimeAccess?.canStart || isApprovedRuntimeAccess))),
    );

    useEffect(() => {
        let isMounted = true;
        let intervalId: number | null = null;

        const refreshApprovedAccess = async () => {
            setIsAdmissionPendingRefresh(true);
            try {
                await refetchExam();
            } finally {
                if (isMounted) {
                    setIsAdmissionPendingRefresh(false);
                }
            }
        };

        const syncAdmission = async (skipCheckIn = false) => {
            const admission = skipCheckIn
                ? await getExamLobbyAdmissionStatus(apiClient, examId)
                : await checkIntoExamLobby(apiClient, examId);

            if (!isMounted) {
                return;
            }

            setAdmissionStatus(admission.status);

            if (admission.status === 'APPROVED') {
                await refreshApprovedAccess();
            }
        };

        if (shouldSkipLobbySync) {
            return () => {
                isMounted = false;
            };
        }

        if (!requiresInstructorAdmission) {
            void checkIntoExamLobby(apiClient, examId)
                .then(async (admission) => {
                    if (!isMounted) {
                        return;
                    }

                    setAdmissionStatus(admission.status);

                    // Refresh exam data so reconnect attempt counts reflected in
                    // runtimeAccess are up-to-date immediately after check-in.
                    await refreshApprovedAccess();
                })
                .catch(() => null)
                .finally(() => {
                    if (isMounted) {
                        setIsAdmissionPendingRefresh(false);
                    }
                });

            return () => {
                isMounted = false;
            };
        }

        void syncAdmission();
        intervalId = window.setInterval(() => {
            void syncAdmission(true);
        }, 5000);

        return () => {
            isMounted = false;

            if (intervalId !== null) {
                window.clearInterval(intervalId);
            }
        };
    }, [apiClient, examId, refetchExam, requiresInstructorAdmission, shouldSkipLobbySync]);

    // 5. Actions Orchestration
    const { isStartingSession, handleEnterExam } = useLobbyActions({
        examId,
        configuration,
        runtimeAccess,
        storedSession,
        hasCompletedFlow,
        canEnterExam,
    });

    return {
        currentTime,
        countdownLabel,
        hasCompletedFlow,
        runtimeAccess,
        canEnterExam,
        reopenedUntil,
        storedSession,
        mediaPipeLobbyMessage,
        admissionStatus,
        isStartingSession,
        isAdmissionPendingRefresh,
        handleEnterExam,
    };
}
