import { useRef } from 'react';
import type { RefObject } from 'react';
import type { ExamAnswerValue } from '@/features/exams/_components/engine';
import type { AttemptSyncSnapshot } from './use-attempt-sync.types';

export type UseAttemptSyncCoordinatorArgs = {
    syncProgress: (
        answeredCount: number,
        answers: Record<string, ExamAnswerValue> | undefined,
        elapsedSeconds: number,
    ) => Promise<void>;
    saveAnswerDraft: (answers: Record<string, ExamAnswerValue>, elapsedSeconds: number) => void;
    onLifecycleBlocked?: (message: string) => void;
    selectedAnswersRef: RefObject<Record<string, ExamAnswerValue>>;
    elapsedSecondsRef: RefObject<number>;
    clearDebounceTimer: () => void;
};

/**
 * Owns the one-in-flight concurrency coordinator, latest-wins snapshot queue,
 * terminal 409 lifecycle lock, and flush waiter resolution.
 */
export function useAttemptSyncCoordinator({
    syncProgress,
    saveAnswerDraft,
    onLifecycleBlocked,
    selectedAnswersRef,
    elapsedSecondsRef,
    clearDebounceTimer,
}: UseAttemptSyncCoordinatorArgs) {
    /** Whether a syncProgress request is currently awaiting a response. */
    const isInFlightRef = useRef(false);

    /**
     * Latest snapshot waiting to be sent after the in-flight request settles.
     * null means nothing is queued.
     */
    const pendingSnapshotRef = useRef<AttemptSyncSnapshot | null>(null);

    /** Set to true after the first terminal 409 — suppresses all further sends. */
    const isTerminallyBlockedRef = useRef(false);

    /** Flush callers wait here until the coordinator becomes idle again. */
    const flushWaitersRef = useRef<Array<() => void>>([]);

    function resolveFlushWaitersIfIdle() {
        if (isInFlightRef.current || pendingSnapshotRef.current) {
            return;
        }

        if (flushWaitersRef.current.length === 0) {
            return;
        }

        const waiters = flushWaitersRef.current;
        flushWaitersRef.current = [];
        waiters.forEach((resolve) => resolve());
    }

    function sendSnapshot(
        answeredCount: number,
        answers: Record<string, ExamAnswerValue> | undefined,
        elapsed: number,
    ) {
        if (isTerminallyBlockedRef.current) {
            return;
        }

        if (isInFlightRef.current) {
            // Queue the latest snapshot — previous pending is discarded (latest wins).
            pendingSnapshotRef.current = { answeredCount, answers, elapsed };
            return;
        }

        isInFlightRef.current = true;
        pendingSnapshotRef.current = null;

        syncProgress(answeredCount, answers, elapsed)
            .catch((err: unknown) => {
                // Detect terminal lifecycle 409 — forward once then lock coordinator.
                const status = (err as { status?: number })?.status;
                const message =
                    (err as { message?: string })?.message ??
                    'This exam attempt is no longer accepting progress updates.';

                if (status === 409) {
                    if (!isTerminallyBlockedRef.current) {
                        isTerminallyBlockedRef.current = true;
                        pendingSnapshotRef.current = null;
                        clearDebounceTimer();
                        onLifecycleBlocked?.(message);
                    }
                    resolveFlushWaitersIfIdle();
                    return;
                }

                // Non-terminal error — fall back to local draft.
                if (Object.keys(selectedAnswersRef.current).length > 0) {
                    saveAnswerDraft(selectedAnswersRef.current, elapsedSecondsRef.current);
                }
            })
            .finally(() => {
                isInFlightRef.current = false;

                // Drain the pending queue — only if not terminally blocked.
                const pending = pendingSnapshotRef.current;
                if (pending && !isTerminallyBlockedRef.current) {
                    pendingSnapshotRef.current = null;
                    sendSnapshot(pending.answeredCount, pending.answers, pending.elapsed);
                    return;
                }

                resolveFlushWaitersIfIdle();
            });
    }

    async function flush(
        answeredCount: number,
        answers: Record<string, ExamAnswerValue>,
        elapsed: number,
    ) {
        if (isTerminallyBlockedRef.current) {
            return;
        }

        clearDebounceTimer();

        const waitForIdle = new Promise<void>((resolve) => {
            flushWaitersRef.current.push(resolve);
        });

        sendSnapshot(answeredCount, answers, elapsed);
        resolveFlushWaitersIfIdle();

        await waitForIdle;
    }

    return {
        sendSnapshot,
        flush,
        isTerminallyBlockedRef,
    };
}
