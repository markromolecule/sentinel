import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApi } from '@sentinel/hooks';
import { startExamSession, syncExamProgress, ApiError } from '@sentinel/services';
import type { ExamRuntimeAccess } from '@sentinel/shared/types';
import { toast } from 'sonner';
import {
    readStoredExamAnswerDraft,
    clearStoredExamSession,
    readStoredExamSession,
    writeStoredExamAnswerDraft,
    writeStoredExamSession,
    consumeStoredLobbyEntry,
    writeStoredReconnectIntent,
    reconcileExamAnswerDraft,
    type StoredExamSession,
} from '../_lib/exam-session-storage';
import {
    clearStoredExamTurnInPreview,
    readStoredExamTurnInPreview,
} from '../_lib/exam-turn-in-storage';
import {
    getStudentExamSessionAttemptId,
    isStudentExamAlreadyTurnedInError,
    resolveStudentExamSessionError,
} from '../_lib/student-exam-session-feedback';
import type { ExamAnswerValue } from '@/features/exams/_components/engine';
import { buildStudentHistoryAttemptHref } from '@/lib/routes/student-history-routes';

type UseExamSessionArgs = {
    examId: string;
    examDurationMinutes?: number;
    runtimeAccess?: ExamRuntimeAccess | null;
    isLoadingData?: boolean;
    isSessionStartBlocked?: boolean;
    onInitializeAnswers?: (answers: Record<string, ExamAnswerValue>) => void;
    onInitializeElapsedSeconds?: (seconds: number) => void;
    onLifecycleBlocked?: (message: string) => void;
    isTerminalAttempt?: boolean;
};

export function useExamSession({
    examId,
    examDurationMinutes,
    runtimeAccess,
    isLoadingData,
    isSessionStartBlocked,
    onInitializeAnswers,
    onInitializeElapsedSeconds,
    onLifecycleBlocked,
    isTerminalAttempt = false,
}: UseExamSessionArgs) {
    const { replace } = useRouter();
    const apiClient = useApi();
    const isMountedRef = useRef(true);
    const sessionStartRequestRef = useRef(0);
    const [examSession, setExamSession] = useState<StoredExamSession | null>(null);
    const [isInitializingSession, setIsInitializingSession] = useState(true);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const processedLobbyEntryExamIdRef = useRef<string | null>(null);
    const onInitializeAnswersRef = useRef(onInitializeAnswers);
    const onInitializeElapsedSecondsRef = useRef(onInitializeElapsedSeconds);

    useEffect(() => {
        onInitializeAnswersRef.current = onInitializeAnswers;
        onInitializeElapsedSecondsRef.current = onInitializeElapsedSeconds;
    }, [onInitializeAnswers, onInitializeElapsedSeconds]);

    useEffect(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const storedSession = readStoredExamSession(examId);

        setExamSession(storedSession);
        const pendingTurnInPreview = readStoredExamTurnInPreview(examId);

        if (pendingTurnInPreview) {
            onInitializeAnswersRef.current?.(
                pendingTurnInPreview.answers as Record<string, ExamAnswerValue>,
            );
            onInitializeElapsedSecondsRef.current?.(pendingTurnInPreview.elapsedSeconds);
            setElapsedSeconds(pendingTurnInPreview.elapsedSeconds);
        } else if (storedSession?.sessionId) {
            const answerDraft = readStoredExamAnswerDraft(examId, storedSession.sessionId);
            const reconciled = reconcileExamAnswerDraft(answerDraft, null);

            if (reconciled.source !== 'empty') {
                onInitializeAnswersRef.current?.(reconciled.answers);
                onInitializeElapsedSecondsRef.current?.(reconciled.elapsedSeconds);
                setElapsedSeconds(reconciled.elapsedSeconds);
            }
        }

        setIsInitializingSession(false);
    }, [examId]);

    useEffect(() => {
        if (!examDurationMinutes || isTerminalAttempt) {
            return;
        }

        const timerId = window.setInterval(() => {
            setElapsedSeconds((current) => current + 1);
        }, 1000);

        return () => window.clearInterval(timerId);
    }, [examDurationMinutes, isTerminalAttempt]);

    const secondsRemaining = Math.max((examDurationMinutes ?? 0) * 60 - elapsedSeconds, 0);

    const saveAnswerDraft = useCallback(
        (answers: Record<string, ExamAnswerValue>, nextElapsedSeconds: number) => {
            if (!examSession?.sessionId || isSessionStartBlocked || isTerminalAttempt) {
                return;
            }

            writeStoredExamAnswerDraft({
                examId,
                sessionId: examSession.sessionId,
                answers,
                elapsedSeconds: nextElapsedSeconds,
            });
        },
        [examId, examSession?.sessionId, isSessionStartBlocked, isTerminalAttempt],
    );

    const syncProgress = useCallback(
        async (
            answeredCount: number,
            answers?: Record<string, ExamAnswerValue>,
            nextElapsedSeconds = elapsedSeconds,
        ) => {
            if (!examSession?.sessionId || isSessionStartBlocked || isTerminalAttempt) {
                return;
            }

            if (answers) {
                saveAnswerDraft(answers, nextElapsedSeconds);
            }

            try {
                await syncExamProgress(apiClient, {
                    sessionId: examSession.sessionId,
                    answeredCount,
                    elapsedSeconds: nextElapsedSeconds,
                    answers,
                });
            } catch (error) {
                console.error('Failed to sync exam progress:', error);
                if (error instanceof ApiError && error.status === 409) {
                    const message = resolveStudentExamSessionError(error);
                    onLifecycleBlocked?.(message);
                }
            }
        },
        [
            apiClient,
            elapsedSeconds,
            examSession?.sessionId,
            saveAnswerDraft,
            isSessionStartBlocked,
            isTerminalAttempt,
            onLifecycleBlocked,
        ],
    );

    return {
        examSession,
        isInitializingSession,
        elapsedSeconds,
        secondsRemaining,
        setElapsedSeconds,
        saveAnswerDraft,
        syncProgress,
    };
}
