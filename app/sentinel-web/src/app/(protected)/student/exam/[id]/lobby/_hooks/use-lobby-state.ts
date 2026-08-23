import { useCallback, useEffect, useRef, useState } from 'react';
import { useApi, useExamLobbyAdmissionStatusQuery, useLobbyRealtime } from '@sentinel/hooks';
import { checkIntoExamLobby } from '@sentinel/services';
import { toast } from 'sonner';
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
    const prevStatusRef = useRef<ExamLobbyAdmissionStatus | null>(null);

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

    // 5. Reactive Admission Query (TanStack Query with 2.5s adaptive polling fallback)
    const {
        data: admissionData,
        refetch: refetchAdmissionStatus,
    } = useExamLobbyAdmissionStatusQuery(shouldSkipLobbySync ? undefined : examId);

    const admissionStatus: ExamLobbyAdmissionStatus | null =
        admissionData?.status ??
        (shouldSkipLobbySync
            ? 'APPROVED'
            : !requiresInstructorAdmission
                ? 'APPROVED'
                : null);

    const isApprovedRuntimeAccess = runtimeAccess?.state === 'lobby_approved';
    const isHardRuntimeBlock =
        runtimeAccess?.state === 'closed' ||
        runtimeAccess?.state === 'locked' ||
        runtimeAccess?.state === 'before_start';
    const hasApprovedInstructorAdmission =
        admissionStatus === 'APPROVED' &&
        (isApprovedRuntimeAccess ||
            Boolean(runtimeAccess?.canStart) ||
            Boolean(runtimeAccess?.canResume));
    const hasFreshInstructorAdmission =
        !requiresInstructorAdmission || (hasApprovedInstructorAdmission && !isHardRuntimeBlock);
    const canEnterExam = Boolean(
        !isAdmissionPendingRefresh &&
        ((hasResumableAttempt && !requiresInstructorAdmission) ||
            (hasFreshInstructorAdmission &&
                (runtimeAccess?.canStart || runtimeAccess?.canResume || isApprovedRuntimeAccess))),
    );

    const refreshApprovedAccess = useCallback(async () => {
        setIsAdmissionPendingRefresh(true);
        try {
            await refetchExam();
        } finally {
            setIsAdmissionPendingRefresh(false);
        }
    }, [refetchExam]);

    // Real-time admission event listener for instant sub-second unlock
    useLobbyRealtime({
        examId,
        enabled: !shouldSkipLobbySync,
        onAdmissionChange: () => {
            void refetchAdmissionStatus();
            void refreshApprovedAccess();
        },
    });

    // Detect transition from WAITING/REJECTED to APPROVED to show toast and refresh runtime access
    useEffect(() => {
        if (admissionStatus === 'APPROVED' && prevStatusRef.current !== null && prevStatusRef.current !== 'APPROVED') {
            toast.success('Instructor approval received! You may now continue to the exam attempt.');
            void refreshApprovedAccess();
        }
        prevStatusRef.current = admissionStatus;
    }, [admissionStatus, refreshApprovedAccess]);

    // Initial check-in on mount
    useEffect(() => {
        let isMounted = true;

        if (shouldSkipLobbySync) {
            return () => {
                isMounted = false;
            };
        }

        void checkIntoExamLobby(apiClient, examId)
            .then(async (admission) => {
                if (!isMounted) return;
                await refetchAdmissionStatus();
                if (admission.status === 'APPROVED') {
                    await refreshApprovedAccess();
                }
            })
            .catch(() => null);

        return () => {
            isMounted = false;
        };
    }, [apiClient, examId, refetchAdmissionStatus, refreshApprovedAccess, shouldSkipLobbySync]);

    // 6. Actions Orchestration
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
