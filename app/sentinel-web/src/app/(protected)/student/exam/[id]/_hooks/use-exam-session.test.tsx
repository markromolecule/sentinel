import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { StrictMode, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useExamSession } from './use-exam-session';

const {
    mockRouterReplace,
    mockApiClient,
    mockStartExamSession,
    mockSyncExamProgress,
    mockToastError,
    mockReadStoredExamSession,
    mockWriteStoredExamSession,
    mockClearStoredExamSession,
    mockReadStoredExamAnswerDraft,
    mockWriteStoredExamAnswerDraft,
    mockReadStoredExamTurnInPreview,
    mockClearStoredExamTurnInPreview,
    mockReadStoredLobbyEntryMarker,
    mockClearStoredLobbyEntryMarker,
    mockConsumeStoredLobbyEntry,
    mockWriteStoredReconnectIntent,
    mockReconcileExamAnswerDraft,
    mockGetStudentExamSessionAttemptId,
    mockIsStudentExamAlreadyTurnedInError,
} = vi.hoisted(() => ({
    mockRouterReplace: vi.fn(),
    mockApiClient: vi.fn(),
    mockStartExamSession: vi.fn(),
    mockSyncExamProgress: vi.fn(),
    mockToastError: vi.fn(),
    mockReadStoredExamSession: vi.fn(),
    mockWriteStoredExamSession: vi.fn(),
    mockClearStoredExamSession: vi.fn(),
    mockReadStoredExamAnswerDraft: vi.fn(),
    mockWriteStoredExamAnswerDraft: vi.fn(),
    mockReadStoredExamTurnInPreview: vi.fn(),
    mockClearStoredExamTurnInPreview: vi.fn(),
    mockReadStoredLobbyEntryMarker: vi.fn(),
    mockClearStoredLobbyEntryMarker: vi.fn(),
    mockConsumeStoredLobbyEntry: vi.fn(),
    mockWriteStoredReconnectIntent: vi.fn(),
    mockReconcileExamAnswerDraft: vi.fn((local) => ({
        answers: local?.answers ?? {},
        elapsedSeconds: local?.elapsedSeconds ?? 0,
        source: local ? 'local' : 'empty',
    })),
    mockGetStudentExamSessionAttemptId: vi.fn(),
    mockIsStudentExamAlreadyTurnedInError: vi.fn(() => false),
}));

vi.mock('next/navigation', () => ({
    useRouter: () => ({
        replace: mockRouterReplace,
    }),
}));

vi.mock('@sentinel/hooks', () => ({
    useApi: () => mockApiClient,
}));

vi.mock('@sentinel/services', () => ({
    startExamSession: mockStartExamSession,
    syncExamProgress: mockSyncExamProgress,
}));

vi.mock('sonner', () => ({
    toast: {
        error: mockToastError,
    },
}));

vi.mock('../_lib/exam-session-storage', () => ({
    readStoredExamSession: mockReadStoredExamSession,
    writeStoredExamSession: mockWriteStoredExamSession,
    clearStoredExamSession: mockClearStoredExamSession,
    readStoredExamAnswerDraft: mockReadStoredExamAnswerDraft,
    writeStoredExamAnswerDraft: mockWriteStoredExamAnswerDraft,
    readStoredLobbyEntryMarker: mockReadStoredLobbyEntryMarker,
    clearStoredLobbyEntryMarker: mockClearStoredLobbyEntryMarker,
    consumeStoredLobbyEntry: mockConsumeStoredLobbyEntry,
    writeStoredReconnectIntent: mockWriteStoredReconnectIntent,
    reconcileExamAnswerDraft: mockReconcileExamAnswerDraft,
}));

vi.mock('../_lib/exam-turn-in-storage', () => ({
    readStoredExamTurnInPreview: mockReadStoredExamTurnInPreview,
    clearStoredExamTurnInPreview: mockClearStoredExamTurnInPreview,
}));

vi.mock('../_lib/student-exam-session-feedback', () => ({
    getStudentExamSessionAttemptId: (...args: unknown[]) =>
        mockGetStudentExamSessionAttemptId(...args),
    isStudentExamAlreadyTurnedInError: (...args: unknown[]) =>
        mockIsStudentExamAlreadyTurnedInError(...args),
    resolveStudentExamSessionError: vi.fn(() => 'Failed to prepare the exam session.'),
}));

function mockAttemptLocation(examId: string) {
    const originalLocation = window.location;

    Object.defineProperty(window, 'location', {
        configurable: true,
        value: { ...originalLocation, pathname: `/student/exam/${examId}/attempt` },
    });

    return () => {
        Object.defineProperty(window, 'location', {
            configurable: true,
            value: originalLocation,
        });
    };
}

