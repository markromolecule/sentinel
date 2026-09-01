import { useEffect, useRef } from 'react';
import {
    useAuth,
    useExamLobbyAdmissionStatusQuery,
    useExamLobbyBootstrapMutation,
    useLobbyRealtime,
} from '@sentinel/hooks';
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
    const { session } = useAuth();
    const studentId = session?.user?.id;
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

    // 5. Reactive Admission Query (TanStack Query with 10s adaptive polling fallback while waiting)
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

    const isHardRuntimeBlock =
        runtimeAccess?.state === 'closed' ||
        runtimeAccess?.state === 'locked' ||
        runtimeAccess?.state === 'before_start';
    const hasApprovedInstructorAdmission =
        admissionStatus === 'APPROVED' && !isHardRuntimeBlock;
    const hasFreshInstructorAdmission =
        !requiresInstructorAdmission || hasApprovedInstructorAdmission;

    // Instant optimistic unlock without waiting on secondary HTTP round-trips
    const canEnterExam = Boolean(
        !isHardRuntimeBlock &&
        (hasResumableAttempt || hasFreshInstructorAdmission)
    );

    // Real-time admission event listener for instant sub-second unlock (broadcast + CDC)
    const lobbyRealtime = useLobbyRealtime({
        examId,
        studentId,
        enabled: !shouldSkipLobbySync,
        trackPresence: true,
        onAdmissionChange: () => {
            void refetchAdmissionStatus();
            void refetchExam();
        },
    });
    const presenceCount = lobbyRealtime?.presenceCount ?? 0;

    // Detect transition from WAITING/REJECTED to APPROVED to show toast and refresh runtime access in background
    useEffect(() => {
        if (admissionStatus === 'APPROVED' && prevStatusRef.current !== null && prevStatusRef.current !== 'APPROVED') {
            toast.success('Instructor approval received! You may now continue to the exam attempt.');
            void refetchExam();
        }
        prevStatusRef.current = admissionStatus;
    }, [admissionStatus, refetchExam]);

    // Initial atomic bootstrap on mount (check-in, exam metadata, config & admissions in 1 query)
    const { mutate: bootstrapLobby } = useExamLobbyBootstrapMutation({
        onSuccess: (data) => {
            if (data.admission?.status === 'APPROVED') {
                void refetchExam();
            }
        },
    });

    useEffect(() => {
        if (shouldSkipLobbySync || !examId) {
            return;
        }

        bootstrapLobby(examId);
    }, [bootstrapLobby, examId, shouldSkipLobbySync]);

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
        presenceCount,
        isStartingSession,
        handleEnterExam,
    };
}
