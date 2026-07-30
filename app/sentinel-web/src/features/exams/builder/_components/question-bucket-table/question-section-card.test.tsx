import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QuestionSectionCard } from './question-section-card';

afterEach(() => {
    cleanup();
});

const mockQuestionTypes = [
    {
        value: 'MULTIPLE_CHOICE',
        label: 'Multiple Choice',
        description: 'Single correct answer from choices.',
        instruction:
            'Read each question carefully. Choose the one best answer from the options provided.',
        defaultContent: {},
    },
    {
        value: 'TRUE_FALSE',
        label: 'True or False',
        description: 'True or false statements.',
        instruction:
            'Read each statement carefully. Indicate whether each statement is true or false.',
        defaultContent: {},
    },
] as any[];

describe('QuestionSectionCard', () => {
    it('renders the question type dropdown and displays the read-only generated instruction', () => {
        const handleQuestionTypeChange = vi.fn();

        render(
            <QuestionSectionCard
                section={{
                    id: 'section-1',
                    title: 'Multiple Choice',
                    description:
                        'Read each question carefully. Choose the one best answer from the options provided.',
                    questionType: 'MULTIPLE_CHOICE',
                    orderIndex: 0,
                    isCollapsed: false,
                }}
                questionTypes={mockQuestionTypes}
                canChangeQuestionType={true}
                onSectionQuestionTypeChange={handleQuestionTypeChange}
                questionCount={0}
                totalPoints={0}
                isSectionDragging={false}
                isSectionDropTarget={false}
                onSectionDragStart={vi.fn()}
                onSectionDragEnter={vi.fn()}
                onSectionDragOver={vi.fn()}
                onSectionDrop={vi.fn()}
                onSectionDragEnd={vi.fn()}
                onToggleCollapse={vi.fn()}
                onImportQuestions={vi.fn()}
                onAddQuestion={vi.fn()}
            />,
        );

        // Check that the title and instruction are displayed
        expect(screen.getAllByText('Multiple Choice').length).toBeGreaterThan(0);
        expect(
            screen.getByText(
                'Read each question carefully. Choose the one best answer from the options provided.',
            ),
        ).toBeTruthy();
        
        // Assert there is no edit button/pencil or manual title textbox
        expect(screen.queryByRole('textbox')).toBeNull();
        expect(screen.queryByRole('button', { name: /add instruction/i })).toBeNull();
    });

    it('renders placeholder select when questionType is null/untyped', () => {
        render(
            <QuestionSectionCard
                section={{
                    id: 'section-1',
                    title: 'Select question type',
                    description: null,
                    questionType: null,
                    orderIndex: 0,
                    isCollapsed: false,
                }}
                questionTypes={mockQuestionTypes}
                canChangeQuestionType={true}
                onSectionQuestionTypeChange={vi.fn()}
                questionCount={0}
                totalPoints={0}
                isSectionDragging={false}
                isSectionDropTarget={false}
                onSectionDragStart={vi.fn()}
                onSectionDragEnter={vi.fn()}
                onSectionDragOver={vi.fn()}
                onSectionDrop={vi.fn()}
                onSectionDragEnd={vi.fn()}
                onToggleCollapse={vi.fn()}
                onImportQuestions={vi.fn()}
                onAddQuestion={vi.fn()}
            />,
        );

        // Should render select placeholder or select element
        expect(screen.getByRole('combobox')).toBeTruthy();
    });

    it('disables the dropdown and shows helper text when section contains questions', () => {
        render(
            <QuestionSectionCard
                section={{
                    id: 'section-1',
                    title: 'Multiple Choice',
                    description:
                        'Read each question carefully. Choose the one best answer from the options provided.',
                    questionType: 'MULTIPLE_CHOICE',
                    orderIndex: 0,
                    isCollapsed: false,
                }}
                questionTypes={mockQuestionTypes}
                canChangeQuestionType={false}
                onSectionQuestionTypeChange={vi.fn()}
                questionCount={3}
                totalPoints={15}
                isSectionDragging={false}
                isSectionDropTarget={false}
                onSectionDragStart={vi.fn()}
                onSectionDragEnter={vi.fn()}
                onSectionDragOver={vi.fn()}
                onSectionDrop={vi.fn()}
                onSectionDragEnd={vi.fn()}
                onToggleCollapse={vi.fn()}
                onImportQuestions={vi.fn()}
                onAddQuestion={vi.fn()}
            />,
        );

        const selectElement = screen.getByRole('combobox') as HTMLSelectElement;
        expect(selectElement.disabled).toBe(true);
        expect(screen.getByText(/remove all questions/i)).toBeTruthy();
    });
});
