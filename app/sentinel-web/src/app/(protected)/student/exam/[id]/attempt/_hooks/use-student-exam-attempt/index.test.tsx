import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_AUDIO_ANOMALY_CONFIG } from '@sentinel/shared';
import { useStudentExamAttempt } from './index';

const {
    mockUseStudentExamData,
    mockUseExamSession,
    mockUseExamSessionStatusQuery,
    mockUseAttemptMonitoring,
    mockUseAudioSettingsQuery,
    mockRouterReplace,
    mockReadStoredLobbyEntryMarker,
    mockReadStoredExamSession,
    mockPrepareExamSession,
} = vi.hoisted(() => ({
    mockUseStudentExamData: vi.fn(),
    mockUseExamSession: vi.fn(),
    mockUseExamSessionStatusQuery: vi.fn(() => ({ data: null, isLoading: false })),
    mockUseAttemptMonitoring: vi.fn(),
    mockUseAudioSettingsQuery: vi.fn(),
    mockRouterReplace: vi.fn(),
    mockReadStoredLobbyEntryMarker: vi.fn(),
    mockReadStoredExamSession: vi.fn(),
    mockPrepareExamSession: vi.fn().mockResolvedValue({
        preparationToken: 'tok-1',
        score: 10,
        totalScore: 10,
        percentage: 100,
        answeredCount: 10,
        autoGradableQuestionCount: 10,
        manualReviewQuestionCount: 0,
        requiresManualReview: false,
    }),
}));

vi.mock('next/navigation', () => ({
    useRouter: () => ({
        replace: mockRouterReplace,
    }),
}));

vi.mock('@sentinel/hooks', () => ({
    useApi: () => ({ mockClient: true }),
    useAudioSettingsQuery: () => mockUseAudioSettingsQuery(),
    useExamSessionStatusQuery: (...args: unknown[]) => mockUseExamSessionStatusQuery(...args),
}));

vi.mock('@/app/(protected)/student/exam/[id]/_hooks/use-student-exam-stage-guard', async () => {
    const actual = await vi.importActual<
        typeof import('@/app/(protected)/student/exam/[id]/_lib/student-exam-flow')
    >('@/app/(protected)/student/exam/[id]/_lib/student-exam-flow');

    return {
        useStudentExamStageGuard: (requestedStage: string) => {
            const data = mockUseStudentExamData();
            const storedFlow = actual.readStoredStudentExamFlow(data?.examId ?? '');
            const hasFreshLobbyEntry = mockReadStoredLobbyEntryMarker(data?.examId ?? '');
            const storedSession = mockReadStoredExamSession(data?.examId ?? '');
            const resolution = actual.resolveStudentExamStage({
                requestedStage,
                privacyAccepted: true,
                checkupCompleted: true,
                mediaPipeStatus: 'ready',
                admissionMode: data?.configuration?.lobbyAdmissionMode ?? 'AUTOMATIC',
                admissionState: null,
                runtimeAccess: data?.exam?.runtimeAccess,
                hasFreshLobbyEntry,
                storedSessionId: storedSession?.sessionId,
                lobbyEntrySessionId: storedSession?.sessionId,
            });

            if (resolution.shouldRedirect && data?.examId) {
                mockRouterReplace(`/student/exam/${data.examId}/${resolution.targetStage}`);
            }

            return {
                ...data,
                storedFlow,
                resolution,
                isResolving: data?.isLoading ?? false,
                isLoading: data?.isLoading ?? false,
            };
        },
    };
});

vi.mock('@/app/(protected)/student/exam/[id]/_hooks/use-exam-session', () => ({
    useExamSession: (args: unknown) => mockUseExamSession(args),
}));

vi.mock('@/app/(protected)/student/exam/[id]/_hooks/use-turned-in-exam-redirect', () => ({
    useTurnedInExamRedirect: () => false,
}));

vi.mock('./use-attempt-monitoring', () => ({
    useAttemptMonitoring: (args: unknown) => mockUseAttemptMonitoring(args),
}));

