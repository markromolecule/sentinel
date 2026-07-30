import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useQuestionManagement } from './use-question-management';
import { useExamStore } from '@/features/exams/builder/_stores/use-exam-store';
import { toast } from 'sonner';
import { useCreateQuestionMutation, useValidateQuestionTypeContentMutation } from '@sentinel/hooks';

vi.mock('@sentinel/hooks', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@sentinel/hooks')>();
    return {
        ...actual,
        useCreateQuestionMutation: vi.fn(() => ({
            mutateAsync: vi.fn(),
            isPending: false,
        })),
        useValidateQuestionTypeContentMutation: vi.fn(() => ({
            mutateAsync: vi.fn((args: any) => Promise.resolve({ content: args.content })),
        })),
    };
});

vi.mock('sonner', () => ({
    toast: {
        error: vi.fn(),
        success: vi.fn(),
    },
}));

describe('useQuestionManagement', () => {
    const setActiveQuestionType = vi.fn();
    const setEditingQuestion = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        // Reset store
        useExamStore.setState({
            questionSections: [
                {
                    id: 'section-mc',
                    title: 'Multiple Choice Part',
                    description: 'Select the best answer.',
                    orderIndex: 0,
                    questionType: 'MULTIPLE_CHOICE',
                },
                {
                    id: 'section-untyped',
                    title: 'Section 2',
                    description: null,
                    orderIndex: 1,
                    questionType: null,
                },
            ],
            questions: [],
        });
    });

    it('allows question creation in a compatible typed section', async () => {
        const { result } = renderHook(() =>
            useQuestionManagement({
                id: 'exam-1',
                questionSections: useExamStore.getState().questionSections,
                questions: useExamStore.getState().questions,
                setActiveQuestionType,
                setEditingQuestion,
            }),
        );

        await act(async () => {
            await result.current.handleCreateQuestion(
                {
                    type: 'MULTIPLE_CHOICE',
                    difficulty: 'EASY',
                    points: 1,
                    content: { prompt: 'Q1', options: ['A', 'B'], correctAnswer: 'A' },
                },
                'section-mc',
            );
        });

        expect(useExamStore.getState().questions).toHaveLength(1);
        expect(useExamStore.getState().questions[0]?.sectionId).toBe('section-mc');
        expect(toast.success).toHaveBeenCalledWith('Question created!');
    });

    it('blocks question creation in an incompatible typed section', async () => {
        const { result } = renderHook(() =>
            useQuestionManagement({
                id: 'exam-1',
                questionSections: useExamStore.getState().questionSections,
                questions: useExamStore.getState().questions,
                setActiveQuestionType,
                setEditingQuestion,
            }),
        );

        await act(async () => {
            await result.current.handleCreateQuestion(
                {
                    type: 'TRUE_FALSE',
                    difficulty: 'EASY',
                    points: 1,
                    content: { prompt: 'Q1', correctAnswer: true },
                },
                'section-mc',
            );
        });

        expect(useExamStore.getState().questions).toHaveLength(0);
        expect(toast.error).toHaveBeenCalledWith(
            'Cannot add question. This section only accepts MULTIPLE CHOICE questions.',
        );
    });

    it('blocks question creation in an empty untyped section', async () => {
        const { result } = renderHook(() =>
            useQuestionManagement({
                id: 'exam-1',
                questionSections: useExamStore.getState().questionSections,
                questions: useExamStore.getState().questions,
                setActiveQuestionType,
                setEditingQuestion,
            }),
        );

        await act(async () => {
            await result.current.handleCreateQuestion(
                {
                    type: 'MULTIPLE_CHOICE',
                    difficulty: 'EASY',
                    points: 1,
                    content: { prompt: 'Q1', options: ['A', 'B'], correctAnswer: 'A' },
                },
                'section-untyped',
            );
        });

        expect(useExamStore.getState().questions).toHaveLength(0);
        expect(toast.error).toHaveBeenCalledWith(
            'Please select a question type for this section before adding questions.',
        );
    });

    it('allows question creation in a legacy mixed non-empty untyped section', async () => {
        // Hydrate store with a question already in the untyped section to make it "legacy mixed"
        useExamStore.setState({
            questionSections: [
                {
                    id: 'section-untyped',
                    title: 'Legacy Section',
                    description: null,
                    orderIndex: 0,
                    questionType: null,
                },
            ],
            questions: [
                {
                    id: 'existing-1',
                    examId: 'exam-1',
                    type: 'TRUE_FALSE',
                    difficulty: 'EASY',
                    points: 1,
                    orderIndex: 0,
                    sectionId: 'section-untyped',
                    content: { prompt: 'existing', correctAnswer: true },
                    tags: [],
                },
            ],
        });

        const { result } = renderHook(() =>
            useQuestionManagement({
                id: 'exam-1',
                questionSections: useExamStore.getState().questionSections,
                questions: useExamStore.getState().questions,
                setActiveQuestionType,
                setEditingQuestion,
            }),
        );

        await act(async () => {
            await result.current.handleCreateQuestion(
                {
                    type: 'MULTIPLE_CHOICE',
                    difficulty: 'EASY',
                    points: 1,
                    content: { prompt: 'Q1', options: ['A', 'B'], correctAnswer: 'A' },
                },
                'section-untyped',
            );
        });

        expect(useExamStore.getState().questions).toHaveLength(2);
        expect(toast.success).toHaveBeenCalledWith('Question created!');
    });

    it('rejects batch import entirely if any question is incompatible', () => {
        const { result } = renderHook(() =>
            useQuestionManagement({
                id: 'exam-1',
                questionSections: useExamStore.getState().questionSections,
                questions: useExamStore.getState().questions,
                setActiveQuestionType,
                setEditingQuestion,
            }),
        );

        const newQuestions = [
            {
                id: 'q-mc',
                examId: 'exam-1',
                type: 'MULTIPLE_CHOICE' as const,
                difficulty: 'EASY' as const,
                points: 1,
                orderIndex: 0,
                sectionId: 'section-mc',
                content: {} as any,
                tags: [],
            },
            {
                id: 'q-tf',
                examId: 'exam-1',
                type: 'TRUE_FALSE' as const,
                difficulty: 'EASY' as const,
                points: 1,
                orderIndex: 1,
                sectionId: 'section-mc',
                content: {} as any,
                tags: [],
            },
        ];

        act(() => {
            result.current.handleImportQuestions(newQuestions, 'section-mc');
        });

        // The entire batch must be rejected (no partial mutations)
        expect(useExamStore.getState().questions).toHaveLength(0);
        expect(toast.error).toHaveBeenCalledWith(
            'Cannot add question. This section only accepts MULTIPLE CHOICE questions.',
        );
    });
});
