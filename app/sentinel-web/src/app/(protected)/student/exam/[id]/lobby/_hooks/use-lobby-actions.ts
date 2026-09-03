import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useApi } from '@sentinel/hooks';
import { startExamSession } from '@sentinel/services';
import { EXAM_QUERY_KEYS } from '@sentinel/shared/constants';
import { toast } from 'sonner';

import { buildStudentExamHref } from '../../_lib/student-exam-flow';
import {
    clearStoredExamSession,
    readStoredExamAnswerDraft,
    writeStoredExamAnswerDraft,
    writeStoredExamSession,
    writeStoredLobbyEntry,
    clearStoredReconnectIntent,
    readStoredReconnectIntent,
    writeStoredReconnectIntent,
    reconcileExamAnswerDraft,
    type StoredExamSession,
} from '../../_lib/exam-session-storage';
import { clearStoredExamTurnInPreview } from '../../_lib/exam-turn-in-storage';
import {
    getStudentExamSessionAttemptId,
    isStudentExamAlreadyTurnedInError,
    resolveStudentExamSessionError,
} from '../../_lib/student-exam-session-feedback';
import type { ExamConfig, ExamRuntimeAccess } from '@sentinel/shared/types';
import { buildStudentHistoryAttemptHref } from '@/lib/routes/student-history-routes';

export type UseLobbyActionsArgs = {
    examId: string;
    configuration: ExamConfig;
    runtimeAccess?: ExamRuntimeAccess | null;
    storedSession?: StoredExamSession | null;
    hasCompletedFlow: boolean;
    canEnterExam: boolean;
};

export function useLobbyActions({
    examId,
    configuration,
    runtimeAccess,
    storedSession,
    hasCompletedFlow,
    canEnterExam,
}: UseLobbyActionsArgs) {
    const router = useRouter();
    const apiClient = useApi();
    const queryClient = useQueryClient();
    const [isStartingSession, setIsStartingSession] = useState(false);
    const inFlightRequestRef = useRef(false);

    const handleEnterExam = async () => {
        if (!hasCompletedFlow || !canEnterExam) {
            if (!hasCompletedFlow) {
                toast.error(
                    'Required device permissions or system checkup incomplete. Please complete checkup.',
                );
            } else if (runtimeAccess?.message) {
                toast.error(runtimeAccess.message);
            }
            return;
        }

        if (inFlightRequestRef.current) {
            return;
        }

        inFlightRequestRef.current = true;
        setIsStartingSession(true);

        const reconnectIntent = readStoredReconnectIntent(examId);
        let resumeRequestId = reconnectIntent?.resumeRequestId;

        /**
         * Guarantee resumeRequestId generation for active/reopened attempts:
         * If the student is entering/resuming an existing attempt (indicated by
         * hasActiveAttempt, canResume, a false canStart when allowed to enter,
         * or a storedSession), we generate a resumeRequestId and persist it to prevent
         * bad requests on session start.
         */
        const isResumingAttempt =
            runtimeAccess?.hasActiveAttempt ||
            runtimeAccess?.canResume ||
            !runtimeAccess?.canStart ||
            Boolean(storedSession?.sessionId);

        if (!resumeRequestId && isResumingAttempt) {
            const updatedIntent = writeStoredReconnectIntent(
                examId,
                storedSession?.sessionId ?? undefined,
                'navigation',
            );
            resumeRequestId = updatedIntent?.resumeRequestId;
        }

        try {
            // Call startExamSession regardless of existing storedSession so server validates access and counts reconnect.
            const session = await startExamSession(apiClient, {
                examId,
                resumeRequestId,
            });
            const nextStoredSession = writeStoredExamSession(examId, session);

            if (!nextStoredSession) {
                toast.error('Exam session could not be initialized.');
                return;
            }

            const localDraft = readStoredExamAnswerDraft(examId, session.sessionId);
            const reconciled = reconcileExamAnswerDraft(localDraft, {
                answers: session.answers,
                elapsedSeconds: session.elapsedSeconds,
            });

            if (reconciled.source !== 'empty') {
                writeStoredExamAnswerDraft({
                    examId,
                    sessionId: nextStoredSession.sessionId,
                    answers: reconciled.answers,
                    elapsedSeconds: reconciled.elapsedSeconds,
                });
            }

            if (configuration.webSecurity.full_screen_required) {
                await document.documentElement.requestFullscreen?.()?.catch(() => null);
            }

            writeStoredLobbyEntry(examId, nextStoredSession.sessionId);
            clearStoredReconnectIntent(examId);
            await queryClient.invalidateQueries({ queryKey: EXAM_QUERY_KEYS.details(examId) });
            router.push(buildStudentExamHref(examId, 'attempt'));
        } catch (error) {
            if (isStudentExamAlreadyTurnedInError(error)) {
                const attemptId = getStudentExamSessionAttemptId(error);
                clearStoredExamTurnInPreview(examId);
                clearStoredExamSession(examId);
                if (attemptId) {
                    router.replace(buildStudentHistoryAttemptHref(attemptId));
                    return;
                }
            }
            toast.error(resolveStudentExamSessionError(error));
        } finally {
            inFlightRequestRef.current = false;
            setIsStartingSession(false);
        }
    };

    return {
        isStartingSession,
        handleEnterExam,
    };
}
