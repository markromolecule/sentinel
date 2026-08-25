import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useLobbyState } from './use-lobby-state';

const {
    mockUseApi,
    mockCheckIntoExamLobby,
    mockReadStoredExamSession,
    mockUseLobbyTimer,
    mockUseLobbyMediaPipe,
    mockUseLobbyReadiness,
    mockUseLobbyActions,
    mockUseLobbyRealtime,
    mockUseExamLobbyAdmissionStatusQuery,
    mockToastSuccess,
} = vi.hoisted(() => ({
    mockUseApi: vi.fn(),
    mockCheckIntoExamLobby: vi.fn(),
    mockReadStoredExamSession: vi.fn(),
    mockUseLobbyTimer: vi.fn(),
    mockUseLobbyMediaPipe: vi.fn(),
    mockUseLobbyReadiness: vi.fn(),
    mockUseLobbyActions: vi.fn(),
    mockUseLobbyRealtime: vi.fn(),
    mockUseExamLobbyAdmissionStatusQuery: vi.fn(),
    mockToastSuccess: vi.fn(),
}));

vi.mock('@sentinel/hooks', () => ({
    useApi: () => mockUseApi(),
    useLobbyRealtime: (args: unknown) => mockUseLobbyRealtime(args),
    useExamLobbyAdmissionStatusQuery: (examId?: string) => mockUseExamLobbyAdmissionStatusQuery(examId),
}));

vi.mock('sonner', () => ({
    toast: {
        success: (...args: unknown[]) => mockToastSuccess(...args),
        error: vi.fn(),
    },
}));

vi.mock('@sentinel/services', () => ({
    checkIntoExamLobby: (...args: unknown[]) => mockCheckIntoExamLobby(...args),
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
    let mockRefetchAdmissionStatus: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.clearAllMocks();
        mockRefetchAdmissionStatus = vi.fn().mockResolvedValue(undefined);

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
        mockUseExamLobbyAdmissionStatusQuery.mockReturnValue({
            data: { status: 'APPROVED', checkedInAt: '2026-05-11T00:00:00.000Z', decidedAt: null },
            refetch: mockRefetchAdmissionStatus,
        });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('checks in once on mount for automatic-admission lobby flow', async () => {
        const args = createArgs();

        renderHook(() => useLobbyState(args));

        await waitFor(() => {
            expect(mockCheckIntoExamLobby).toHaveBeenCalledWith({ api: true }, 'exam-1');
        });
        expect(mockRefetchAdmissionStatus).toHaveBeenCalled();
    });

    it('reactively updates admission status when TanStack query changes to APPROVED and shows toast', async () => {
        const refetchExam = vi.fn().mockResolvedValue(undefined);

        mockCheckIntoExamLobby.mockResolvedValueOnce({
            status: 'WAITING',
            checkedInAt: '2026-05-11T00:00:00.000Z',
        });

        // Initially WAITING
        mockUseExamLobbyAdmissionStatusQuery.mockReturnValue({
            data: { status: 'WAITING', checkedInAt: '2026-05-11T00:00:00.000Z', decidedAt: null },
            refetch: mockRefetchAdmissionStatus,
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

        const { result, rerender } = renderHook(() => useLobbyState(args));

        expect(result.current.admissionStatus).toBe('WAITING');
        expect(result.current.canEnterExam).toBe(false);

        // Transition to APPROVED via adaptive query / realtime invalidation
        mockUseExamLobbyAdmissionStatusQuery.mockReturnValue({
            data: { status: 'APPROVED', checkedInAt: '2026-05-11T00:00:00.000Z', decidedAt: '2026-05-11T00:00:05.000Z' },
            refetch: mockRefetchAdmissionStatus,
        });

        rerender();

        expect(result.current.admissionStatus).toBe('APPROVED');
        expect(result.current.canEnterExam).toBe(true);
        expect(mockToastSuccess).toHaveBeenCalledWith('Instructor approval received! You may now continue to the exam attempt.');
        expect(refetchExam).toHaveBeenCalled();
    });

    it('optimistically unlocks entry immediately upon approved status without waiting on refetchExam', async () => {
        const refetchExam = vi.fn().mockResolvedValue(undefined);

        mockUseExamLobbyAdmissionStatusQuery.mockReturnValue({
            data: { status: 'APPROVED', checkedInAt: '2026-05-11T00:00:00.000Z', decidedAt: '2026-05-11T00:00:05.000Z' },
            refetch: mockRefetchAdmissionStatus,
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

        expect(result.current.admissionStatus).toBe('APPROVED');
        expect(result.current.canEnterExam).toBe(true);
    });

    it('optimistically unlocks an approved instructor-gated resume after realtime approval', async () => {
        const refetchExam = vi.fn().mockResolvedValue(undefined);

        mockUseExamLobbyAdmissionStatusQuery.mockReturnValue({
            data: { status: 'WAITING', checkedInAt: '2026-05-11T00:00:00.000Z', decidedAt: null },
            refetch: mockRefetchAdmissionStatus,
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

        expect(result.current.canEnterExam).toBe(false);

        const realtimeArgs = mockUseLobbyRealtime.mock.calls.at(-1)?.[0] as
            | { onAdmissionChange?: () => void }
            | undefined;

        mockUseExamLobbyAdmissionStatusQuery.mockReturnValue({
            data: { status: 'APPROVED', checkedInAt: '2026-05-11T00:00:00.000Z', decidedAt: '2026-05-11T00:00:05.000Z' },
            refetch: mockRefetchAdmissionStatus,
        });

        await act(async () => {
            realtimeArgs?.onAdmissionChange?.();
            await Promise.resolve();
        });

        expect(mockRefetchAdmissionStatus).toHaveBeenCalled();
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
        expect(mockUseExamLobbyAdmissionStatusQuery).toHaveBeenCalledWith(undefined);
        expect(result.current.storedSession?.sessionId).toBe('session-1');
    });
});