describe('useExamSession', () => {
    beforeEach(() => {
        cleanup();
        vi.clearAllMocks();
        mockReadStoredExamSession.mockReturnValue(null);
        mockReadStoredExamTurnInPreview.mockReturnValue(null);
        mockReadStoredExamAnswerDraft.mockReturnValue(null);
        mockReadStoredLobbyEntryMarker.mockReturnValue(true);
        mockConsumeStoredLobbyEntry.mockReturnValue({
            token: 'mock-token',
            version: 1,
            examId: '11111111-1111-1111-1111-111111111111',
            createdAt: new Date().toISOString(),
        });
        mockSyncExamProgress.mockResolvedValue({
            message: 'Session progress synced successfully.',
        });
        mockGetStudentExamSessionAttemptId.mockReturnValue(null);
        mockIsStudentExamAlreadyTurnedInError.mockReturnValue(false);
    });

    it('keeps the stored session when the exam is still open for new starts', async () => {
        const storedSession = {
            examId: '11111111-1111-1111-1111-111111111111',
            sessionId: '22222222-2222-2222-2222-222222222222',
            storedAt: '2026-04-20T10:00:00.000Z',
        };

        mockReadStoredExamSession.mockReturnValue(storedSession);

        const { result } = renderHook(() =>
            useExamSession({
                examId: storedSession.examId,
                runtimeAccess: {
                    state: 'open',
                    reasonCode: 'OPEN',
                    message: 'This exam is open for students.',
                    canStart: true,
                    canResume: false,
                    hasActiveAttempt: false,
                    startsAt: null,
                    endsAt: null,
                    reopenedUntil: null,
                },
                isLoadingData: false,
                isSessionStartBlocked: false,
            }),
        );

        await waitFor(() => {
            expect(result.current.isInitializingSession).toBe(false);
        });

        expect(result.current.examSession).toEqual(storedSession);
        expect(mockClearStoredExamSession).not.toHaveBeenCalled();
        expect(mockToastError).not.toHaveBeenCalled();
        expect(mockRouterReplace).not.toHaveBeenCalled();
        expect(mockStartExamSession).not.toHaveBeenCalled();
    });

    it('restores cached answer drafts for a stored active session', async () => {
        const storedSession = {
            examId: '11111111-1111-1111-1111-111111111111',
            sessionId: '22222222-2222-2222-2222-222222222222',
            storedAt: '2026-04-20T10:00:00.000Z',
        };
        const onInitializeAnswers = vi.fn();
        const onInitializeElapsedSeconds = vi.fn();

        mockReadStoredExamSession.mockReturnValue(storedSession);
        mockReadStoredExamAnswerDraft.mockReturnValue({
            examId: storedSession.examId,
            sessionId: storedSession.sessionId,
            answers: {
                'question-1': 'B',
            },
            elapsedSeconds: 95,
            storedAt: '2026-04-20T10:01:00.000Z',
        });

        const { result } = renderHook(() =>
            useExamSession({
                examId: storedSession.examId,
                runtimeAccess: {
                    state: 'open',
                    reasonCode: 'OPEN',
                    message: 'This exam is open for students.',
                    canStart: true,
                    canResume: true,
                    hasActiveAttempt: true,
                    startsAt: null,
                    endsAt: null,
                    reopenedUntil: null,
                },
                isLoadingData: false,
                isSessionStartBlocked: false,
                onInitializeAnswers,
                onInitializeElapsedSeconds,
            }),
        );

        await waitFor(() => {
            expect(result.current.elapsedSeconds).toBe(95);
        });

        expect(onInitializeAnswers).toHaveBeenCalledWith({
            'question-1': 'B',
        });
        expect(onInitializeElapsedSeconds).toHaveBeenCalledWith(95);
    });

    it('does not reinitialize the session when callback props change', async () => {
        const examId = '11111111-1111-1111-1111-111111111111';
        const firstCallback = vi.fn();
        const replacementCallback = vi.fn();

        const { rerender, result } = renderHook(
            ({ onInitializeAnswers }) =>
                useExamSession({
                    examId,
                    isLoadingData: false,
                    isSessionStartBlocked: false,
                    onInitializeAnswers,
                }),
            { initialProps: { onInitializeAnswers: firstCallback } },
        );

        await waitFor(() => {
            expect(result.current.isInitializingSession).toBe(false);
        });

        rerender({ onInitializeAnswers: replacementCallback });

        expect(mockReadStoredExamSession).toHaveBeenCalledTimes(1);
        expect(replacementCallback).not.toHaveBeenCalled();
    });

    it('keeps an already-active stored session when runtime access later blocks new starts', async () => {
        const storedSession = {
            examId: '11111111-1111-1111-1111-111111111111',
            sessionId: '22222222-2222-2222-2222-222222222222',
            storedAt: '2026-04-20T10:00:00.000Z',
        };

        mockReadStoredExamSession.mockReturnValue(storedSession);

        const { result } = renderHook(() =>
            useExamSession({
                examId: storedSession.examId,
                runtimeAccess: {
                    state: 'locked',
                    reasonCode: 'LOCKED',
                    message: 'This exam is locked by the instructor.',
                    canStart: false,
                    canResume: false,
                    hasActiveAttempt: false,
                    startsAt: null,
                    endsAt: null,
                    reopenedUntil: null,
                },
                isLoadingData: false,
                isSessionStartBlocked: false,
            }),
        );

        await waitFor(() => {
            expect(result.current.examSession).toEqual(storedSession);
        });

        expect(mockClearStoredExamSession).not.toHaveBeenCalled();
        expect(mockToastError).not.toHaveBeenCalled();
        expect(mockRouterReplace).not.toHaveBeenCalled();
    });
});

