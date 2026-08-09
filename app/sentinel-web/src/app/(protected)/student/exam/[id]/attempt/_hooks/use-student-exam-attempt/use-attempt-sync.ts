import { useEffect, useRef } from 'react';
import { type ExamAnswerValue, hasAnswer } from '@/features/exams/_components/engine';
import { SYNC_PROGRESS_DEBOUNCE_MS, HEARTBEAT_INTERVAL_MS } from './_constants';

export type UseAttemptSyncArgs = {
    isInitializingSession: boolean;
    sessionId?: string;
    /**
     * A ref whose `.current` always holds the latest elapsed-second count.
     * Using a ref here means the sync scheduler never needs to be recreated
     * when the timer ticks — it simply reads the live value at send time.
     */
    elapsedSecondsRef: React.RefObject<number>;
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
};

/**
 * Owns all remote-sync scheduling for an active exam attempt.
 *
 * Behaviour:
 * - Every answer change triggers a local draft write immediately and schedules
 *   a remote sync after a {@link SYNC_PROGRESS_DEBOUNCE_MS} debounce.
 * - A one-in-flight coordinator ensures at most one network request is active
 *   at a time.  While a request is in flight, the newest snapshot is held as a
 *   "pending" snapshot; when the in-flight request settles, the pending
 *   snapshot is sent immediately (latest-wins ordering).
 * - A terminal lifecycle 409 is forwarded to `onLifecycleBlocked` exactly once
 *   and then all pending/queued work is cleared.
 * - A bounded heartbeat fires every {@link HEARTBEAT_INTERVAL_MS} to keep
 *   elapsed-time / lifecycle fresh on the server without re-sending unchanged
 *   answer snapshots.
 * - Coming back online routes through the same stable scheduler (clears any
 *   in-flight debounce and fires immediately) rather than spawning a parallel
 *   request.
 */
