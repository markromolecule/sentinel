import { useEffect, useRef } from 'react';
import { type ExamAnswerValue, hasAnswer } from '@/features/exams/_components/engine';
import { SYNC_PROGRESS_DEBOUNCE_MS } from './_constants';

export type UseAttemptSyncArgs = {
    isInitializingSession: boolean;
    sessionId?: string;
    elapsedSeconds: number;
    selectedAnswers: Record<string, ExamAnswerValue>;
    saveAnswerDraft: (answers: Record<string, ExamAnswerValue>, elapsedSeconds: number) => void;
    syncProgress: (
        answeredCount: number,
        answers: Record<string, ExamAnswerValue>,
        elapsedSeconds: number,
    ) => Promise<void>;
    isSuspended?: boolean;
};

export function useAttemptSync({
    isInitializingSession,
    sessionId,
    elapsedSeconds,
    selectedAnswers,
    saveAnswerDraft,
    syncProgress,
    isSuspended = false,
}: UseAttemptSyncArgs) {
    const elapsedSecondsRef = useRef(elapsedSeconds);
    const selectedAnswersRef = useRef(selectedAnswers);

    useEffect(() => {
        elapsedSecondsRef.current = elapsedSeconds;
    }, [elapsedSeconds]);

    useEffect(() => {
        selectedAnswersRef.current = selectedAnswers;
    }, [selectedAnswers]);

    // Local checkpoint on every change
    useEffect(() => {
        if (isInitializingSession || !sessionId || isSuspended) {
            return;
        }

        if (Object.keys(selectedAnswers).length > 0) {
            saveAnswerDraft(selectedAnswers, elapsedSecondsRef.current);
        }
    }, [isInitializingSession, isSuspended, saveAnswerDraft, selectedAnswers, sessionId]);

    // Remote sync with debounce and offline retry
    useEffect(() => {
        if (isInitializingSession || !sessionId || isSuspended) {
            return;
        }

        const answeredCount = Object.values(selectedAnswers).filter(hasAnswer).length;

        const timer = setTimeout(() => {
            try {
                const syncPromise = syncProgress(
                    answeredCount,
                    selectedAnswers,
                    elapsedSecondsRef.current,
                );
                if (syncPromise && typeof syncPromise.catch === 'function') {
                    syncPromise.catch(() => {
                        if (Object.keys(selectedAnswersRef.current).length > 0) {
                            saveAnswerDraft(selectedAnswersRef.current, elapsedSecondsRef.current);
                        }
                    });
                }
            } catch {
                if (Object.keys(selectedAnswersRef.current).length > 0) {
                    saveAnswerDraft(selectedAnswersRef.current, elapsedSecondsRef.current);
                }
            }
        }, SYNC_PROGRESS_DEBOUNCE_MS);

        const handleOnline = () => {
            if (Object.keys(selectedAnswersRef.current).length > 0) {
                const currentAnsweredCount = Object.values(selectedAnswersRef.current).filter(
                    hasAnswer,
                ).length;
                void syncProgress(
                    currentAnsweredCount,
                    selectedAnswersRef.current,
                    elapsedSecondsRef.current,
                );
            }
        };

        window.addEventListener('online', handleOnline);

        return () => {
            clearTimeout(timer);
            window.removeEventListener('online', handleOnline);
        };
    }, [sessionId, isInitializingSession, isSuspended, saveAnswerDraft, selectedAnswers, syncProgress]);
}