vi.mock('@sentinel/services', () => ({
    prepareExamSession: (...args: unknown[]) => mockPrepareExamSession(...args),
}));

vi.mock('@/app/(protected)/student/exam/[id]/_lib/exam-turn-in-storage', () => ({
    writeStoredExamTurnInPreview: vi.fn(),
}));

vi.mock('@/app/(protected)/student/exam/[id]/_lib/exam-session-storage', async () => {
    const actual = await vi.importActual<
        typeof import('@/app/(protected)/student/exam/[id]/_lib/exam-session-storage')
    >('@/app/(protected)/student/exam/[id]/_lib/exam-session-storage');

    return {
        ...actual,
        readStoredLobbyEntryMarker: (examId: string) => mockReadStoredLobbyEntryMarker(examId),
        readStoredExamSession: (examId: string) => mockReadStoredExamSession(examId),
    };
});

function createQuestions(count: number) {
    return Array.from({ length: count }, (_, index) => ({
        id: `question-${index + 1}`,
        questionId: `question-${index + 1}`,
        orderIndex: index,
        points: 1,
        type: 'MULTIPLE_CHOICE',
        content: {
            prompt: `Question ${index + 1}`,
            options: ['A', 'B', 'C', 'D'],
        },
        passageType: index === 0 ? 'plain' : index === 1 ? 'html' : null,
        passageContent:
            index === 0
                ? 'Passage for question 1'
                : index === 1
                  ? '<p><strong>Passage</strong> for question 2</p>'
                  : null,
    })) as {
        id: string;
        questionId: string;
        orderIndex: number;
        points: number;
        type: string;
        content: {
            prompt: string;
            options: string[];
        };
        passageType: 'plain' | 'html' | null;
        passageContent: string | null;
    }[];
}

