import type { RefObject } from 'react';
import type { ExamAnswerValue } from '@/features/exams/_components/engine';

export type AttemptRealtimeChannel = {
    send: (msg: any) => void;
    subscribe?: () => void;
};

export type AttemptSyncSnapshot = {
    answeredCount: number;
    answers: Record<string, ExamAnswerValue> | undefined;
    elapsed: number;
};

export type UseAttemptSyncArgs = {
    isInitializingSession: boolean;
    sessionId?: string;
    /**
     * A ref whose `.current` always holds the latest elapsed-second count.
     * Using a ref here means the sync scheduler never needs to be recreated
     * when the timer ticks — it simply reads the live value at send time.
     */
    elapsedSecondsRef: RefObject<number>;
    selectedAnswers: Record<string, ExamAnswerValue>;
    saveAnswerDraft: (answers: Record<string, ExamAnswerValue>, elapsedSeconds: number) => void;
    syncProgress: (
        answeredCount: number,
        answers: Record<string, ExamAnswerValue> | undefined,
        elapsedSeconds: number,
    ) => Promise<void>;
    /** Called once when the server responds with a terminal 409. */
    onLifecycleBlocked?: (message: string) => void;
    isSuspended?: boolean;
    examId?: string;
    studentId?: string;
    totalQuestions?: number;
    monitoringChannel?: AttemptRealtimeChannel | null;
};
