import { useRouter } from 'next/navigation';
import { useRef } from 'react';
import { useApi } from '@sentinel/hooks';
import { prepareExamSession } from '@sentinel/services';
import type { ExamAttemptAnswers, ExamConfiguration, ExamQuestion } from '@sentinel/shared/types';
import type { ExamAnswerValue } from '@/features/exams/_components/engine';
import { writeStoredExamTurnInPreview } from '@/app/(protected)/student/exam/[id]/_lib/exam-turn-in-storage';
import type { AttemptMonitoringPhase } from '@/app/(protected)/student/exam/[id]/_hooks/use-exam-monitoring';
import { toast } from 'sonner';
import { resolveStudentExamSessionError } from '@/app/(protected)/student/exam/[id]/_lib/student-exam-session-feedback';

const requestedFullscreenExitKeys = new Set<string>();

export type UseAttemptSubmissionArgs = {
    examId: string;
    sessionId?: string;
    releaseScoreMode: NonNullable<ExamConfiguration['releaseScoreMode']>;
    questions: ExamQuestion[];
    selectedAnswers: Record<string, ExamAnswerValue>;
    elapsedSeconds: number;
    unansweredCount: number;
    isRedirectingToTurnIn: boolean;
    setIsRedirectingToTurnIn: (val: boolean) => void;
    setIsSubmitDialogOpen: (val: boolean) => void;
    suspendSecurityMonitoring: () => boolean;
    isBlocked?: boolean;
    setMonitoringPhase?: (phase: AttemptMonitoringPhase) => void;
    flushPendingProgress?: () => Promise<void>;
};

/**
 * Hook to manage the submission process of a student's exam attempt.
 * Validates unanswered questions, transitions to the turn-in review state, and performs final cleanup before redirection.
 *
 * @param args - Object containing exam, answer, and UI control arguments.
 * @returns Submit handler and turn-in redirection function.
 */
export function useAttemptSubmission({
    examId,
    sessionId,
    releaseScoreMode,
    questions,
    selectedAnswers,
    elapsedSeconds,
    unansweredCount,
    isRedirectingToTurnIn,
    setIsRedirectingToTurnIn,
    setIsSubmitDialogOpen,
    suspendSecurityMonitoring,
    isBlocked,
    setMonitoringPhase,
    flushPendingProgress,
}: UseAttemptSubmissionArgs) {
    const router = useRouter();
    const apiClient = useApi();
    const hasStartedTurnInTransitionRef = useRef(false);

    const proceedToTurnInReview = async () => {
        if (isRedirectingToTurnIn || !sessionId || isBlocked || hasStartedTurnInTransitionRef.current) {
            return;
        }

        hasStartedTurnInTransitionRef.current = true;
        setMonitoringPhase?.('submitting');
        const monitoringSuspended = suspendSecurityMonitoring();

        if (!monitoringSuspended) {
            hasStartedTurnInTransitionRef.current = false;
            if (process.env.NODE_ENV === 'development') {
                console.warn(
                    '[AttemptSubmission] Monitoring suspension failed before Turn In review.',
                    { examId, sessionId },
                );
            }
            return;
        }

        setIsRedirectingToTurnIn(true);

        const scoreVisible = releaseScoreMode === 'AUTO_RELEASE';
        try {
            try {
                await flushPendingProgress?.();
            } catch (flushError) {
                if (process.env.NODE_ENV === 'development') {
                    console.warn('[AttemptSubmission] Progress flush failed before turn-in.', {
                        examId,
                        sessionId,
                        flushError,
                    });
                }
            }

            const prepared = await prepareExamSession(apiClient, {
                sessionId,
                answers: selectedAnswers as ExamAttemptAnswers,
                elapsedSeconds,
            });

            writeStoredExamTurnInPreview({
                examId,
                sessionId,
                answers: selectedAnswers as ExamAttemptAnswers,
                elapsedSeconds,
                preparationToken: prepared.preparationToken,
                releaseScoreMode,
                scoreVisible,
                summary: {
                    score: scoreVisible ? prepared.score : null,
                    totalScore: scoreVisible ? prepared.totalScore : null,
                    percentage: scoreVisible ? prepared.percentage : null,
                    answeredCount: prepared.answeredCount,
                    autoGradableQuestionCount: prepared.autoGradableQuestionCount,
                    manualReviewQuestionCount: prepared.manualReviewQuestionCount,
                    requiresManualReview: prepared.requiresManualReview,
                },
                storedAt: new Date().toISOString(),
            });

            router.replace(`/student/exam/${examId}/result`);
        } catch (error) {
            hasStartedTurnInTransitionRef.current = false;
            setIsRedirectingToTurnIn(false);
            toast.error(resolveStudentExamSessionError(error));
            return;
        }

        window.setTimeout(() => {
            if (!monitoringSuspended) {
                if (process.env.NODE_ENV === 'development') {
                    console.warn(
                        '[AttemptSubmission] Skipping fullscreen exit because monitoring was not suspended.',
                        { examId, sessionId },
                    );
                }
                return;
            }

            if (typeof document === 'undefined' || !document.fullscreenElement) {
                return;
            }

            const fullscreenExitKey = `${examId}:${sessionId}`;
            if (requestedFullscreenExitKeys.has(fullscreenExitKey)) {
                return;
            }

            requestedFullscreenExitKeys.add(fullscreenExitKey);
            const fullscreenExit = document.exitFullscreen?.();

            fullscreenExit?.catch((err) => {
                console.error('Error attempting to exit full-screen mode:', err);
            });
        }, 0);
    };

    const handleSubmit = () => {
        if (questions.length === 0 || isBlocked) return;
        if (unansweredCount > 0) {
            setIsSubmitDialogOpen(true);
            return;
        }
        void proceedToTurnInReview();
    };

    return {
        handleSubmit,
        proceedToTurnInReview,
    };
}
