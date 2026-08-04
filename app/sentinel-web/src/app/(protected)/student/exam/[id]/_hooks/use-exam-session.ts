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
    /** When false the timer, draft writes, and remote sync are all suppressed. */
    isAttemptActive?: boolean;
};

/**
 * Manages the exam session lifecycle: reading/writing local storage, starting a
 * session on the server, running the elapsed-time timer, and providing stable
 * `saveAnswerDraft` / `syncProgress` callbacks whose identities do NOT change
 * every second as the timer ticks.
 */
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
    isAttemptActive = true,
}: UseExamSessionArgs) {
    const { replace } = useRouter();
    const apiClient = useApi();
    const isMountedRef = useRef(true);
    const sessionStartRequestRef = useRef(0);
    const [examSession, setExamSession] = useState<StoredExamSession | null>(null);
    const [isInitializingSession, setIsInitializingSession] = useState(true);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);

    /**
     * Ref mirror of `elapsedSeconds` — always up to date but never causes
     * callbacks that depend on it to be recreated.  Callers that need a
     * snapshot at the moment of a network request should read this ref rather
     * than closing over the state variable.
     */
    const elapsedSecondsRef = useRef(elapsedSeconds);

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

    // Keep the ref in sync with state on every tick — no deps on the ref itself.
    useEffect(() => {
        elapsedSecondsRef.current = elapsedSeconds;
    }, [elapsedSeconds]);

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
            elapsedSecondsRef.current = pendingTurnInPreview.elapsedSeconds;
        } else if (storedSession?.sessionId) {
            const answerDraft = readStoredExamAnswerDraft(examId, storedSession.sessionId);
            const reconciled = reconcileExamAnswerDraft(answerDraft, null);

            if (reconciled.source !== 'empty') {
                onInitializeAnswersRef.current?.(reconciled.answers);
                onInitializeElapsedSecondsRef.current?.(reconciled.elapsedSeconds);
                setElapsedSeconds(reconciled.elapsedSeconds);
                elapsedSecondsRef.current = reconciled.elapsedSeconds;
            }
        }

        setIsInitializingSession(false);
    }, [examId]);

    // Timer — only runs while the attempt is active and not terminal.
    useEffect(() => {
        if (!examDurationMinutes || isTerminalAttempt || !isAttemptActive) {
            return;
        }

        const timerId = window.setInterval(() => {
            setElapsedSeconds((current) => current + 1);
        }, 1000);

        return () => window.clearInterval(timerId);
    }, [examDurationMinutes, isTerminalAttempt, isAttemptActive]);

    const secondsRemaining = Math.max((examDurationMinutes ?? 0) * 60 - elapsedSeconds, 0);

    /**
     * Persists the current answer snapshot to local storage.
     * Suppressed when the attempt is not active.
     */
    const saveAnswerDraft = useCallback(
        (answers: Record<string, ExamAnswerValue>, nextElapsedSeconds: number) => {
            if (
                !examSession?.sessionId ||
                isSessionStartBlocked ||
                isTerminalAttempt ||
                !isAttemptActive
            ) {
                return;
            }

            writeStoredExamAnswerDraft({
                examId,
                sessionId: examSession.sessionId,
                answers,
                elapsedSeconds: nextElapsedSeconds,
            });
        },
        // isAttemptActive added; elapsedSeconds intentionally omitted — callers pass it explicitly.
        [examId, examSession?.sessionId, isSessionStartBlocked, isTerminalAttempt, isAttemptActive],
    );

    /**
     * Sends a progress snapshot to the server.
     *
     * `nextElapsedSeconds` defaults to the ref value so callers that fire from a
     * debounce timer always capture the current elapsed time rather than a stale
     * closure value.
     */
    const syncProgress = useCallback(
        async (
            answeredCount: number,
            answers?: Record<string, ExamAnswerValue>,
            /** Defaults to the current ref value — read at call time, not closure time. */
            nextElapsedSeconds = elapsedSecondsRef.current,
        ) => {
            if (
                !examSession?.sessionId ||
                isSessionStartBlocked ||
                isTerminalAttempt ||
                !isAttemptActive
            ) {
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
        // elapsedSeconds intentionally removed — we read from elapsedSecondsRef at call time.
        [
            apiClient,
            examSession?.sessionId,
            saveAnswerDraft,
            isSessionStartBlocked,
            isTerminalAttempt,
            isAttemptActive,
            onLifecycleBlocked,
        ],
    );

    return {
        examSession,
        isInitializingSession,
        elapsedSeconds,
        elapsedSecondsRef,
        secondsRemaining,
        setElapsedSeconds,
        saveAnswerDraft,
        syncProgress,
    };
}
