import { useCallback, useEffect, useRef } from 'react';
import { hasAnswer } from '@/features/exams/_components/engine';
import { SYNC_PROGRESS_DEBOUNCE_MS, HEARTBEAT_INTERVAL_MS } from './_constants';
import type { UseAttemptSyncArgs } from './use-attempt-sync.types';
import { useAttemptRealtimeBroadcast } from './use-attempt-realtime-broadcast';
import { useAttemptSyncCoordinator } from './use-attempt-sync-coordinator';

export type { UseAttemptSyncArgs } from './use-attempt-sync.types';

/**
 * Owns all remote-sync scheduling for an active exam attempt.
 *
 * Behaviour:
 * - Every answer change triggers a local draft write immediately and schedules
 *   a remote sync after a {@link SYNC_PROGRESS_DEBOUNCE_MS} debounce.
 * - A one-in-flight coordinator ensures at most one network request is active
 *   at a time. While a request is in flight, the newest snapshot is held as a
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
    examId,
    studentId,
    totalQuestions,
    monitoringChannel,
}: UseAttemptSyncArgs) {
    const selectedAnswersRef = useRef(selectedAnswers);
    useEffect(() => {
        selectedAnswersRef.current = selectedAnswers;
    }, [selectedAnswers]);

    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearDebounceTimer = useCallback(() => {
        if (debounceTimerRef.current !== null) {
            clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = null;
        }
    }, []);

    const { broadcastProgress, broadcastSubmitted } = useAttemptRealtimeBroadcast({
        examId,
        studentId,
        isSuspended,
        monitoringChannel,
    });

    const { sendSnapshot, flush, isTerminallyBlockedRef } = useAttemptSyncCoordinator({
        syncProgress,
        saveAnswerDraft,
        onLifecycleBlocked,
        selectedAnswersRef,
        elapsedSecondsRef,
        clearDebounceTimer,
    });

    // ─── Local draft & realtime broadcast on every answer change ──────────────
    useEffect(() => {
        if (isInitializingSession || !sessionId || isSuspended) {
            return;
        }

        if (Object.keys(selectedAnswers).length > 0) {
            saveAnswerDraft(selectedAnswers, elapsedSecondsRef.current);

            // Broadcast lightweight progress event (<50ms, zero DB writes/locks)
            const answeredCount = Object.values(selectedAnswers).filter(hasAnswer).length;
            broadcastProgress(answeredCount, totalQuestions);
        }
    }, [
        isInitializingSession,
        isSuspended,
        saveAnswerDraft,
        selectedAnswers,
        sessionId,
        elapsedSecondsRef,
        broadcastProgress,
        totalQuestions,
    ]);

    // ─── Debounced remote sync on answer change ───────────────────────────────
    useEffect(() => {
        if (isInitializingSession || !sessionId || isSuspended) {
            return;
        }

        clearDebounceTimer();

        debounceTimerRef.current = setTimeout(() => {
            debounceTimerRef.current = null;
            if (isTerminallyBlockedRef.current) return;

            const snapshot = selectedAnswersRef.current;
            const snapshotCount = Object.values(snapshot).filter(hasAnswer).length;
            const elapsed = elapsedSecondsRef.current;

            sendSnapshot(snapshotCount, snapshot, elapsed);
        }, SYNC_PROGRESS_DEBOUNCE_MS);

        return clearDebounceTimer;
        // selectedAnswers in deps: intentional — a new answer triggers a fresh debounce window.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        sessionId,
        isInitializingSession,
        isSuspended,
        saveAnswerDraft,
        selectedAnswers,
        syncProgress,
        elapsedSecondsRef,
        clearDebounceTimer,
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

            clearDebounceTimer();

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
    }, [sessionId, isInitializingSession, isSuspended, syncProgress, elapsedSecondsRef, clearDebounceTimer]);

    /**
     * Flushes the latest snapshot before a controlled boundary such as turn-in
     * navigation. The promise resolves once the active request and any queued
     * latest snapshot have both finished.
     */
    async function flushPendingProgress() {
        if (isInitializingSession || !sessionId || isSuspended || isTerminallyBlockedRef.current) {
            return;
        }

        const snapshot = selectedAnswersRef.current;
        const answeredCount = Object.values(snapshot).filter(hasAnswer).length;

        await flush(answeredCount, snapshot, elapsedSecondsRef.current);
    }

    return {
        flushPendingProgress,
        broadcastSubmitted,
    };
}