describe('useStudentExamAttempt', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        mockUseStudentExamData.mockReturnValue({
            examId: '11111111-1111-1111-1111-111111111111',
            exam: {
                id: '11111111-1111-1111-1111-111111111111',
                title: 'Attempt test',
                description: 'Attempt test description',
                duration: 60,
                status: 'available',
                runtimeAccess: {
                    canStart: true,
                    canResume: false,
                    hasActiveAttempt: true,
                },
            },
            configuration: {
                cameraRequired: false,
            },
            mediaPipeSandbox: null,
            questions: createQuestions(10),
            isLoading: false,
        });

        mockUseExamSession.mockReturnValue({
            examSession: {
                sessionId: '22222222-2222-2222-2222-222222222222',
                configSnapshot: null,
            },
            isInitializingSession: false,
            elapsedSeconds: 120,
            elapsedSecondsRef: { current: 120 },
            secondsRemaining: 1800,
            saveAnswerDraft: vi.fn(),
            syncProgress: vi.fn(),
        });

        mockUseAttemptMonitoring.mockReturnValue({
            mediaPipeVideoRef: { current: null },
            mediaPipeAnalysis: null,
            mediaPipePhase: 'idle',
            mediaPipeErrorMessage: null,
            mediaPipeIncident: null,
            dismissMediaPipeIncident: vi.fn(),
            isMediaPipeEnabled: false,
            audioErrorMessage: null,
            audioMonitoringPhase: 'idle',
            isAudioMonitoringEnabled: false,
            securityLockReason: null,
            isResumingExam: false,
            resumeSecuredExam: vi.fn(),
            fullScreenContainerRef: { current: null },
            suspendSecurityMonitoring: vi.fn(() => true),
        });

        mockReadStoredLobbyEntryMarker.mockReturnValue(true);
        mockReadStoredExamSession.mockReturnValue(null);
        mockUseAudioSettingsQuery.mockReturnValue({
            data: {
                value: {
                    ...DEFAULT_AUDIO_ANOMALY_CONFIG,
                    thresholds: {
                        ...DEFAULT_AUDIO_ANOMALY_CONFIG.thresholds,
                        TALKING: 0.72,
                    },
                },
            },
            isLoading: false,
        });
    });

    it('reports zero unanswered questions when every question has a valid answer', () => {
        const { result } = renderHook(() => useStudentExamAttempt());

        act(() => {
            result.current.questions.forEach((question) => {
                result.current.handleAnswerChange(question.id, 'A');
            });
        });

        expect(result.current.answeredCount).toBe(10);
        expect(result.current.unansweredCount).toBe(0);
        expect(result.current.unansweredQuestionLabels).toEqual([]);
    });

    it('reports empty string answers as unanswered', () => {
        const { result } = renderHook(() => useStudentExamAttempt());

        act(() => {
            result.current.questions.forEach((question, index) => {
                result.current.handleAnswerChange(question.id, index < 2 ? '' : 'A');
            });
        });

        expect(result.current.answeredCount).toBe(8);
        expect(result.current.unansweredCount).toBe(2);
        expect(result.current.unansweredQuestionLabels).toEqual(['Q1', 'Q2']);
    });

    it('exposes the flushPendingProgress boundary helper', () => {
        const { result } = renderHook(() => useStudentExamAttempt());

        expect(typeof result.current.flushPendingProgress).toBe('function');
    });

    it('keeps the attempt page active after valid lobby entry', () => {
        renderHook(() => useStudentExamAttempt());

        expect(mockRouterReplace).not.toHaveBeenCalled();
    });

    it('redirects a hard reload when a stored session exists to lobby', () => {
        mockReadStoredLobbyEntryMarker.mockReturnValue(false);
        mockReadStoredExamSession.mockReturnValue({
            examId: '11111111-1111-1111-1111-111111111111',
            sessionId: '22222222-2222-2222-2222-222222222222',
            storedAt: '2026-05-11T00:00:00.000Z',
            isResumed: false,
            configSnapshot: null,
        });

        renderHook(() => useStudentExamAttempt());

        expect(mockRouterReplace).toHaveBeenCalledWith(
            '/student/exam/11111111-1111-1111-1111-111111111111/lobby',
        );
    });

    it('redirects a resumable active attempt without a lobby marker to lobby', () => {
        mockReadStoredLobbyEntryMarker.mockReturnValue(false);
        mockUseStudentExamData.mockReturnValue({
            examId: '11111111-1111-1111-1111-111111111111',
            exam: {
                id: '11111111-1111-1111-1111-111111111111',
                title: 'Attempt test',
                description: 'Attempt test description',
                duration: 60,
                status: 'available',
                runtimeAccess: {
                    canStart: false,
                    canResume: true,
                    hasActiveAttempt: true,
                },
            },
            configuration: {
                cameraRequired: false,
            },
            mediaPipeSandbox: null,
            questions: createQuestions(10),
            isLoading: false,
        });

        renderHook(() => useStudentExamAttempt());

        expect(mockRouterReplace).toHaveBeenCalledWith(
            '/student/exam/11111111-1111-1111-1111-111111111111/lobby',
        );
    });

    it('redirects direct attempt access without a lobby marker or stored session', () => {
        mockReadStoredLobbyEntryMarker.mockReturnValue(false);
        const baseData = mockUseStudentExamData();
        mockUseStudentExamData.mockReturnValue({
            ...baseData,
            exam: {
                ...baseData.exam,
                runtimeAccess: {
                    canStart: true,
                    canResume: false,
                    hasActiveAttempt: false,
                },
            },
        });

        renderHook(() => useStudentExamAttempt());

        expect(mockRouterReplace).toHaveBeenCalledWith(
            '/student/exam/11111111-1111-1111-1111-111111111111/lobby',
        );
    });

    it('suspends security monitoring before navigating to turn-in result review', async () => {
        const suspendSecurityMonitoring = vi.fn(() => true);
        mockUseAttemptMonitoring.mockReturnValue({
            mediaPipeVideoRef: { current: null },
            mediaPipeAnalysis: null,
            mediaPipePhase: 'idle',
            mediaPipeErrorMessage: null,
            mediaPipeIncident: null,
            dismissMediaPipeIncident: vi.fn(),
            isMediaPipeEnabled: false,
            audioErrorMessage: null,
            audioMonitoringPhase: 'idle',
            isAudioMonitoringEnabled: false,
            securityLockReason: null,
            isResumingExam: false,
            resumeSecuredExam: vi.fn(),
            fullScreenContainerRef: { current: null },
            suspendSecurityMonitoring,
        });

        const { result } = renderHook(() => useStudentExamAttempt());

        act(() => {
            result.current.questions.forEach((question) => {
                result.current.handleAnswerChange(question.id, 'A');
            });
        });

        act(() => {
            result.current.handleSubmit();
        });

        // suspendSecurityMonitoring fires synchronously inside handleSubmit
        expect(suspendSecurityMonitoring).toHaveBeenCalledTimes(1);

        // router.replace fires after the async prepareExamSession resolves
        await waitFor(() => {
            expect(mockRouterReplace).toHaveBeenCalledWith(
                '/student/exam/11111111-1111-1111-1111-111111111111/result',
            );
        });

        expect(suspendSecurityMonitoring.mock.invocationCallOrder[0]).toBeLessThan(
            mockRouterReplace.mock.invocationCallOrder[0],
        );
    });

    it('passes persisted support audio settings into attempt monitoring when audio anomaly detection is enabled', () => {
        mockUseStudentExamData.mockReturnValue({
            examId: '11111111-1111-1111-1111-111111111111',
            exam: {
                id: '11111111-1111-1111-1111-111111111111',
                title: 'Attempt test',
                description: 'Attempt test description',
                duration: 60,
                status: 'available',
                runtimeAccess: {
                    canStart: true,
                    canResume: false,
                    hasActiveAttempt: true,
                },
            },
            configuration: {
                cameraRequired: false,
                micRequired: true,
                aiRules: {
                    audio_anomaly_detection: true,
                },
            },
            mediaPipeSandbox: null,
            questions: createQuestions(2),
            isLoading: false,
        });

        renderHook(() => useStudentExamAttempt());

        expect(mockUseAttemptMonitoring).toHaveBeenCalledWith(
            expect.objectContaining({
                audioSettings: expect.objectContaining({
                    thresholds: expect.objectContaining({
                        TALKING: 0.72,
                    }),
                }),
            }),
        );
    });

    it('recomputes the current passage context when the current question changes', () => {
        const { result } = renderHook(() => useStudentExamAttempt());

        expect(result.current.currentQuestion?.id).toBe('question-1');
        expect(result.current.currentContext.body).toContain('Passage for question 1');

        act(() => {
            result.current.setCurrentQuestionIndex(1);
        });

        expect(result.current.currentQuestion?.id).toBe('question-2');
        expect(result.current.currentContext.body).toContain('Passage');
        expect(result.current.currentContext.body).not.toContain('Passage for question 1');

        act(() => {
            result.current.setCurrentQuestionIndex(2);
        });

        expect(result.current.currentQuestion?.id).toBe('question-3');
        expect(result.current.currentContext.body).toBe('');
    });

    it('keeps the chosen passage-panel visibility state while question content refreshes', () => {
        const { result } = renderHook(() => useStudentExamAttempt());

        expect(result.current.showPassagePanel).toBe(true);

        act(() => {
            result.current.setShowPassagePanel(false);
            result.current.setCurrentQuestionIndex(1);
        });

        expect(result.current.showPassagePanel).toBe(false);
        expect(result.current.currentQuestion?.id).toBe('question-2');
        expect(result.current.currentContext.body).toContain('Passage');
        expect(result.current.currentContext.body).not.toContain('question 1');
    });

    it('defaults isCompactPassageOpen to false and closes it on question change', () => {
        const { result } = renderHook(() => useStudentExamAttempt());

        expect(result.current.isCompactPassageOpen).toBe(false);

        act(() => {
            result.current.setIsCompactPassageOpen(true);
        });
        expect(result.current.isCompactPassageOpen).toBe(true);

        act(() => {
            result.current.setCurrentQuestionIndex(1);
        });
        expect(result.current.isCompactPassageOpen).toBe(false);
    });
});
