import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useLobbyState } from './use-lobby-state';

const {
    mockUseApi,
    mockCheckIntoExamLobby,
    mockGetExamLobbyAdmissionStatus,
    mockReadStoredExamSession,
    mockUseLobbyTimer,
    mockUseLobbyMediaPipe,
    mockUseLobbyReadiness,
    mockUseLobbyActions,
    mockUseLobbyRealtime,
} = vi.hoisted(() => ({
    mockUseApi: vi.fn(),
    mockCheckIntoExamLobby: vi.fn(),
    mockGetExamLobbyAdmissionStatus: vi.fn(),
    mockReadStoredExamSession: vi.fn(),
    mockUseLobbyTimer: vi.fn(),
    mockUseLobbyMediaPipe: vi.fn(),
    mockUseLobbyReadiness: vi.fn(),
    mockUseLobbyActions: vi.fn(),
    mockUseLobbyRealtime: vi.fn(),
}));

vi.mock('@sentinel/hooks', () => ({
    useApi: () => mockUseApi(),
    useLobbyRealtime: (args: unknown) => mockUseLobbyRealtime(args),
}));

vi.mock('@sentinel/services', () => ({
    checkIntoExamLobby: (...args: unknown[]) => mockCheckIntoExamLobby(...args),
    getExamLobbyAdmissionStatus: (...args: unknown[]) => mockGetExamLobbyAdmissionStatus(...args),
}));

vi.mock('../../_lib/exam-session-storage', () => ({
    readStoredExamSession: (examId: string) => mockReadStoredExamSession(examId),
}));

vi.mock('./use-lobby-timer', () => ({
    useLobbyTimer: (...args: unknown[]) => mockUseLobbyTimer(...args),
}));

vi.mock('./use-lobby-mediapipe', () => ({
    useLobbyMediaPipe: (...args: unknown[]) => mockUseLobbyMediaPipe(...args),
}));

vi.mock('./use-lobby-readiness', () => ({
    useLobbyReadiness: (...args: unknown[]) => mockUseLobbyReadiness(...args),
}));

vi.mock('./use-lobby-actions', () => ({
    useLobbyActions: (...args: unknown[]) => mockUseLobbyActions(...args),
}));

function createArgs(overrides?: {
    runtimeAccess?: Record<string, unknown>;
    lobbyAdmissionMode?: 'AUTOMATIC' | 'INSTRUCTOR_GATED';
}): Parameters<typeof useLobbyState>[0] {
    return {
        examId: 'exam-1',
        exam: {
            runtimeAccess: {
                state: 'open',
                reasonCode: 'OPEN',
                message: 'Exam is open.',
                canStart: true,
                canResume: false,
                hasActiveAttempt: false,
                startsAt: null,
                endsAt: null,
                reopenedUntil: null,
                ...overrides?.runtimeAccess,
            },
        },
        configuration: {
            lobbyAdmissionMode: overrides?.lobbyAdmissionMode ?? 'AUTOMATIC',
        },
        mediaPipeSandbox: null,
        refetchExam: vi.fn().mockResolvedValue(undefined),
    } as unknown as Parameters<typeof useLobbyState>[0];
}

