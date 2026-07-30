// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { ExamQuestion } from '@sentinel/shared/types';

vi.mock('@sentinel/ui', async () => {
    const actual = await vi.importActual<typeof import('@sentinel/ui')>('@sentinel/ui');

    return {
        ...actual,
        PassageEditor: ({
            value,
            onChange,
            placeholder,
        }: {
            value: string;
            onChange: (value: string) => void;
            placeholder?: string;
        }) => (
            <textarea
                aria-label="Passage HTML editor"
                placeholder={placeholder}
                value={value}
                onChange={(event) => onChange(event.target.value)}
            />
        ),
    };
});

vi.mock('@/data/api/client', () => ({
    apiClient: {},
}));

vi.mock('@sentinel/services', () => ({
    uploadPassageImage: vi.fn(),
}));

vi.mock('@/features/exams/builder/_components/question-forms', () => ({
    MultipleChoiceForm: () => <div data-testid="multiple-choice-form" />,
    TrueFalseForm: () => <div data-testid="true-false-form" />,
    IdentificationForm: () => <div data-testid="identification-form" />,
    MatchingForm: () => <div data-testid="matching-form" />,
    FillBlankForm: () => <div data-testid="fill-blank-form" />,
    EssayForm: () => <div data-testid="essay-form" />,
}));

let QuestionBuilderForm: typeof import('./question-builder-form').QuestionBuilderForm;

beforeAll(async () => {
    ({ QuestionBuilderForm } = await import('./question-builder-form'));
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

function createQuestion(): ExamQuestion {
    return {
        id: 'question-1',
        subjectId: null,
        institutionId: null,
        sourceOrigin: 'MANUAL',
        sourceFileName: null,
        sourcePageNumber: null,
        sourceEvidence: null,
        passageContent: 'Existing passage',
        passageType: 'plain',
        type: 'MULTIPLE_CHOICE',
        difficulty: 'MODERATE',
        points: 1,
        tags: ['algebra'],
        content: {
            prompt: 'What is 2 + 2?',
            options: ['3', '4'],
            correctAnswer: '4',
        },
        prompt: 'What is 2 + 2?',
        createdAt: null,
        updatedAt: null,
        createdBy: null,
        updatedBy: null,
        status: 'ACTIVE',
    } as ExamQuestion;
}

describe('QuestionBuilderForm', () => {
    it('renders builder mode controls and passage content', () => {
        render(
            <QuestionBuilderForm
                type="MULTIPLE_CHOICE"
                initialData={createQuestion()}
                questionTypeDefinition={{
                    label: 'Multiple Choice',
                    description: 'Select one correct option among choices.',
                }}
                builderMode
                onBack={vi.fn()}
                onCreate={vi.fn()}
                onUpdate={vi.fn()}
                onDuplicate={vi.fn()}
            />,
        );

        expect(screen.getByRole('heading', { name: 'Multiple Choice' })).toBeTruthy();
        expect(screen.getByRole('button', { name: /cancel/i })).toBeTruthy();
        expect(screen.getByRole('button', { name: /duplicate/i })).toBeTruthy();
        expect(screen.getByRole('button', { name: /save changes/i })).toBeTruthy();
        expect(screen.getByPlaceholderText('Write the passage text here...')).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: /preview passage/i }));
        const previewDialog = screen.getByRole('dialog');

        expect(previewDialog).toBeTruthy();
        expect(within(previewDialog).getByText('Passage Preview')).toBeTruthy();
        expect(within(previewDialog).getByText('Existing passage')).toBeTruthy();
    });

    it('submits normalized passage payloads when saving', () => {
        const onUpdate = vi.fn();

        render(
            <QuestionBuilderForm
                type="MULTIPLE_CHOICE"
                initialData={createQuestion()}
                questionTypeDefinition={{
                    label: 'Multiple Choice',
                    description: 'Select one correct option among choices.',
                }}
                builderMode
                onBack={vi.fn()}
                onCreate={vi.fn()}
                onUpdate={onUpdate}
                onDuplicate={vi.fn()}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

        expect(onUpdate).toHaveBeenCalledWith('question-1', {
            type: 'MULTIPLE_CHOICE',
            content: {
                prompt: 'What is 2 + 2?',
                options: ['3', '4'],
                correctAnswer: '4',
            },
            difficulty: 'MODERATE',
            points: 1,
            tags: ['algebra'],
            passageContent: 'Existing passage',
            passageType: 'plain',
        });
    });

    it('proves evidence does NOT populate empty passage content under new policy', () => {
        const questionWithEvidenceOnly = {
            ...createQuestion(),
            sourceOrigin: 'AI_PDF',
            sourceFileName: 'algebra.pdf',
            sourcePageNumber: 2,
            sourceEvidence: 'Leaked evidence text',
            passageContent: null,
        } as unknown as ExamQuestion;

        render(
            <QuestionBuilderForm
                type="MULTIPLE_CHOICE"
                initialData={questionWithEvidenceOnly}
                questionTypeDefinition={{
                    label: 'Multiple Choice',
                    description: 'Select one correct option among choices.',
                }}
                builderMode
                onBack={vi.fn()}
                onCreate={vi.fn()}
                onUpdate={vi.fn()}
                onDuplicate={vi.fn()}
            />,
        );

        const toggleButton = screen.getByRole('button', { name: 'Add passage' });
        fireEvent.click(toggleButton);

        const textarea = screen.getByPlaceholderText(
            'Write the passage text here...',
        ) as HTMLTextAreaElement;
        expect(textarea.value).toBe('');
    });
});
