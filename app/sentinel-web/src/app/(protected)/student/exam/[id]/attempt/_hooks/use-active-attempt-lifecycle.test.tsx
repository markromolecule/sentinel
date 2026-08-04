import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useActiveAttemptLifecycle } from './use-active-attempt-lifecycle';

const { mockReplace, mockUseExamSessionStatusQuery, mockTerminateStudentAttempt } = vi.hoisted(
    () => ({
        mockReplace: vi.fn(),
        mockUseExamSessionStatusQuery: vi.fn(),
        mockTerminateStudentAttempt: vi.fn(),
    }),
);

vi.mock('next/navigation', () => ({
    useRouter: () => ({
        replace: mockReplace,
    }),
}));

vi.mock('@sentinel/hooks', () => ({
    useExamSessionStatusQuery: (...args: unknown[]) => mockUseExamSessionStatusQuery(...args),
}));

vi.mock('@/app/(protected)/student/exam/[id]/_lib/terminate-student-attempt', () => ({
    terminateStudentAttempt: (...args: unknown[]) => mockTerminateStudentAttempt(...args),
}));

describe('useActiveAttemptLifecycle', () => {
    beforeEach(() => {
        cleanup();
        vi.clearAllMocks();
        mockUseExamSessionStatusQuery.mockReturnValue({
            data: null,
            isLoading: false,
        });
    });

    it('stays idle when no session is active', () => {
        const { result } = renderHook(() =>
            useActiveAttemptLifecycle({
                examId: 'exam-1',
                sessionId: null,
                isAttemptActive: false,
            }),
        );

        expect(result.current.isTerminal).toBe(false);
        expect(result.current.blockedState).toBeNull();
        expect(mockUseExamSessionStatusQuery).toHaveBeenCalledWith(null, false);
    });

    it('maps closed terminal state to blocked copy and cleans up once', async () => {
        const onTerminate = vi.fn();
        mockUseExamSessionStatusQuery.mockReturnValue({
            data: {
                sessionId: 'session-1',
                attemptId: 'attempt-1',
                examId: 'exam-1',
                status: 'IN_PROGRESS',
                lifecycleState: 'CLOSED',
                completedAt: null,
                closedReason: 'EXAM_WINDOW_ENDED',
                terminalMessage: 'This exam attempt has been closed.',
            },
            isLoading: false,
        });

        const { result, rerender } = renderHook(() =>
            useActiveAttemptLifecycle({
                examId: 'exam-1',
                sessionId: 'session-1',
                isAttemptActive: true,
                onTerminate,
            }),
        );

        expect(result.current.isTerminal).toBe(true);
        expect(result.current.blockedState).toEqual({
            isBlocked: true,
            code: 'CLOSED',
            title: 'Exam Closed',
            message: 'This exam attempt has been closed.',
        });

        await waitFor(() => {
            expect(mockTerminateStudentAttempt).toHaveBeenCalledWith({ examId: 'exam-1' });
        });

        rerender();

        expect(onTerminate).toHaveBeenCalledTimes(1);
        expect(mockTerminateStudentAttempt).toHaveBeenCalledTimes(1);
        expect(mockReplace).not.toHaveBeenCalled();
    });

    it('maps submitted attempts to history navigation', async () => {
        mockUseExamSessionStatusQuery.mockReturnValue({
            data: {
                sessionId: 'session-1',
                attemptId: 'attempt-1',
                examId: 'exam-1',
                status: 'COMPLETED',
                lifecycleState: 'SUBMITTED',
                completedAt: '2026-08-04T01:00:00.000Z',
                closedReason: null,
                terminalMessage: 'This exam attempt has been submitted.',
            },
            isLoading: false,
        });

        const { result } = renderHook(() =>
            useActiveAttemptLifecycle({
                examId: 'exam-1',
                sessionId: 'session-1',
                isAttemptActive: true,
            }),
        );

        expect(result.current.isNavigatingToHistory).toBe(true);

        await waitFor(() => {
            expect(mockReplace).toHaveBeenCalledWith('/student/history/attempts/attempt-1');
        });
    });

    it('ignores stale in-progress responses after latching a terminal state', async () => {
        let statusData: any = {
            sessionId: 'session-1',
            attemptId: 'attempt-1',
            examId: 'exam-1',
            status: 'IN_PROGRESS',
            lifecycleState: 'LOCKED',
            completedAt: null,
            closedReason: null,
            terminalMessage: 'This exam attempt is locked.',
        };
        mockUseExamSessionStatusQuery.mockImplementation(() => ({
            data: statusData,
            isLoading: false,
        }));

        const { result, rerender } = renderHook(() =>
            useActiveAttemptLifecycle({
                examId: 'exam-1',
                sessionId: 'session-1',
                isAttemptActive: true,
            }),
        );

        expect(result.current.blockedState?.code).toBe('LOCKED');

        await waitFor(() => {
            expect(mockTerminateStudentAttempt).toHaveBeenCalledTimes(1);
        });

        statusData = {
            ...statusData,
            lifecycleState: 'IN_PROGRESS',
            terminalMessage: null,
        };
        rerender();

        expect(result.current.isTerminal).toBe(true);
        expect(result.current.blockedState?.code).toBe('LOCKED');
        expect(mockTerminateStudentAttempt).toHaveBeenCalledTimes(1);
    });
});
