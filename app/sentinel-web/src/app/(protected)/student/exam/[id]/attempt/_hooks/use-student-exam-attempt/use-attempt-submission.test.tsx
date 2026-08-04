import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAttemptSubmission } from './use-attempt-submission';

const {
    mockRouterReplace,
    mockWriteStoredExamTurnInPreview,
    mockPrepareExamSession,
    mockExitFullscreen,
    mockApiClient,
    mockToastError,
} = vi.hoisted(() => ({
    mockRouterReplace: vi.fn(),
    mockWriteStoredExamTurnInPreview: vi.fn(),
    mockPrepareExamSession: vi.fn(async () => ({
        preparationToken: 'prep-token-1',
        score: 1,
        totalScore: 1,
        percentage: 100,
        answeredCount: 1,
        autoGradableQuestionCount: 1,
        requiresManualReview: false,
        manualReviewQuestionCount: 0,
    })),
    mockExitFullscreen: vi.fn().mockResolvedValue(undefined),
    mockApiClient: vi.fn(),
    mockToastError: vi.fn(),
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
    prepareExamSession: (...args: Parameters<typeof mockPrepareExamSession>) =>
        mockPrepareExamSession(...args),
}));

vi.mock('@/app/(protected)/student/exam/[id]/_lib/exam-turn-in-storage', () => ({
    writeStoredExamTurnInPreview: (...args: Parameters<typeof mockWriteStoredExamTurnInPreview>) =>
        mockWriteStoredExamTurnInPreview(...args),
}));

vi.mock('@/app/(protected)/student/exam/[id]/_lib/student-exam-session-feedback', () => ({
    resolveStudentExamSessionError: () => 'Preparation failed.',
}));

vi.mock('sonner', () => ({
    toast: {
        error: (...args: Parameters<typeof mockToastError>) => mockToastError(...args),
    },
}));

