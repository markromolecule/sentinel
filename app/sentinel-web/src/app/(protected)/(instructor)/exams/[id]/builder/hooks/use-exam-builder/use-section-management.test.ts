import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSectionManagement } from './use-section-management';
import { useExamStore } from '@/features/exams/builder/_stores/use-exam-store';
import { toast } from 'sonner';

vi.mock('sonner', () => ({
    toast: {
        error: vi.fn(),
        success: vi.fn(),
    },
}));

describe('useSectionManagement', () => {
    const questionTypes = [
        {
            value: 'MULTIPLE_CHOICE',
            label: 'Multiple Choice',
            instruction:
                'Read each question carefully. Choose the one best answer from the options provided.',
        },
        {
            value: 'TRUE_FALSE',
            label: 'True or False',
            instruction:
                'Read each statement carefully. Indicate whether each statement is true or false.',
        },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        // Reset store with mock data
        useExamStore.setState({
            questionSections: [
                {
                    id: 'section-1',
                    title: 'Section 1',
                    description: null,
                    orderIndex: 0,
                    questionType: null,
                },
            ],
            questions: [],
        });
    });

    it('updates a section questionType, title, and instruction atomically on valid empty selection', () => {
        const { result } = renderHook(() =>
            useSectionManagement({
                questionSections: useExamStore.getState().questionSections,
                questions: useExamStore.getState().questions,
                questionTypes,
            }),
        );

        act(() => {
            result.current.handleUpdateQuestionSection('section-1', {
                questionType: 'MULTIPLE_CHOICE',
            });
        });

        const updated = useExamStore.getState().questionSections[0];
        expect(updated?.questionType).toBe('MULTIPLE_CHOICE');
        expect(updated?.title).toBe('Multiple Choice');
        expect(updated?.description).toBe(
            'Read each question carefully. Choose the one best answer from the options provided.',
        );
        expect(toast.error).not.toHaveBeenCalled();
    });

    it('blocks questionType change and shows toast if section contains mismatched questions', () => {
        const questionsWithChoice = [
            {
                id: 'question-1',
                examId: 'exam-1',
                type: 'MULTIPLE_CHOICE' as const,
                difficulty: 'EASY' as const,
                points: 1,
                orderIndex: 0,
                sectionId: 'section-1',
                content: {} as any,
                tags: [],
            },
        ];

        // Place a MULTIPLE_CHOICE question in the section
        useExamStore.setState({
            questionSections: [
                {
                    id: 'section-1',
                    title: 'Multiple Choice Part',
                    description: 'Select the best answer.',
                    orderIndex: 0,
                    questionType: 'MULTIPLE_CHOICE',
                },
            ],
            questions: questionsWithChoice,
        });

        const { result } = renderHook(() =>
            useSectionManagement({
                questionSections: useExamStore.getState().questionSections,
                questions: useExamStore.getState().questions,
                questionTypes,
            }),
        );

        // Try to change type to TRUE_FALSE
        act(() => {
            result.current.handleUpdateQuestionSection('section-1', {
                questionType: 'TRUE_FALSE',
            });
        });

        // Store remains unchanged
        const section = useExamStore.getState().questionSections[0];
        expect(section?.questionType).toBe('MULTIPLE_CHOICE');
        expect(section?.title).toBe('Multiple Choice Part');
        expect(toast.error).toHaveBeenCalledWith(
            'Cannot change section type. Existing questions in this section do not match the selected type.',
        );
    });

    it('allows changing typed section back to untyped null', () => {
        useExamStore.setState({
            questionSections: [
                {
                    id: 'section-1',
                    title: 'Multiple Choice Part',
                    description: 'Select the best answer.',
                    orderIndex: 0,
                    questionType: 'MULTIPLE_CHOICE',
                },
            ],
            questions: [],
        });

        const { result } = renderHook(() =>
            useSectionManagement({
                questionSections: useExamStore.getState().questionSections,
                questions: useExamStore.getState().questions,
                questionTypes,
            }),
        );

        act(() => {
            result.current.handleUpdateQuestionSection('section-1', {
                questionType: null,
            });
        });

        const section = useExamStore.getState().questionSections[0];
        expect(section?.questionType).toBeNull();
        expect(toast.error).not.toHaveBeenCalled();
    });

    it('falls back gracefully on unknown catalog values by keeping newType only', () => {
        const { result } = renderHook(() =>
            useSectionManagement({
                questionSections: useExamStore.getState().questionSections,
                questions: useExamStore.getState().questions,
                questionTypes,
            }),
        );

        act(() => {
            result.current.handleUpdateQuestionSection('section-1', {
                questionType: 'UNKNOWN_TYPE' as any,
            });
        });

        const section = useExamStore.getState().questionSections[0];
        expect(section?.questionType).toBe('UNKNOWN_TYPE');
        expect(section?.title).toBe('Section 1'); // remains unchanged
    });
});