export function useAttemptSync({
    isInitializingSession,
    sessionId,
    elapsedSecondsRef,
    selectedAnswers,
    saveAnswerDraft,
    syncProgress,
    onLifecycleBlocked,
    isSuspended = false,
}: UseAttemptSyncArgs) {
    const selectedAnswersRef = useRef(selectedAnswers);

    useEffect(() => {
        selectedAnswersRef.current = selectedAnswers;
    }, [selectedAnswers]);

    // ── Coordinator state (stable refs — never re-trigger effects) ────────────

    /** Whether a syncProgress request is currently awaiting a response. */
    const isInFlightRef = useRef(false);

    /**
     * Latest snapshot waiting to be sent after the in-flight request settles.
     * null means nothing is queued.
     */
    const pendingSnapshotRef = useRef<{
        answeredCount: number;
        answers: Record<string, ExamAnswerValue> | undefined;
        elapsed: number;
    } | null>(null);

    /** Set to true after the first terminal 409 — suppresses all further sends. */
    const isTerminallyBlockedRef = useRef(false);

    /** Stable ref to hold the pending debounce timer id. */
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

    // ── Core send helper ──────────────────────────────────────────────────────

    /**
     * Fires syncProgress respecting the one-in-flight rule.
     *
     * - If a request is in flight, the snapshot is queued as `pendingSnapshotRef`
     *   (overwriting any previous pending snapshot — only the latest wins).
     * - After the active request settles, the pending snapshot is drained and
     *   sent immediately.
     * - A terminal 409 is forwarded once via `onLifecycleBlocked` and then the
     *   coordinator is locked permanently.
     */
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
                        if (debounceTimerRef.current !== null) {
                            clearTimeout(debounceTimerRef.current);
                            debounceTimerRef.current = null;
                        }
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

    // ─── Local draft on every answer change ───────────────────────────────────
    useEffect(() => {
        if (isInitializingSession || !sessionId || isSuspended) {
            return;
        }

        if (Object.keys(selectedAnswers).length > 0) {
            saveAnswerDraft(selectedAnswers, elapsedSecondsRef.current);
        }
    }, [
        isInitializingSession,
        isSuspended,
        saveAnswerDraft,
        selectedAnswers,
        sessionId,
        elapsedSecondsRef,
    ]);

    // ─── Debounced remote sync on answer change ───────────────────────────────
    useEffect(() => {
        if (isInitializingSession || !sessionId || isSuspended) {
            return;
        }

        // Cancel any previously scheduled send.
        if (debounceTimerRef.current !== null) {
            clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(() => {
            debounceTimerRef.current = null;
            if (isTerminallyBlockedRef.current) return;

            const snapshot = selectedAnswersRef.current;
            const snapshotCount = Object.values(snapshot).filter(hasAnswer).length;
            const elapsed = elapsedSecondsRef.current;

            sendSnapshot(snapshotCount, snapshot, elapsed);
        }, SYNC_PROGRESS_DEBOUNCE_MS);

        return () => {
            if (debounceTimerRef.current !== null) {
                clearTimeout(debounceTimerRef.current);
                debounceTimerRef.current = null;
            }
        };
        // selectedAnswers in deps: intentional — a new answer triggers a fresh debounce window.
        // sendSnapshot captured from outer scope — stable (does not close over reactive state).
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        sessionId,
        isInitializingSession,
        isSuspended,
        saveAnswerDraft,
        selectedAnswers,
        syncProgress,
        elapsedSecondsRef,
    ]);

    // ─── Heartbeat — elapsed/lifecycle freshness, no redundant answer payload ─
    useEffect(() => {
        if (isInitializingSession || !sessionId || isSuspended) {
            return;
        }

        const heartbeatId = setInterval(() => {
            if (isTerminallyBlockedRef.current) return;

            const snapshot = selectedAnswersRef.current;
            const answeredCount = Object.values(snapshot).filter(hasAnswer).length;
            // Send elapsed + lifecycle ping without re-sending the full answer snapshot.
            sendSnapshot(answeredCount, undefined, elapsedSecondsRef.current);
        }, HEARTBEAT_INTERVAL_MS);

        return () => clearInterval(heartbeatId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isInitializingSession, isSuspended, sessionId, syncProgress, elapsedSecondsRef]);

    // ─── Online retry — routes through same scheduler ─────────────────────────
    useEffect(() => {
        if (isInitializingSession || !sessionId || isSuspended) {
            return;
        }

        const handleOnline = () => {
            if (isTerminallyBlockedRef.current) return;

            // Cancel the pending debounce (if any) and fire immediately.
            if (debounceTimerRef.current !== null) {
                clearTimeout(debounceTimerRef.current);
                debounceTimerRef.current = null;
            }

            const snapshot = selectedAnswersRef.current;
            if (Object.keys(snapshot).length > 0) {
                const currentAnsweredCount = Object.values(snapshot).filter(hasAnswer).length;
                sendSnapshot(currentAnsweredCount, snapshot, elapsedSecondsRef.current);
            }
        };

        window.addEventListener('online', handleOnline);

        return () => {
            window.removeEventListener('online', handleOnline);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionId, isInitializingSession, isSuspended, syncProgress, elapsedSecondsRef]);

    /**
     * Flushes the latest snapshot before a controlled boundary such as turn-in
     * navigation. The promise resolves once the active request and any queued
     * latest snapshot have both finished.
     */
    async function flushPendingProgress() {
        if (isInitializingSession || !sessionId || isSuspended || isTerminallyBlockedRef.current) {
            return;
        }

        if (debounceTimerRef.current !== null) {
            clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = null;
        }

        const snapshot = selectedAnswersRef.current;
        const answeredCount = Object.values(snapshot).filter(hasAnswer).length;

        const waitForIdle = new Promise<void>((resolve) => {
            flushWaitersRef.current.push(resolve);
        });

        sendSnapshot(answeredCount, snapshot, elapsedSecondsRef.current);
        resolveFlushWaitersIfIdle();

        await waitForIdle;
    }

    return {
        flushPendingProgress,
    };
}