describe('useAttemptSubmission', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();

        Object.defineProperty(document, 'fullscreenElement', {
            value: { nodeName: 'HTML' },
            configurable: true,
        });
        Object.defineProperty(document, 'exitFullscreen', {
            value: mockExitFullscreen,
            configurable: true,
        });
    });

    it('suspends monitoring before navigation and fullscreen teardown during turn-in', async () => {
        const suspendSecurityMonitoring = vi.fn(() => true);
        const flushPendingProgress = vi.fn().mockResolvedValue(undefined);

        const { result } = renderHook(() =>
            useAttemptSubmission({
                examId: '11111111-1111-1111-1111-111111111111',
                sessionId: '22222222-2222-2222-2222-222222222222',
                releaseScoreMode: 'AUTO_RELEASE',
                questions: [
                    {
                        id: 'question-1',
                        questionId: 'question-1',
                        orderIndex: 0,
                        points: 1,
                        type: 'MULTIPLE_CHOICE',
                        content: {
                            prompt: 'Question 1',
                            options: ['A', 'B', 'C', 'D'],
                        },
                    },
                ] as any,
                selectedAnswers: {
                    'question-1': 'A',
                },
                elapsedSeconds: 120,
                unansweredCount: 0,
                isRedirectingToTurnIn: false,
                setIsRedirectingToTurnIn: vi.fn(),
                setIsSubmitDialogOpen: vi.fn(),
                suspendSecurityMonitoring,
                isBlocked: false,
                flushPendingProgress,
            }),
        );

        await act(async () => {
            result.current.handleSubmit();
            await Promise.resolve();
        });

        expect(suspendSecurityMonitoring).toHaveBeenCalledTimes(1);
        expect(mockRouterReplace).toHaveBeenCalledWith(
            '/student/exam/11111111-1111-1111-1111-111111111111/result',
        );
        expect(suspendSecurityMonitoring.mock.invocationCallOrder[0]).toBeLessThan(
            mockRouterReplace.mock.invocationCallOrder[0],
        );

        await act(async () => {
            vi.runAllTimers();
            await Promise.resolve();
        });

        expect(mockExitFullscreen).toHaveBeenCalledTimes(1);
        expect(suspendSecurityMonitoring.mock.invocationCallOrder[0]).toBeLessThan(
            mockExitFullscreen.mock.invocationCallOrder[0],
        );
    });

    it('flushes pending progress before writing the turn-in preview and routing', async () => {
        const suspendSecurityMonitoring = vi.fn(() => true);
        const flushPendingProgress = vi.fn().mockResolvedValue(undefined);

        const { result } = renderHook(() =>
            useAttemptSubmission({
                examId: '11111111-1111-1111-1111-111111111111',
                sessionId: '22222222-2222-2222-2222-222222222222',
                releaseScoreMode: 'AUTO_RELEASE',
                questions: [
                    {
                        id: 'question-1',
                        questionId: 'question-1',
                        orderIndex: 0,
                        points: 1,
                        type: 'MULTIPLE_CHOICE',
                        content: {
                            prompt: 'Question 1',
                            options: ['A', 'B', 'C', 'D'],
                        },
                    },
                ] as any,
                selectedAnswers: {
                    'question-1': 'A',
                },
                elapsedSeconds: 120,
                unansweredCount: 0,
                isRedirectingToTurnIn: false,
                setIsRedirectingToTurnIn: vi.fn(),
                setIsSubmitDialogOpen: vi.fn(),
                suspendSecurityMonitoring,
                isBlocked: false,
                flushPendingProgress,
            }),
        );

        await act(async () => {
            await result.current.proceedToTurnInReview();
            await Promise.resolve();
        });

        expect(flushPendingProgress).toHaveBeenCalledTimes(1);
        expect(mockPrepareExamSession).toHaveBeenCalledTimes(1);
        expect(flushPendingProgress.mock.invocationCallOrder[0]).toBeLessThan(
            mockPrepareExamSession.mock.invocationCallOrder[0],
        );
        expect(mockPrepareExamSession.mock.invocationCallOrder[0]).toBeLessThan(
            mockWriteStoredExamTurnInPreview.mock.invocationCallOrder[0],
        );
        expect(mockWriteStoredExamTurnInPreview.mock.invocationCallOrder[0]).toBeLessThan(
            mockRouterReplace.mock.invocationCallOrder[0],
        );
    });

    it('falls back to the normal turn-in flow when flushPendingProgress fails', async () => {
        const suspendSecurityMonitoring = vi.fn(() => true);
        const flushPendingProgress = vi.fn().mockRejectedValue(new Error('flush failed'));

        const { result } = renderHook(() =>
            useAttemptSubmission({
                examId: '11111111-1111-1111-1111-111111111111',
                sessionId: '22222222-2222-2222-2222-222222222222',
                releaseScoreMode: 'AUTO_RELEASE',
                questions: [
                    {
                        id: 'question-1',
                        questionId: 'question-1',
                        orderIndex: 0,
                        points: 1,
                        type: 'MULTIPLE_CHOICE',
                        content: {
                            prompt: 'Question 1',
                            options: ['A', 'B', 'C', 'D'],
                        },
                    },
                ] as any,
                selectedAnswers: {
                    'question-1': 'A',
                },
                elapsedSeconds: 120,
                unansweredCount: 0,
                isRedirectingToTurnIn: false,
                setIsRedirectingToTurnIn: vi.fn(),
                setIsSubmitDialogOpen: vi.fn(),
                suspendSecurityMonitoring,
                isBlocked: false,
                flushPendingProgress,
            }),
        );

        await act(async () => {
            await result.current.proceedToTurnInReview();
            await Promise.resolve();
        });

        expect(flushPendingProgress).toHaveBeenCalledTimes(1);
        expect(mockPrepareExamSession).toHaveBeenCalledTimes(1);
        expect(mockWriteStoredExamTurnInPreview).toHaveBeenCalledTimes(1);
    });

    it('skips the flush path entirely when the attempt is blocked', async () => {
        const suspendSecurityMonitoring = vi.fn(() => true);
        const flushPendingProgress = vi.fn().mockResolvedValue(undefined);

        const { result } = renderHook(() =>
            useAttemptSubmission({
                examId: '11111111-1111-1111-1111-111111111111',
                sessionId: '22222222-2222-2222-2222-222222222222',
                releaseScoreMode: 'AUTO_RELEASE',
                questions: [
                    {
                        id: 'question-1',
                        questionId: 'question-1',
                        orderIndex: 0,
                        points: 1,
                        type: 'MULTIPLE_CHOICE',
                        content: {
                            prompt: 'Question 1',
                            options: ['A', 'B', 'C', 'D'],
                        },
                    },
                ] as any,
                selectedAnswers: {
                    'question-1': 'A',
                },
                elapsedSeconds: 120,
                unansweredCount: 0,
                isRedirectingToTurnIn: false,
                setIsRedirectingToTurnIn: vi.fn(),
                setIsSubmitDialogOpen: vi.fn(),
                suspendSecurityMonitoring,
                isBlocked: true,
                flushPendingProgress,
            }),
        );

        await act(async () => {
            result.current.handleSubmit();
            await Promise.resolve();
        });

        expect(flushPendingProgress).not.toHaveBeenCalled();
        expect(mockPrepareExamSession).not.toHaveBeenCalled();
        expect(mockRouterReplace).not.toHaveBeenCalled();
    });

    it('marks the submission phase before suspension and reaches suspended teardown state before navigation', async () => {
        const monitoringState = {
            isSuspended: false,
            phase: 'active',
        };
        const fullscreenSnapshots: Array<{
            isSuspended: boolean;
            phase: string;
        }> = [];
        const suspendSecurityMonitoring = vi.fn(() => {
            monitoringState.isSuspended = true;
            return true;
        });
        const setMonitoringPhase = vi.fn((phase: string) => {
            monitoringState.phase = phase;
            fullscreenSnapshots.push({
                isSuspended: monitoringState.isSuspended,
                phase: monitoringState.phase,
            });
        });

        const { result } = renderHook(() =>
            useAttemptSubmission({
                examId: '11111111-1111-1111-1111-111111111111',
                sessionId: '22222222-2222-2222-2222-222222222222',
                releaseScoreMode: 'AUTO_RELEASE',
                questions: [
                    {
                        id: 'question-1',
                        questionId: 'question-1',
                        orderIndex: 0,
                        points: 1,
                        type: 'MULTIPLE_CHOICE',
                        content: {
                            prompt: 'Question 1',
                            options: ['A', 'B', 'C', 'D'],
                        },
                    },
                ] as any,
                selectedAnswers: {
                    'question-1': 'A',
                },
                elapsedSeconds: 120,
                unansweredCount: 0,
                isRedirectingToTurnIn: false,
                setIsRedirectingToTurnIn: vi.fn(),
                setIsSubmitDialogOpen: vi.fn(),
                suspendSecurityMonitoring,
                isBlocked: false,
                setMonitoringPhase,
            }),
        );

        await act(async () => {
            result.current.handleSubmit();
            await Promise.resolve();
        });

        expect(fullscreenSnapshots).toEqual([
            {
                isSuspended: false,
                phase: 'submitting',
            },
        ]);
        expect(setMonitoringPhase.mock.invocationCallOrder[0]).toBeLessThan(
            suspendSecurityMonitoring.mock.invocationCallOrder[0],
        );
        expect(monitoringState.isSuspended).toBe(true);
    });

    it('reaches submitting plus suspended state before fullscreenchange at submission, router replacement, and delayed fullscreen exit', async () => {
        const monitoringState = {
            isSuspended: false,
            phase: 'active',
        };
        const fullscreenSnapshots: Array<{
            label: string;
            isSuspended: boolean;
            phase: string;
        }> = [];
        const originalRouterReplace = mockRouterReplace.getMockImplementation();
        const originalExitFullscreen = mockExitFullscreen.getMockImplementation();
        const suspendSecurityMonitoring = vi.fn(() => {
            monitoringState.isSuspended = true;
            return true;
        });
        const setMonitoringPhase = vi.fn((phase: string) => {
            monitoringState.phase = phase;
            document.dispatchEvent(new Event('fullscreenchange'));
            fullscreenSnapshots.push({
                label: 'during-submission',
                isSuspended: monitoringState.isSuspended,
                phase: monitoringState.phase,
            });
        });

        mockRouterReplace.mockImplementation((...args) => {
            document.dispatchEvent(new Event('fullscreenchange'));
            fullscreenSnapshots.push({
                label: 'after-router-replace',
                isSuspended: monitoringState.isSuspended,
                phase: monitoringState.phase,
            });
            return originalRouterReplace?.(...args);
        });
        mockExitFullscreen.mockImplementation((...args) => {
            document.dispatchEvent(new Event('fullscreenchange'));
            fullscreenSnapshots.push({
                label: 'after-zero-delay-fullscreen-exit',
                isSuspended: monitoringState.isSuspended,
                phase: monitoringState.phase,
            });
            return originalExitFullscreen?.(...args);
        });

        const { result } = renderHook(() =>
            useAttemptSubmission({
                examId: '11111111-1111-1111-1111-111111111111',
                sessionId: '22222222-2222-2222-2222-222222222222',
                releaseScoreMode: 'AUTO_RELEASE',
                questions: [
                    {
                        id: 'question-1',
                        questionId: 'question-1',
                        orderIndex: 0,
                        points: 1,
                        type: 'MULTIPLE_CHOICE',
                        content: {
                            prompt: 'Question 1',
                            options: ['A', 'B', 'C', 'D'],
                        },
                    },
                ] as any,
                selectedAnswers: {
                    'question-1': 'A',
                },
                elapsedSeconds: 120,
                unansweredCount: 0,
                isRedirectingToTurnIn: false,
                setIsRedirectingToTurnIn: vi.fn(),
                setIsSubmitDialogOpen: vi.fn(),
                suspendSecurityMonitoring,
                isBlocked: false,
                setMonitoringPhase,
            }),
        );

        await act(async () => {
            result.current.handleSubmit();
            await Promise.resolve();
        });

        await act(async () => {
            vi.runOnlyPendingTimers();
            await Promise.resolve();
        });

        expect(fullscreenSnapshots.slice(0, 2)).toEqual([
            {
                label: 'during-submission',
                isSuspended: false,
                phase: 'submitting',
            },
            {
                label: 'after-router-replace',
                isSuspended: true,
                phase: 'submitting',
            },
        ]);
    });

    it('does not navigate or exit fullscreen when monitoring suspension fails', async () => {
        const suspendSecurityMonitoring = vi.fn(() => false);

        const { result } = renderHook(() =>
            useAttemptSubmission({
                examId: '11111111-1111-1111-1111-111111111111',
                sessionId: '22222222-2222-2222-2222-222222222222',
                releaseScoreMode: 'AUTO_RELEASE',
                questions: [
                    {
                        id: 'question-1',
                        questionId: 'question-1',
                        orderIndex: 0,
                        points: 1,
                        type: 'MULTIPLE_CHOICE',
                        content: {
                            prompt: 'Question 1',
                            options: ['A', 'B', 'C', 'D'],
                        },
                    },
                ] as any,
                selectedAnswers: {
                    'question-1': 'A',
                },
                elapsedSeconds: 120,
                unansweredCount: 0,
                isRedirectingToTurnIn: false,
                setIsRedirectingToTurnIn: vi.fn(),
                setIsSubmitDialogOpen: vi.fn(),
                suspendSecurityMonitoring,
                isBlocked: false,
                setMonitoringPhase: vi.fn(),
            }),
        );

        act(() => {
            result.current.handleSubmit();
        });

        await act(async () => {
            vi.runAllTimers();
            await Promise.resolve();
        });

        expect(mockRouterReplace).not.toHaveBeenCalled();
        expect(mockWriteStoredExamTurnInPreview).not.toHaveBeenCalled();
        expect(mockExitFullscreen).not.toHaveBeenCalled();
    });
});
