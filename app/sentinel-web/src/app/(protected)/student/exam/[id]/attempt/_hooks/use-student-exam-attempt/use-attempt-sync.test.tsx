import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAttemptSync } from './use-attempt-sync';
import { SYNC_PROGRESS_DEBOUNCE_MS, HEARTBEAT_INTERVAL_MS } from './_constants';

// ─── Shared mock factories ────────────────────────────────────────────────────

function makeSyncProgress() {
    return vi.fn().mockResolvedValue(undefined);
}

function makeSaveAnswerDraft() {
    return vi.fn();
}

function makeElapsedRef(value = 0) {
    return { current: value };
}

function makeAnswers(override: Record<string, string> = {}) {
    return { 'q-1': 'A', ...override } as Record<string, string>;
}

async function flushMicrotasks() {
    await Promise.resolve();
    await Promise.resolve();
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useAttemptSync', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    // ── Draft writes ─────────────────────────────────────────────────────────

    it('writes a local draft immediately when answers change', () => {
        const saveAnswerDraft = makeSaveAnswerDraft();
        const syncProgress = makeSyncProgress();
        const elapsedSecondsRef = makeElapsedRef(10);
        const selectedAnswers = makeAnswers();

        renderHook(() =>
            useAttemptSync({
                isInitializingSession: false,
                sessionId: 'session-1',
                elapsedSecondsRef,
                selectedAnswers,
                saveAnswerDraft,
                syncProgress,
            }),
        );

        expect(saveAnswerDraft).toHaveBeenCalledWith(selectedAnswers, 10);
    });

    it('does not write a draft during initialization', () => {
        const saveAnswerDraft = makeSaveAnswerDraft();
        const syncProgress = makeSyncProgress();

        renderHook(() =>
            useAttemptSync({
                isInitializingSession: true,
                sessionId: 'session-1',
                elapsedSecondsRef: makeElapsedRef(0),
                selectedAnswers: makeAnswers(),
                saveAnswerDraft,
                syncProgress,
            }),
        );

        expect(saveAnswerDraft).not.toHaveBeenCalled();
    });

    it('does not write a draft when suspended', () => {
        const saveAnswerDraft = makeSaveAnswerDraft();
        const syncProgress = makeSyncProgress();

        renderHook(() =>
            useAttemptSync({
                isInitializingSession: false,
                sessionId: 'session-1',
                elapsedSecondsRef: makeElapsedRef(0),
                selectedAnswers: makeAnswers(),
                saveAnswerDraft,
                syncProgress,
                isSuspended: true,
            }),
        );

        expect(saveAnswerDraft).not.toHaveBeenCalled();
    });

    // ── Debounce ─────────────────────────────────────────────────────────────

    it('does not call syncProgress before the debounce window elapses', () => {
        const syncProgress = makeSyncProgress();

        renderHook(() =>
            useAttemptSync({
                isInitializingSession: false,
                sessionId: 'session-1',
                elapsedSecondsRef: makeElapsedRef(0),
                selectedAnswers: makeAnswers(),
                saveAnswerDraft: makeSaveAnswerDraft(),
                syncProgress,
            }),
        );

        vi.advanceTimersByTime(SYNC_PROGRESS_DEBOUNCE_MS - 1);
        expect(syncProgress).not.toHaveBeenCalled();
    });

    it('calls syncProgress exactly once after the debounce window', () => {
        const syncProgress = makeSyncProgress();
        const elapsedSecondsRef = makeElapsedRef(5);
        const selectedAnswers = makeAnswers();

        renderHook(() =>
            useAttemptSync({
                isInitializingSession: false,
                sessionId: 'session-1',
                elapsedSecondsRef,
                selectedAnswers,
                saveAnswerDraft: makeSaveAnswerDraft(),
                syncProgress,
            }),
        );

        vi.advanceTimersByTime(SYNC_PROGRESS_DEBOUNCE_MS);

        expect(syncProgress).toHaveBeenCalledTimes(1);
        // Elapsed is read from the ref at fire time
        expect(syncProgress).toHaveBeenCalledWith(1, selectedAnswers, 5);
    });

    it('reads the latest elapsed value from the ref at fire time even after timer ticks', () => {
        const syncProgress = makeSyncProgress();
        const elapsedSecondsRef = makeElapsedRef(0);
        const selectedAnswers = makeAnswers();

        renderHook(() =>
            useAttemptSync({
                isInitializingSession: false,
                sessionId: 'session-1',
                elapsedSecondsRef,
                selectedAnswers,
                saveAnswerDraft: makeSaveAnswerDraft(),
                syncProgress,
            }),
        );

        // Simulate timer advancing before debounce fires
        elapsedSecondsRef.current = 3;
        vi.advanceTimersByTime(SYNC_PROGRESS_DEBOUNCE_MS);

        expect(syncProgress).toHaveBeenCalledWith(1, selectedAnswers, 3);
    });

    it('debounce timer resets on each answer change (collapses burst)', () => {
        const syncProgress = makeSyncProgress();
        const elapsedSecondsRef = makeElapsedRef(0);
        const { rerender } = renderHook(
            ({ selectedAnswers }: { selectedAnswers: Record<string, string> }) =>
                useAttemptSync({
                    isInitializingSession: false,
                    sessionId: 'session-1',
                    elapsedSecondsRef,
                    selectedAnswers,
                    saveAnswerDraft: makeSaveAnswerDraft(),
                    syncProgress,
                }),
            { initialProps: { selectedAnswers: makeAnswers({ 'q-1': 'A' }) } },
        );

        vi.advanceTimersByTime(SYNC_PROGRESS_DEBOUNCE_MS - 100);

        // Another answer change resets the window
        rerender({ selectedAnswers: makeAnswers({ 'q-1': 'B' }) });

        vi.advanceTimersByTime(SYNC_PROGRESS_DEBOUNCE_MS - 100);
        expect(syncProgress).not.toHaveBeenCalled();

        vi.advanceTimersByTime(200);
        expect(syncProgress).toHaveBeenCalledTimes(1);
    });

    // ── Cleanup ───────────────────────────────────────────────────────────────

    it('cancels pending debounce timer on unmount', () => {
        const syncProgress = makeSyncProgress();

        const { unmount } = renderHook(() =>
            useAttemptSync({
                isInitializingSession: false,
                sessionId: 'session-1',
                elapsedSecondsRef: makeElapsedRef(0),
                selectedAnswers: makeAnswers(),
                saveAnswerDraft: makeSaveAnswerDraft(),
                syncProgress,
            }),
        );

        unmount();
        vi.advanceTimersByTime(SYNC_PROGRESS_DEBOUNCE_MS * 2);

        expect(syncProgress).not.toHaveBeenCalled();
    });

    // ── Heartbeat ─────────────────────────────────────────────────────────────

    it('fires heartbeat at each interval without re-sending answer payload', async () => {
        const syncProgress = makeSyncProgress();
        const elapsedSecondsRef = makeElapsedRef(0);

        renderHook(() =>
            useAttemptSync({
                isInitializingSession: false,
                sessionId: 'session-1',
                elapsedSecondsRef,
                selectedAnswers: makeAnswers(),
                saveAnswerDraft: makeSaveAnswerDraft(),
                syncProgress,
            }),
        );

        // Skip past the debounce so we only count heartbeats
        vi.advanceTimersByTime(SYNC_PROGRESS_DEBOUNCE_MS);
        syncProgress.mockClear();

        await vi.advanceTimersByTimeAsync(HEARTBEAT_INTERVAL_MS);
        expect(syncProgress).toHaveBeenCalledTimes(1);
        // Heartbeat passes undefined answers
        expect(syncProgress).toHaveBeenCalledWith(
            expect.any(Number),
            undefined,
            expect.any(Number),
        );
    });

    it('heartbeat reads the latest elapsed value from the ref', async () => {
        const syncProgress = makeSyncProgress();
        const elapsedSecondsRef = makeElapsedRef(0);

        renderHook(() =>
            useAttemptSync({
                isInitializingSession: false,
                sessionId: 'session-1',
                elapsedSecondsRef,
                selectedAnswers: makeAnswers(),
                saveAnswerDraft: makeSaveAnswerDraft(),
                syncProgress,
            }),
        );

        vi.advanceTimersByTime(SYNC_PROGRESS_DEBOUNCE_MS);
        syncProgress.mockClear();

        elapsedSecondsRef.current = 45;
        await vi.advanceTimersByTimeAsync(HEARTBEAT_INTERVAL_MS);

        expect(syncProgress).toHaveBeenCalledWith(expect.any(Number), undefined, 45);
    });

    it('does not start heartbeat when suspended', () => {
        const syncProgress = makeSyncProgress();

        renderHook(() =>
            useAttemptSync({
                isInitializingSession: false,
                sessionId: 'session-1',
                elapsedSecondsRef: makeElapsedRef(0),
                selectedAnswers: makeAnswers(),
                saveAnswerDraft: makeSaveAnswerDraft(),
                syncProgress,
                isSuspended: true,
            }),
        );

        vi.advanceTimersByTime(HEARTBEAT_INTERVAL_MS * 3);
        expect(syncProgress).not.toHaveBeenCalled();
    });

    it('stops heartbeat on unmount', () => {
        const syncProgress = makeSyncProgress();

        const { unmount } = renderHook(() =>
            useAttemptSync({
                isInitializingSession: false,
                sessionId: 'session-1',
                elapsedSecondsRef: makeElapsedRef(0),
                selectedAnswers: makeAnswers(),
                saveAnswerDraft: makeSaveAnswerDraft(),
                syncProgress,
            }),
        );

        vi.advanceTimersByTime(SYNC_PROGRESS_DEBOUNCE_MS);
        syncProgress.mockClear();

        unmount();
        vi.advanceTimersByTime(HEARTBEAT_INTERVAL_MS * 3);

        expect(syncProgress).not.toHaveBeenCalled();
    });

    // ── Online retry ──────────────────────────────────────────────────────────

    it('fires an immediate sync when coming back online', async () => {
        const syncProgress = makeSyncProgress();
        const selectedAnswers = makeAnswers();

        renderHook(() =>
            useAttemptSync({
                isInitializingSession: false,
                sessionId: 'session-1',
                elapsedSecondsRef: makeElapsedRef(0),
                selectedAnswers,
                saveAnswerDraft: makeSaveAnswerDraft(),
                syncProgress,
            }),
        );

        // Wait for debounce to settle
        await vi.advanceTimersByTimeAsync(SYNC_PROGRESS_DEBOUNCE_MS);
        syncProgress.mockClear();

        window.dispatchEvent(new Event('online'));

        expect(syncProgress).toHaveBeenCalledTimes(1);
        expect(syncProgress).toHaveBeenCalledWith(1, selectedAnswers, expect.any(Number));
    });

    it('online retry cancels a pending debounce to avoid a duplicate send', async () => {
        const syncProgress = makeSyncProgress();
        const selectedAnswers = makeAnswers();

        renderHook(() =>
            useAttemptSync({
                isInitializingSession: false,
                sessionId: 'session-1',
                elapsedSecondsRef: makeElapsedRef(0),
                selectedAnswers,
                saveAnswerDraft: makeSaveAnswerDraft(),
                syncProgress,
            }),
        );

        // Come online before debounce fires
        vi.advanceTimersByTime(SYNC_PROGRESS_DEBOUNCE_MS / 2);
        window.dispatchEvent(new Event('online'));

        // The immediate online send counts as one
        expect(syncProgress).toHaveBeenCalledTimes(1);

        // Advance past where the old debounce would have fired
        vi.advanceTimersByTime(SYNC_PROGRESS_DEBOUNCE_MS);

        // Should still be 1 — the debounce was cancelled
        expect(syncProgress).toHaveBeenCalledTimes(1);
    });

    it('removes the online listener on unmount', () => {
        const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

        const { unmount } = renderHook(() =>
            useAttemptSync({
                isInitializingSession: false,
                sessionId: 'session-1',
                elapsedSecondsRef: makeElapsedRef(0),
                selectedAnswers: makeAnswers(),
                saveAnswerDraft: makeSaveAnswerDraft(),
                syncProgress: makeSyncProgress(),
            }),
        );

        unmount();

        expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
    });
});