describe('useExamSession — timer and callback stability', () => {
    beforeEach(() => {
        cleanup();
        vi.clearAllMocks();
        vi.useFakeTimers({ shouldAdvanceTime: true });
        mockReadStoredExamSession.mockReturnValue(null);
        mockReadStoredExamTurnInPreview.mockReturnValue(null);
        mockReadStoredExamAnswerDraft.mockReturnValue(null);
        mockReadStoredLobbyEntryMarker?.mockReturnValue?.(true);
        mockConsumeStoredLobbyEntry.mockReturnValue(null);
        mockSyncExamProgress.mockResolvedValue({ message: 'ok' });
        mockGetStudentExamSessionAttemptId.mockReturnValue(null);
        mockIsStudentExamAlreadyTurnedInError.mockReturnValue(false);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('advances elapsedSeconds and keeps elapsedSecondsRef in sync on every tick', async () => {
        const { result } = renderHook(() =>
            useExamSession({
                examId: '11111111-1111-1111-1111-111111111111',
                examDurationMinutes: 60,
                isAttemptActive: true,
            }),
        );

        await waitFor(() => expect(result.current.isInitializingSession).toBe(false));

        // Advance 3 seconds
        act(() => {
            vi.advanceTimersByTime(3000);
        });

        expect(result.current.elapsedSeconds).toBe(3);
        expect(result.current.elapsedSecondsRef.current).toBe(3);
    });

    it('does not start the timer when isAttemptActive is false', async () => {
        const { result } = renderHook(() =>
            useExamSession({
                examId: '11111111-1111-1111-1111-111111111111',
                examDurationMinutes: 60,
                isAttemptActive: false,
            }),
        );

        await waitFor(() => expect(result.current.isInitializingSession).toBe(false));

        act(() => {
            vi.advanceTimersByTime(5000);
        });

        // elapsedSeconds should remain at its initial value
        expect(result.current.elapsedSeconds).toBe(0);
    });

    it('stops the timer when isAttemptActive flips to false', async () => {
        const { result, rerender } = renderHook(
            ({ isAttemptActive }: { isAttemptActive: boolean }) =>
                useExamSession({
                    examId: '11111111-1111-1111-1111-111111111111',
                    examDurationMinutes: 60,
                    isAttemptActive,
                }),
            { initialProps: { isAttemptActive: true } },
        );

        await waitFor(() => expect(result.current.isInitializingSession).toBe(false));

        act(() => {
            vi.advanceTimersByTime(2000);
        });
        expect(result.current.elapsedSeconds).toBe(2);

        // Latch terminal state — timer must stop
        rerender({ isAttemptActive: false });

        act(() => {
            vi.advanceTimersByTime(5000);
        });
        expect(result.current.elapsedSeconds).toBe(2);
    });

    it('syncProgress callback identity is stable across timer ticks', async () => {
        const { result } = renderHook(() =>
            useExamSession({
                examId: '11111111-1111-1111-1111-111111111111',
                examDurationMinutes: 60,
                isAttemptActive: true,
            }),
        );

        await waitFor(() => expect(result.current.isInitializingSession).toBe(false));

        const syncBefore = result.current.syncProgress;

        // Advance 5 seconds — identity must not change
        act(() => {
            vi.advanceTimersByTime(5000);
        });

        expect(result.current.elapsedSeconds).toBe(5);
        expect(result.current.syncProgress).toBe(syncBefore);
    });

    it('does not tick the timer when isTerminalAttempt is true', async () => {
        const { result } = renderHook(() =>
            useExamSession({
                examId: '11111111-1111-1111-1111-111111111111',
                examDurationMinutes: 60,
                isTerminalAttempt: true,
                isAttemptActive: true,
            }),
        );

        await waitFor(() => expect(result.current.isInitializingSession).toBe(false));

        act(() => {
            vi.advanceTimersByTime(5000);
        });

        expect(result.current.elapsedSeconds).toBe(0);
    });
});
