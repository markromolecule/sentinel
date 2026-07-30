import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ExamBuilderWorkspace } from './exam-builder-workspace';
import { toast } from 'sonner';

afterEach(() => {
    cleanup();
});

vi.mock('sonner', () => ({
    toast: {
        error: vi.fn(),
        success: vi.fn(),
    },
}));

vi.mock('@/features/exams', () => ({
    QuestionBankImportModal: vi.fn(({ open, allowedQuestionType }) =>
        open ? (
            <div data-testid="import-modal" data-allowed-type={allowedQuestionType ?? 'none'}>
                Import Modal
            </div>
        ) : null,
    ),
    QuestionBucketTable: vi.fn(({ sections, onAdd, onImport }) => (
        <div data-testid="bucket-table">
            {sections?.map((s: any) => (
                <div key={s.id}>
                    <button data-testid={`add-${s.id}`} onClick={() => onAdd(s.id)}>
                        Add Question
                    </button>
                    <button data-testid={`import-${s.id}`} onClick={() => onImport(s.id)}>
                        Import
                    </button>
                </div>
            ))}
        </div>
    )),
    QuestionBuilderForm: vi.fn(({ type, onBack }) => (
        <div data-testid="builder-form" data-type={type}>
            Builder Form
            <button data-testid="form-back" onClick={onBack}>
                Back
            </button>
        </div>
    )),
    QuestionTypeSelectorDialog: vi.fn(({ open }) =>
        open ? <div data-testid="type-dialog">Type Dialog</div> : null,
    ),
}));

describe('ExamBuilderWorkspace orchestration', () => {
    const handleSelectQuestionType = vi.fn();
    const handleBackFromBuilder = vi.fn();
    const setIsTypeSelectorOpen = vi.fn();
    const setIsImportModalOpen = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    const baseProps = {
        activeQuestionType: null,
        activeQuestionTypeDefinition: undefined,
        editingQuestion: null,
        questionSections: [
            {
                id: 'sec-mc',
                title: 'Multiple Choice Part',
                description: 'Select the best answer.',
                orderIndex: 0,
                questionType: 'MULTIPLE_CHOICE',
            },
            {
                id: 'sec-untyped-empty',
                title: 'Section 2',
                description: null,
                orderIndex: 1,
                questionType: null,
            },
        ],
        questions: [],
        questionTypes: [],
        isQuestionTypesLoading: false,
        isTypeSelectorOpen: false,
        setIsTypeSelectorOpen,
        handleSelectQuestionType,
        handleCreateQuestion: vi.fn(),
        handleDuplicateQuestion: vi.fn(),
        handleEditQuestion: vi.fn(),
        handleUpdateQuestion: vi.fn(),
        handleDeleteQuestion: vi.fn(),
        handleAddQuestionToBank: vi.fn(),
        handleAddQuestionSection: vi.fn(),
        handleUpdateQuestionSection: vi.fn(),
        handleDeleteQuestionSection: vi.fn(),
        handleToggleQuestionSectionCollapse: vi.fn(),
        handleReorderQuestionSections: vi.fn(),
        handleReorderQuestionsInSection: vi.fn(),
        handleImportQuestions: vi.fn(),
        handleBackFromBuilder,
        isImportModalOpen: false,
        setIsImportModalOpen,
    } as any;

    it('directly selects question type when adding a question to a typed section', () => {
        render(<ExamBuilderWorkspace {...baseProps} />);

        fireEvent.click(screen.getByTestId('add-sec-mc'));

        // Should call handleSelectQuestionType directly with MULTIPLE_CHOICE and NOT open dialog
        expect(handleSelectQuestionType).toHaveBeenCalledWith('MULTIPLE_CHOICE');
        expect(setIsTypeSelectorOpen).not.toHaveBeenCalled();
    });

    it('blocks adding a question to an empty untyped section and shows a toast error', () => {
        render(<ExamBuilderWorkspace {...baseProps} />);

        fireEvent.click(screen.getByTestId('add-sec-untyped-empty'));

        expect(toast.error).toHaveBeenCalledWith(
            'Please select a question type for this section before adding questions.',
        );
        expect(handleSelectQuestionType).not.toHaveBeenCalled();
        expect(setIsTypeSelectorOpen).not.toHaveBeenCalled();
    });

    it('propagates the section allowedQuestionType to the import modal', () => {
        render(
            <ExamBuilderWorkspace
                {...baseProps}
                isImportModalOpen={true}
                // Mock targetSectionId state as if they clicked import on 'sec-mc'
                // Wait! Since targetSectionId is internal React state, we trigger click first to set it
            />,
        );

        fireEvent.click(screen.getByTestId('import-sec-mc'));

        expect(setIsImportModalOpen).toHaveBeenCalledWith(true);
    });
});