// ─── Latest-wins coordinator and terminal 409 tests ──────────────────────────

describe('useAttemptSync — one-in-flight coordinator', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    it('queues the newest snapshot while a request is in flight and sends it immediately after', async () => {
        let resolveFirst!: () => void;
        const firstInflight = new Promise<void>((res) => {
            resolveFirst = res;
        });

        const syncProgress = vi
            .fn()
            .mockReturnValueOnce(firstInflight)
            .mockResolvedValue(undefined);

        const elapsedSecondsRef = makeElapsedRef(0);
        const { rerender } = renderHook(
            ({ selectedAnswers }: { selectedAnswers: Record<string, string> }) =>
                useAttemptSync({
                    isInitializingSession: false,
                    sessionId: 'session-1',
                    elapsedSecondsRef,
                    selectedAnswers,
                    saveAnswerDraft: makeSaveAnswerDraft(),
                    syncProgress,
                }),
            { initialProps: { selectedAnswers: makeAnswers({ 'q-1': 'A' }) } },
        );

        // Fire debounce for first answer
        vi.advanceTimersByTime(SYNC_PROGRESS_DEBOUNCE_MS);
        expect(syncProgress).toHaveBeenCalledTimes(1);

        // Second answer arrives while first is still in flight
        rerender({ selectedAnswers: makeAnswers({ 'q-1': 'B' }) });
        vi.advanceTimersByTime(SYNC_PROGRESS_DEBOUNCE_MS);
        // Still only one in-flight
        expect(syncProgress).toHaveBeenCalledTimes(1);

        // Settle first request — pending snapshot should drain immediately
        resolveFirst();
        await flushMicrotasks();

        expect(syncProgress).toHaveBeenCalledTimes(2);
    });

    it('only the latest queued snapshot is sent — intermediate ones are discarded', async () => {
        let resolveFirst!: () => void;
        const firstInflight = new Promise<void>((res) => {
            resolveFirst = res;
        });

        const syncProgress = vi
            .fn()
            .mockReturnValueOnce(firstInflight)
            .mockResolvedValue(undefined);

        const elapsedSecondsRef = makeElapsedRef(0);
        const { rerender } = renderHook(
            ({ selectedAnswers }: { selectedAnswers: Record<string, string> }) =>
                useAttemptSync({
                    isInitializingSession: false,
                    sessionId: 'session-1',
                    elapsedSecondsRef,
                    selectedAnswers,
                    saveAnswerDraft: makeSaveAnswerDraft(),
                    syncProgress,
                }),
            { initialProps: { selectedAnswers: makeAnswers({ 'q-1': 'A' }) } },
        );

        // Trigger first in-flight
        vi.advanceTimersByTime(SYNC_PROGRESS_DEBOUNCE_MS);
        expect(syncProgress).toHaveBeenCalledTimes(1);

        // Two more answer changes while in flight — only the last should be queued
        rerender({ selectedAnswers: makeAnswers({ 'q-1': 'B' }) });
        vi.advanceTimersByTime(SYNC_PROGRESS_DEBOUNCE_MS);
        rerender({ selectedAnswers: makeAnswers({ 'q-1': 'C' }) });
        vi.advanceTimersByTime(SYNC_PROGRESS_DEBOUNCE_MS);

        // Resolve first — should fire exactly one more (latest only)
        resolveFirst();
        await flushMicrotasks();

        expect(syncProgress).toHaveBeenCalledTimes(2);
        const lastCall = syncProgress.mock.calls[1];
        expect(lastCall[1]).toMatchObject({ 'q-1': 'C' });
    });

    it('forwards terminal 409 to onLifecycleBlocked and suppresses all subsequent sends', async () => {
        const lifecycleError = Object.assign(new Error('Attempt closed'), { status: 409 });
        const syncProgress = vi.fn().mockRejectedValue(lifecycleError);
        const onLifecycleBlocked = vi.fn();
        const elapsedSecondsRef = makeElapsedRef(0);

        renderHook(() =>
            useAttemptSync({
                isInitializingSession: false,
                sessionId: 'session-1',
                elapsedSecondsRef,
                selectedAnswers: makeAnswers(),
                saveAnswerDraft: makeSaveAnswerDraft(),
                syncProgress,
                onLifecycleBlocked,
            }),
        );

        // Debounce fires → 409 received
        vi.advanceTimersByTime(SYNC_PROGRESS_DEBOUNCE_MS);
        await flushMicrotasks();

        expect(onLifecycleBlocked).toHaveBeenCalledTimes(1);
        expect(onLifecycleBlocked).toHaveBeenCalledWith(expect.any(String));

        // Any subsequent heartbeat or online retry should NOT call syncProgress again
        syncProgress.mockClear();
        onLifecycleBlocked.mockClear();

        vi.advanceTimersByTime(HEARTBEAT_INTERVAL_MS * 3);
        await flushMicrotasks();

        expect(syncProgress).not.toHaveBeenCalled();
        expect(onLifecycleBlocked).not.toHaveBeenCalled();
    });

    it('unblocks sync sends after resetSyncBlock is called following a 409', async () => {
        const lifecycleError = Object.assign(new Error('Attempt locked'), { status: 409 });
        const syncProgress = vi.fn().mockRejectedValueOnce(lifecycleError).mockResolvedValue(undefined);
        const onLifecycleBlocked = vi.fn();
        const elapsedSecondsRef = makeElapsedRef(0);

        const { result, rerender } = renderHook(
            ({ selectedAnswers }) =>
                useAttemptSync({
                    isInitializingSession: false,
                    sessionId: 'session-1',
                    elapsedSecondsRef,
                    selectedAnswers,
                    saveAnswerDraft: makeSaveAnswerDraft(),
                    syncProgress,
                    onLifecycleBlocked,
                }),
            { initialProps: { selectedAnswers: makeAnswers({ 'q-1': 'A' }) } },
        );

        // Debounce fires -> 409 received -> latched as terminally blocked
        vi.advanceTimersByTime(SYNC_PROGRESS_DEBOUNCE_MS);
        await flushMicrotasks();

        expect(onLifecycleBlocked).toHaveBeenCalledTimes(1);

        // Changing answers while latched does not trigger syncProgress
        syncProgress.mockClear();
        rerender({ selectedAnswers: makeAnswers({ 'q-1': 'B' }) });
        vi.advanceTimersByTime(SYNC_PROGRESS_DEBOUNCE_MS);
        await flushMicrotasks();
        expect(syncProgress).not.toHaveBeenCalled();

        // Reset sync block (e.g. after instructor re-entry authorization)
        result.current.resetSyncBlock();

        // Now changing answers triggers syncProgress successfully
        rerender({ selectedAnswers: makeAnswers({ 'q-1': 'C' }) });
        vi.advanceTimersByTime(SYNC_PROGRESS_DEBOUNCE_MS);
        await flushMicrotasks();
        expect(syncProgress).toHaveBeenCalledTimes(1);
    });

    it('does not call onLifecycleBlocked more than once for repeated 409s', async () => {
        let reject!: (err: unknown) => void;
        const syncProgress = vi.fn().mockImplementation(
            () =>
                new Promise<void>((_, rej) => {
                    reject = rej;
                }),
        );
        const onLifecycleBlocked = vi.fn();

        renderHook(() =>
            useAttemptSync({
                isInitializingSession: false,
                sessionId: 'session-1',
                elapsedSecondsRef: makeElapsedRef(0),
                selectedAnswers: makeAnswers(),
                saveAnswerDraft: makeSaveAnswerDraft(),
                syncProgress,
                onLifecycleBlocked,
            }),
        );

        vi.advanceTimersByTime(SYNC_PROGRESS_DEBOUNCE_MS);
        // Reject twice (shouldn't happen in practice, but guard is tested)
        const lifecycleError = Object.assign(new Error('closed'), { status: 409 });
        reject(lifecycleError);
        await flushMicrotasks();

        expect(onLifecycleBlocked).toHaveBeenCalledTimes(1);
    });

    it('clears the pending debounce immediately on terminal 409', async () => {
        const lifecycleError = Object.assign(new Error('Attempt closed'), { status: 409 });

        let resolveFirst!: () => void;
        const syncProgress = vi
            .fn()
            // First call is still in flight while second is debouncing
            .mockReturnValueOnce(
                new Promise<void>((res) => {
                    resolveFirst = res;
                }),
            )
            .mockRejectedValueOnce(lifecycleError)
            .mockResolvedValue(undefined);

        const onLifecycleBlocked = vi.fn();
        const elapsedSecondsRef = makeElapsedRef(0);

        const { rerender } = renderHook(
            ({ selectedAnswers }: { selectedAnswers: Record<string, string> }) =>
                useAttemptSync({
                    isInitializingSession: false,
                    sessionId: 'session-1',
                    elapsedSecondsRef,
                    selectedAnswers,
                    saveAnswerDraft: makeSaveAnswerDraft(),
                    syncProgress,
                    onLifecycleBlocked,
                }),
            { initialProps: { selectedAnswers: makeAnswers({ 'q-1': 'A' }) } },
        );

        // Fire first debounce → in flight
        vi.advanceTimersByTime(SYNC_PROGRESS_DEBOUNCE_MS);
        expect(syncProgress).toHaveBeenCalledTimes(1);

        // Queue a second snapshot while in flight
        rerender({ selectedAnswers: makeAnswers({ 'q-1': 'B' }) });
        vi.advanceTimersByTime(SYNC_PROGRESS_DEBOUNCE_MS);

        // Now reject first with 409
        resolveFirst();
        await flushMicrotasks();

        // The queued snapshot is allowed to become the terminal 409, but no
        // further snapshots should be sent after the blocker latches.
        expect(onLifecycleBlocked).toHaveBeenCalledTimes(1);
        expect(syncProgress).toHaveBeenCalledTimes(2);

        rerender({ selectedAnswers: makeAnswers({ 'q-1': 'C' }) });
        vi.advanceTimersByTime(SYNC_PROGRESS_DEBOUNCE_MS);
        await flushMicrotasks();

        expect(syncProgress).toHaveBeenCalledTimes(2);
        expect(onLifecycleBlocked).toHaveBeenCalledTimes(1);
    });

    // ── Realtime Broadcasts ───────────────────────────────────────────────────

    it('broadcasts student:progress immediately when answers change without waiting for debounce', () => {
        const monitoringChannel = {
            send: vi.fn(),
        };

        renderHook(() =>
            useAttemptSync({
                isInitializingSession: false,
                sessionId: 'session-1',
                elapsedSecondsRef: makeElapsedRef(10),
                selectedAnswers: { 'q-1': 'A', 'q-2': 'B' } as any,
                saveAnswerDraft: makeSaveAnswerDraft(),
                syncProgress: makeSyncProgress(),
                examId: 'exam-1',
                studentId: 'student-42',
                totalQuestions: 4,
                monitoringChannel,
            }),
        );

        expect(monitoringChannel.send).toHaveBeenCalledWith({
            type: 'broadcast',
            event: 'student:progress',
            payload: {
                studentId: 'student-42',
                answeredCount: 2,
                totalQuestions: 4,
                progress: 50,
            },
        });
    });

    it('broadcasts student:submitted via broadcastSubmitted callback', () => {
        const monitoringChannel = {
            send: vi.fn(),
        };

        const { result } = renderHook(() =>
            useAttemptSync({
                isInitializingSession: false,
                sessionId: 'session-1',
                elapsedSecondsRef: makeElapsedRef(10),
                selectedAnswers: { 'q-1': 'A' } as any,
                saveAnswerDraft: makeSaveAnswerDraft(),
                syncProgress: makeSyncProgress(),
                examId: 'exam-1',
                studentId: 'student-42',
                totalQuestions: 4,
                monitoringChannel,
            }),
        );

        result.current.broadcastSubmitted();

        expect(monitoringChannel.send).toHaveBeenCalledWith({
            type: 'broadcast',
            event: 'student:submitted',
            payload: {
                studentId: 'student-42',
                submittedAt: expect.any(String),
            },
        });
    });
});
