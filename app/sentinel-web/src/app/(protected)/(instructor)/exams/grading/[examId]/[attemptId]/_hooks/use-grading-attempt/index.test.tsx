import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { useGradingAttempt } from './index';
import { getGradingAttemptDetail, updateGradingAttempt } from '@sentinel/services';
import { LEGACY_ESSAY_RUBRIC } from '@sentinel/shared';

const { mockApiClient } = vi.hoisted(() => ({
    mockApiClient: vi.fn(),
}));

const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock('@sentinel/hooks', () => ({
    useApi: () => mockApiClient,
}));

vi.mock('@sentinel/services', () => ({
    getGradingAttemptDetail: vi.fn(),
    updateGradingAttempt: vi.fn(),
}));

vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: mockPush,
        refresh: mockRefresh,
    }),
}));

function createWrapper() {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
            },
        },
    });

    return function Wrapper({ children }: { children: ReactNode }) {
        return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    };
}

const mockLegacyRubric = {
    id: 'legacy-standard-v1',
    versionNumber: 1,
    source: 'LEGACY' as const,
    definition: LEGACY_ESSAY_RUBRIC,
    updatedAt: null,
};

describe('useGradingAttempt', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('initializes grading states and calculates scores correctly', async () => {
        const attemptDetail = {
            attempt: {
                id: 'attempt-id',
                examId: 'exam-id',
                studentName: 'Alice Student',
                studentNumber: '2026-0001',
                examTitle: 'Final Exam',
                subjectTitle: 'Computer Science',
                totalScore: 100,
                status: 'SUBMITTED',
                completedAt: '2026-06-13T00:00:00Z',
                answers: {
                    'q-1': 'essay answer text',
                },
                evaluations: {},
                rubric: mockLegacyRubric,
            },
            questions: [
                {
                    id: 'q-1',
                    examId: 'exam-id',
                    type: 'ESSAY',
                    points: 20,
                    orderIndex: 0,
                    content: {
                        prompt: 'Explain polymorphism.',
                    },
                },
            ],
        };

        vi.mocked(getGradingAttemptDetail).mockResolvedValue(attemptDetail);

        const { result } = renderHook(
            () => useGradingAttempt({ examId: 'exam-id', attemptId: 'attempt-id' }),
            {
                wrapper: createWrapper(),
            },
        );

        // Wait for query to resolve and hook state to initialize
        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
            expect(result.current.attemptDetail).toEqual(attemptDetail);
        });

        // Verify initial evaluations setup (default score of 4 for each criteria)
        expect(result.current.evaluations['q-1']).toEqual({
            scores: {
                contentSubstance: 4,
                structureOrganization: 4,
                argumentationSupport: 4,
                styleTone: 4,
                grammarConventions: 4,
            },
            feedback: '',
        });

        expect(result.current.scoreSummary.essayScore).toBe(20); // 4/4 is 100% of 20 points
        expect(result.current.activeQuestionId).toBe('q-1');
    });

    it('updates scores and feedback states via handler functions', async () => {
        const attemptDetail = {
            attempt: {
                id: 'attempt-id',
                examId: 'exam-id',
                studentName: 'Alice Student',
                studentNumber: '2026-0001',
                examTitle: 'Final Exam',
                subjectTitle: 'Computer Science',
                totalScore: 100,
                status: 'SUBMITTED',
                completedAt: '2026-06-13T00:00:00Z',
                answers: {
                    'q-1': 'essay answer text',
                },
                evaluations: {},
                rubric: mockLegacyRubric,
            },
            questions: [
                {
                    id: 'q-1',
                    examId: 'exam-id',
                    type: 'ESSAY',
                    points: 20,
                    orderIndex: 0,
                    content: {
                        prompt: 'Explain polymorphism.',
                    },
                },
            ],
        };

        vi.mocked(getGradingAttemptDetail).mockResolvedValue(attemptDetail);

        const { result } = renderHook(
            () => useGradingAttempt({ examId: 'exam-id', attemptId: 'attempt-id' }),
            {
                wrapper: createWrapper(),
            },
        );

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        // Modify a rubric score
        act(() => {
            result.current.handleScoreChange('q-1', 'contentSubstance', 2);
        });

        // contentSubstance score drops to 2 from 4.
        expect(result.current.evaluations['q-1'].scores.contentSubstance).toBe(2);

        // Update feedback
        act(() => {
            result.current.handleFeedbackChange('q-1', 'Needs improvement');
            result.current.setOverallFeedback('Decent attempt overall');
        });

        expect(result.current.evaluations['q-1'].feedback).toBe('Needs improvement');
        expect(result.current.overallFeedback).toBe('Decent attempt overall');
    });

    it('calls update mutation when handleSubmit is called', async () => {
        const attemptDetail = {
            attempt: {
                id: 'attempt-id',
                examId: 'exam-id',
                studentName: 'Alice Student',
                studentNumber: '2026-0001',
                examTitle: 'Final Exam',
                subjectTitle: 'Computer Science',
                totalScore: 100,
                status: 'SUBMITTED',
                completedAt: '2026-06-13T00:00:00Z',
                answers: {
                    'q-1': 'essay answer text',
                },
                evaluations: {},
                rubric: mockLegacyRubric,
            },
            questions: [
                {
                    id: 'q-1',
                    examId: 'exam-id',
                    type: 'ESSAY',
                    points: 20,
                    orderIndex: 0,
                    content: {
                        prompt: 'Explain polymorphism.',
                    },
                },
            ],
        };

        vi.mocked(getGradingAttemptDetail).mockResolvedValue(attemptDetail);
        vi.mocked(updateGradingAttempt).mockResolvedValue({
            attemptId: 'attempt-id',
            score: 18,
            totalScore: 20,
        });

        const { result } = renderHook(
            () => useGradingAttempt({ examId: 'exam-id', attemptId: 'attempt-id' }),
            {
                wrapper: createWrapper(),
            },
        );

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        act(() => {
            result.current.handleSubmit(false);
        });

        await waitFor(() => {
            expect(updateGradingAttempt).toHaveBeenCalledWith(mockApiClient, 'attempt-id', {
                evaluations: {
                    'q-1': {
                        scores: {
                            contentSubstance: 4,
                            structureOrganization: 4,
                            argumentationSupport: 4,
                            styleTone: 4,
                            grammarConventions: 4,
                        },
                        feedback: null,
                    },
                },
                feedback: null,
                finalize: false,
            });
        });
    });

    it('initializes grading states and calculates scores correctly with a custom rubric', async () => {
        const customRubric = {
            id: 'custom-rubric-v2',
            versionNumber: 2,
            source: 'EXAM_OVERRIDE' as const,
            definition: {
                criteria: [
                    {
                        key: 'creativity',
                        name: 'Creativity & Originality',
                        weight: 0.6,
                        description: 'How creative is the essay?',
                        levels: {
                            '0': 'L0',
                            '1': 'L1',
                            '2': 'L2',
                            '3': 'L3',
                            '4': 'L4',
                        },
                    },
                    {
                        key: 'depth',
                        name: 'Technical Depth',
                        weight: 0.4,
                        description: 'Technical accuracy and depth.',
                        levels: {
                            '0': 'L0',
                            '1': 'L1',
                            '2': 'L2',
                            '3': 'L3',
                            '4': 'L4',
                        },
                    },
                ],
            },
            updatedAt: null,
        };

        const attemptDetail = {
            attempt: {
                id: 'attempt-id',
                examId: 'exam-id',
                studentName: 'Alice Student',
                studentNumber: '2026-0001',
                examTitle: 'Final Exam',
                subjectTitle: 'Computer Science',
                totalScore: 100,
                status: 'SUBMITTED',
                completedAt: '2026-06-13T00:00:00Z',
                answers: {
                    'q-1': 'essay answer text',
                },
                evaluations: {},
                rubric: customRubric,
            },
            questions: [
                {
                    id: 'q-1',
                    examId: 'exam-id',
                    type: 'ESSAY',
                    points: 20,
                    orderIndex: 0,
                    content: {
                        prompt: 'Explain polymorphism.',
                    },
                },
            ],
        };

        vi.mocked(getGradingAttemptDetail).mockResolvedValue(attemptDetail);

        const { result } = renderHook(
            () => useGradingAttempt({ examId: 'exam-id', attemptId: 'attempt-id' }),
            {
                wrapper: createWrapper(),
            },
        );

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        // Verify initial evaluations setup uses custom criteria keys
        expect(result.current.evaluations['q-1'].scores).toEqual({
            creativity: 4,
            depth: 4,
        });

        // creativity: 2 (2 * 0.6 = 1.2), depth: 4 (4 * 0.4 = 1.6) -> weightedSum = 2.8.
        // rawScore = (2.8 / 4) * 20 = 14 pts
        act(() => {
            result.current.handleScoreChange('q-1', 'creativity', 2);
        });

        expect(result.current.scoreSummary.essayScore).toBe(14);
    });
});
