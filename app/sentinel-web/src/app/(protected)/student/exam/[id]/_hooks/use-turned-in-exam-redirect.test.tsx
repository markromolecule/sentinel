import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTurnedInExamRedirect } from './use-turned-in-exam-redirect';

const { mockRouterReplace, mockClearStoredExamSession, mockClearStoredExamTurnInPreview } =
    vi.hoisted(() => ({
        mockRouterReplace: vi.fn(),
        mockClearStoredExamSession: vi.fn(),
        mockClearStoredExamTurnInPreview: vi.fn(),
    }));

vi.mock('next/navigation', () => ({
    useRouter: () => ({
        replace: mockRouterReplace,
    }),
}));

vi.mock('../_lib/exam-session-storage', () => ({
    clearStoredExamSession: mockClearStoredExamSession,
    clearStoredReconnectIntent: vi.fn(),
}));

vi.mock('../_lib/exam-turn-in-storage', () => ({
    clearStoredExamTurnInPreview: mockClearStoredExamTurnInPreview,
}));

describe('useTurnedInExamRedirect', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('clears local exam state and redirects to history when the exam is already turned in', async () => {
        const { result } = renderHook(() =>
            useTurnedInExamRedirect({
                examId: '11111111-1111-1111-1111-111111111111',
                status: 'turned_in',
                attemptId: '22222222-2222-2222-2222-222222222222',
            }),
        );

        await waitFor(() => {
            expect(result.current).toBe(true);
        });

        expect(mockClearStoredExamTurnInPreview).toHaveBeenCalledWith(
            '11111111-1111-1111-1111-111111111111',
        );
        expect(mockClearStoredExamSession).toHaveBeenCalledWith(
            '11111111-1111-1111-1111-111111111111',
        );
        expect(mockRouterReplace).toHaveBeenCalledWith(
            '/student/history/attempts/22222222-2222-2222-2222-222222222222',
        );
    });

    it('does not redirect when the exam is still active', () => {
        const { result } = renderHook(() =>
            useTurnedInExamRedirect({
                examId: '11111111-1111-1111-1111-111111111111',
                status: 'available',
                attemptId: '22222222-2222-2222-2222-222222222222',
            }),
        );

        expect(result.current).toBe(false);
        expect(mockClearStoredExamTurnInPreview).not.toHaveBeenCalled();
        expect(mockClearStoredExamSession).not.toHaveBeenCalled();
        expect(mockRouterReplace).not.toHaveBeenCalled();
    });

    it('does not redirect when a turned-in exam has a new approved retake window', () => {
        const { result } = renderHook(() =>
            useTurnedInExamRedirect({
                examId: '11111111-1111-1111-1111-111111111111',
                status: 'turned_in',
                attemptId: '22222222-2222-2222-2222-222222222222',
                runtimeAccess: {
                    state: 'reopened',
                    reasonCode: 'REOPENED',
                    message: 'Your approved retake window is open.',
                    canStart: true,
                    canResume: false,
                    hasActiveAttempt: false,
                    startsAt: null,
                    endsAt: null,
                    reopenedUntil: '2026-04-20T10:30:00.000Z',
                },
            }),
        );

        expect(result.current).toBe(false);
        expect(mockClearStoredExamTurnInPreview).not.toHaveBeenCalled();
        expect(mockClearStoredExamSession).not.toHaveBeenCalled();
        expect(mockRouterReplace).not.toHaveBeenCalled();
    });

    it('does not redirect when disabled is true', () => {
        const { result } = renderHook(() =>
            useTurnedInExamRedirect({
                examId: '11111111-1111-1111-1111-111111111111',
                status: 'turned_in',
                attemptId: '22222222-2222-2222-2222-222222222222',
                disabled: true,
            }),
        );

        expect(result.current).toBe(false);
        expect(mockClearStoredExamTurnInPreview).not.toHaveBeenCalled();
        expect(mockClearStoredExamSession).not.toHaveBeenCalled();
        expect(mockRouterReplace).not.toHaveBeenCalled();
    });
});