describe('useLobbyState', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        mockUseApi.mockReturnValue({ api: true });
        mockReadStoredExamSession.mockReturnValue(null);
        mockUseLobbyTimer.mockReturnValue({
            currentTime: new Date('2026-05-11T00:00:00.000Z'),
            countdownLabel: '10 minutes',
        });
        mockUseLobbyMediaPipe.mockReturnValue({
            mediaPipeActivation: { isValid: true },
            mediaPipeLobbyMessage: null,
        });
        mockUseLobbyReadiness.mockReturnValue({
            hasCompletedFlow: true,
        });
        mockUseLobbyActions.mockReturnValue({
            isStartingSession: false,
            handleEnterExam: vi.fn(),
        });
        mockCheckIntoExamLobby.mockResolvedValue({
            status: 'APPROVED',
            checkedInAt: '2026-05-11T00:00:00.000Z',
        });
        mockGetExamLobbyAdmissionStatus.mockResolvedValue({
            status: 'WAITING',
            checkedInAt: '2026-05-11T00:00:00.000Z',
            decidedAt: null,
        });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('checks in once for automatic-admission lobby flow', async () => {
        const args = createArgs();

        renderHook(() => useLobbyState(args));

        await waitFor(() => {
            expect(mockCheckIntoExamLobby).toHaveBeenCalledWith({ api: true }, 'exam-1');
        });
        expect(mockGetExamLobbyAdmissionStatus).not.toHaveBeenCalled();
    });

    it('polls admission status for instructor-gated waiting students and clears refresh state after approval', async () => {
        vi.useFakeTimers();
        const refetchExam = vi.fn().mockResolvedValue(undefined);

        mockCheckIntoExamLobby.mockResolvedValueOnce({
            status: 'WAITING',
            checkedInAt: '2026-05-11T00:00:00.000Z',
        });
        mockGetExamLobbyAdmissionStatus.mockResolvedValueOnce({
            status: 'APPROVED',
            checkedInAt: '2026-05-11T00:00:00.000Z',
            decidedAt: '2026-05-11T00:00:05.000Z',
        });

        const args = createArgs({
            lobbyAdmissionMode: 'INSTRUCTOR_GATED',
            runtimeAccess: {
                state: 'lobby_waiting',
                reasonCode: 'LOBBY_WAITING',
                message: 'Waiting for instructor approval.',
                canStart: false,
                canResume: false,
                hasActiveAttempt: false,
            },
        });
        args.refetchExam = refetchExam;

        const { result } = renderHook(() => useLobbyState(args));

        await act(async () => {
            await Promise.resolve();
        });
        expect(mockCheckIntoExamLobby).toHaveBeenCalledTimes(1);

        await act(async () => {
            await vi.advanceTimersByTimeAsync(45000);
            await Promise.resolve();
        });

        expect(mockGetExamLobbyAdmissionStatus).toHaveBeenCalledWith({ api: true }, 'exam-1');
        expect(refetchExam).toHaveBeenCalled();
        expect(result.current.isAdmissionPendingRefresh).toBe(false);
        expect(result.current.admissionStatus).toBe('APPROVED');
    });

    it('keeps entry disabled while approved instructor admission is refreshing stale runtime access', async () => {
        vi.useFakeTimers();
        let resolveRefetch: (() => void) | undefined;
        const refetchExam = vi.fn(
            () =>
                new Promise<void>((resolve) => {
                    resolveRefetch = resolve;
                }),
        );

        mockCheckIntoExamLobby.mockResolvedValueOnce({
            status: 'WAITING',
            checkedInAt: '2026-05-11T00:00:00.000Z',
        });
        mockGetExamLobbyAdmissionStatus.mockResolvedValueOnce({
            status: 'APPROVED',
            checkedInAt: '2026-05-11T00:00:00.000Z',
            decidedAt: '2026-05-11T00:00:05.000Z',
        });

        const args = createArgs({
            lobbyAdmissionMode: 'INSTRUCTOR_GATED',
            runtimeAccess: {
                state: 'lobby_waiting',
                reasonCode: 'LOBBY_WAITING',
                message: 'Waiting for instructor approval.',
                canStart: false,
                canResume: false,
                hasActiveAttempt: false,
            },
        });
        args.refetchExam = refetchExam;

        const { result, rerender } = renderHook(({ hookArgs }) => useLobbyState(hookArgs), {
            initialProps: { hookArgs: args },
        });

        await act(async () => {
            await Promise.resolve();
        });

        await act(async () => {
            await vi.advanceTimersByTimeAsync(45000);
            await Promise.resolve();
        });

        expect(result.current.admissionStatus).toBe('APPROVED');
        expect(result.current.isAdmissionPendingRefresh).toBe(true);
        expect(result.current.canEnterExam).toBe(false);
        expect(mockUseLobbyActions).toHaveBeenLastCalledWith(
            expect.objectContaining({
                canEnterExam: false,
            }),
        );

        await act(async () => {
            resolveRefetch?.();
            await Promise.resolve();
        });

        rerender({
            hookArgs: createArgs({
                lobbyAdmissionMode: 'INSTRUCTOR_GATED',
                runtimeAccess: {
                    state: 'lobby_approved',
                    reasonCode: 'LOBBY_APPROVED',
                    message: 'Approved for entry.',
                    canStart: true,
                    canResume: false,
                    hasActiveAttempt: false,
                },
            }),
        });

        expect(result.current.canEnterExam).toBe(true);
    });

    it('continues polling instructor admission when runtime access is open but admission is still waiting', async () => {
        vi.useFakeTimers();
        const refetchExam = vi.fn().mockResolvedValue(undefined);

        mockCheckIntoExamLobby.mockResolvedValueOnce({
            status: 'WAITING',
            checkedInAt: '2026-05-11T00:00:00.000Z',
        });
        mockGetExamLobbyAdmissionStatus.mockResolvedValueOnce({
            status: 'APPROVED',
            checkedInAt: '2026-05-11T00:00:00.000Z',
            decidedAt: '2026-05-11T00:00:05.000Z',
        });

        const args = createArgs({
            lobbyAdmissionMode: 'INSTRUCTOR_GATED',
            runtimeAccess: {
                state: 'open',
                reasonCode: 'OPEN',
                message: 'Exam is open.',
                canStart: true,
                canResume: false,
                hasActiveAttempt: false,
            },
        });
        args.refetchExam = refetchExam;

        const { result } = renderHook(() => useLobbyState(args));

        await act(async () => {
            await Promise.resolve();
        });

        expect(result.current.admissionStatus).toBe('WAITING');
        expect(result.current.canEnterExam).toBe(false);

        await act(async () => {
            await vi.advanceTimersByTimeAsync(45000);
            await Promise.resolve();
        });

        expect(mockGetExamLobbyAdmissionStatus).toHaveBeenCalledWith({ api: true }, 'exam-1');
        expect(refetchExam).toHaveBeenCalled();
        expect(result.current.admissionStatus).toBe('APPROVED');
    });

    it('optimistically unlocks an approved instructor-gated resume after realtime approval refreshes access', async () => {
        const refetchExam = vi.fn().mockResolvedValue(undefined);

        mockCheckIntoExamLobby.mockResolvedValueOnce({
            status: 'WAITING',
            checkedInAt: '2026-05-11T00:00:00.000Z',
        });
        mockGetExamLobbyAdmissionStatus.mockResolvedValueOnce({
            status: 'APPROVED',
            checkedInAt: '2026-05-11T00:00:00.000Z',
            decidedAt: '2026-05-11T00:00:05.000Z',
        });

        const initialArgs = createArgs({
            lobbyAdmissionMode: 'INSTRUCTOR_GATED',
            runtimeAccess: {
                state: 'lobby_waiting',
                reasonCode: 'LOBBY_WAITING',
                message: 'Waiting for instructor approval.',
                canStart: false,
                canResume: false,
                hasActiveAttempt: true,
            },
        });
        initialArgs.refetchExam = refetchExam;

        const { result, rerender } = renderHook(({ hookArgs }) => useLobbyState(hookArgs), {
            initialProps: { hookArgs: initialArgs },
        });

        await act(async () => {
            await Promise.resolve();
        });

        expect(result.current.canEnterExam).toBe(false);

        const realtimeArgs = mockUseLobbyRealtime.mock.calls.at(-1)?.[0] as
            | { onAdmissionChange?: () => void }
            | undefined;

        await act(async () => {
            realtimeArgs?.onAdmissionChange?.();
            await Promise.resolve();
        });

        expect(result.current.admissionStatus).toBe('APPROVED');
        expect(refetchExam).toHaveBeenCalled();

        rerender({
            hookArgs: createArgs({
                lobbyAdmissionMode: 'INSTRUCTOR_GATED',
                runtimeAccess: {
                    state: 'lobby_approved',
                    reasonCode: 'LOBBY_APPROVED',
                    message: 'Approved for resume.',
                    canStart: false,
                    canResume: true,
                    hasActiveAttempt: true,
                },
            }),
        });

        expect(result.current.canEnterExam).toBe(true);
        expect(mockUseLobbyActions).toHaveBeenLastCalledWith(
            expect.objectContaining({
                canEnterExam: true,
            }),
        );
    });

    it('does not allow instructor-gated entry from open runtime access before approval is known', () => {
        mockCheckIntoExamLobby.mockImplementation(() => new Promise(() => undefined));

        const args = createArgs({
            lobbyAdmissionMode: 'INSTRUCTOR_GATED',
            runtimeAccess: {
                state: 'open',
                reasonCode: 'OPEN',
                message: 'Exam is open.',
                canStart: true,
                canResume: false,
                hasActiveAttempt: false,
            },
        });

        const { result } = renderHook(() => useLobbyState(args));

        expect(result.current.admissionStatus).toBeNull();
        expect(result.current.canEnterExam).toBe(false);
        expect(mockUseLobbyActions).toHaveBeenLastCalledWith(
            expect.objectContaining({
                canEnterExam: false,
            }),
        );
    });

    it('skips lobby sync entirely when the student already has a resumable active attempt', () => {
        const args = createArgs({
            lobbyAdmissionMode: 'AUTOMATIC',
            runtimeAccess: {
                state: 'open',
                reasonCode: 'OPEN',
                message: 'Resume your exam.',
                canStart: false,
                canResume: true,
                hasActiveAttempt: true,
            },
        });
        mockReadStoredExamSession.mockReturnValue({
            examId: 'exam-1',
            sessionId: 'session-1',
            storedAt: '2026-05-11T00:00:00.000Z',
            isResumed: true,
            configSnapshot: null,
        });

        const { result } = renderHook(() => useLobbyState(args));

        expect(mockCheckIntoExamLobby).not.toHaveBeenCalled();
        expect(mockGetExamLobbyAdmissionStatus).not.toHaveBeenCalled();
        expect(result.current.storedSession?.sessionId).toBe('session-1');
    });

    it('re-checks in and keeps entry disabled for instructor-gated active attempts until approval refreshes access', async () => {
        vi.useFakeTimers();
        const refetchExam = vi.fn().mockResolvedValue(undefined);

        mockCheckIntoExamLobby.mockResolvedValueOnce({
            status: 'WAITING',
            checkedInAt: '2026-05-11T00:00:00.000Z',
        });
        mockGetExamLobbyAdmissionStatus.mockResolvedValueOnce({
            status: 'APPROVED',
            checkedInAt: '2026-05-11T00:00:00.000Z',
            decidedAt: '2026-05-11T00:00:05.000Z',
        });

        const args = createArgs({
            lobbyAdmissionMode: 'INSTRUCTOR_GATED',
            runtimeAccess: {
                state: 'open',
                reasonCode: 'OPEN',
                message: 'Resume your exam.',
                canStart: true,
                canResume: true,
                hasActiveAttempt: true,
            },
        });
        args.refetchExam = refetchExam;

        const { result } = renderHook(() => useLobbyState(args));

        await act(async () => {
            await Promise.resolve();
        });

        expect(mockCheckIntoExamLobby).toHaveBeenCalledTimes(1);
        expect(result.current.admissionStatus).toBe('WAITING');
        expect(result.current.canEnterExam).toBe(false);

        await act(async () => {
            await vi.advanceTimersByTimeAsync(45000);
            await Promise.resolve();
        });

        expect(mockGetExamLobbyAdmissionStatus).toHaveBeenCalledWith({ api: true }, 'exam-1');
        expect(refetchExam).toHaveBeenCalled();
        expect(result.current.admissionStatus).toBe('APPROVED');
    });
});
