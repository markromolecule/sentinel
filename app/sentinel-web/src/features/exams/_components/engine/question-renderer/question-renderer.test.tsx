import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FillBlankQuestion } from './_components/fill-blank-question';
import { MatchingQuestion } from './_components/matching-question';
import { EnumerationQuestion } from './_components/enumeration-question';
import { MultipleChoiceQuestion } from './_components/multiple-choice-question';
import { MultipleResponseQuestion } from './_components/multiple-response-question';
import { TrueFalseQuestion } from './_components/true-false-question';
import { IdentificationQuestion } from './_components/identification-question';
import { EssayQuestion } from './_components/essay-question';
import type { ExamQuestion } from '@sentinel/shared';

vi.mock('@sentinel/ui', () => ({
    Input: (props: any) => <input {...props} data-testid="mock-input" />,
    Textarea: (props: any) => <textarea {...props} data-testid="mock-textarea" />,
    Button: (props: any) => <button {...props} />,
    cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

describe('Question Renderers', () => {
    afterEach(() => {
        cleanup();
    });

    describe('FillBlankQuestion', () => {
        const question: ExamQuestion = {
            id: 'q-fb',
            examId: 'exam-1',
            type: 'FILL_BLANK',
            points: 5,
            orderIndex: 0,
            tags: [],
            content: {
                prompt: 'Roses are [blank1], violets are [blank2].',
                blanks: ['red', 'blue'],
            },
        };

        it('renders neutral placeholders when showCorrectAnswer is false', () => {
            render(
                <FillBlankQuestion
                    question={question}
                    value={['', '']}
                    onChange={vi.fn()}
                    showCorrectAnswer={false}
                />,
            );

            const inputs = screen.getAllByTestId('mock-input');
            expect(inputs).toHaveLength(2);
            expect(inputs[0].getAttribute('placeholder')).toBe('Response 1');
            expect(inputs[1].getAttribute('placeholder')).toBe('Response 2');
            expect(screen.queryByText(/Answer key:/)).toBeNull();
        });

        it('shows answer key and correct placeholder when showCorrectAnswer is true', () => {
            render(
                <FillBlankQuestion
                    question={question}
                    value={['', '']}
                    onChange={vi.fn()}
                    showCorrectAnswer={true}
                />,
            );

            const inputs = screen.getAllByTestId('mock-input');
            expect(inputs).toHaveLength(2);
            expect(inputs[0].getAttribute('placeholder')).toBe('red');
            expect(inputs[1].getAttribute('placeholder')).toBe('blue');
            expect(screen.getAllByText(/Answer key:/)).toHaveLength(2);
        });
    });

    describe('MatchingQuestion', () => {
        const question: ExamQuestion = {
            id: 'q-m',
            examId: 'exam-1',
            type: 'MATCHING',
            points: 5,
            orderIndex: 0,
            tags: [],
            content: {
                prompt: 'Match country to capital',
                pairs: [
                    { left: 'France', right: 'Paris' },
                    { left: 'Japan', right: 'Tokyo' },
                ],
            },
        };

        it('renders neutral placeholders when showCorrectAnswer is false', () => {
            render(
                <MatchingQuestion
                    question={question}
                    value={{}}
                    onChange={vi.fn()}
                    showCorrectAnswer={false}
                />,
            );

            const inputs = screen.getAllByTestId('mock-input');
            expect(inputs).toHaveLength(2);
            expect(inputs[0].getAttribute('placeholder')).toBe('Type the matching value...');
            expect(inputs[1].getAttribute('placeholder')).toBe('Type the matching value...');
            expect(screen.queryByText(/Correct match:/)).toBeNull();
        });

        it('shows correct matches and placeholder correct values when showCorrectAnswer is true', () => {
            render(
                <MatchingQuestion
                    question={question}
                    value={{}}
                    onChange={vi.fn()}
                    showCorrectAnswer={true}
                />,
            );

            const inputs = screen.getAllByTestId('mock-input');
            expect(inputs).toHaveLength(2);
            expect(inputs[0].getAttribute('placeholder')).toBe('Paris');
            expect(inputs[1].getAttribute('placeholder')).toBe('Tokyo');
            expect(screen.getAllByText(/Correct match:/)).toHaveLength(2);
        });
    });

    describe('EnumerationQuestion', () => {
        const question: ExamQuestion = {
            id: 'q-e',
            examId: 'exam-1',
            type: 'ENUMERATION',
            points: 5,
            orderIndex: 0,
            tags: [],
            content: {
                prompt: 'Primary colors',
                acceptedAnswers: ['red', 'green', 'blue'],
            },
        };

        it('renders correct number of fields and hides accepted answers when showCorrectAnswer is false', () => {
            render(
                <EnumerationQuestion
                    question={question}
                    value={['', '', '']}
                    onChange={vi.fn()}
                    showCorrectAnswer={false}
                />,
            );

            const inputs = screen.getAllByTestId('mock-input');
            expect(inputs).toHaveLength(3);
            expect(screen.queryByText(/Accepted answer:/)).toBeNull();
        });

        it('shows accepted answers when showCorrectAnswer is true', () => {
            render(
                <EnumerationQuestion
                    question={question}
                    value={['', '', '']}
                    onChange={vi.fn()}
                    showCorrectAnswer={true}
                />,
            );

            const inputs = screen.getAllByTestId('mock-input');
            expect(inputs).toHaveLength(3);
            expect(screen.getAllByText(/Accepted answer:/)).toHaveLength(3);
        });
    });

    describe('MultipleChoiceQuestion Baseline A11y', () => {
        const question: ExamQuestion = {
            id: 'q-mc',
            examId: 'exam-1',
            type: 'MULTIPLE_CHOICE',
            points: 5,
            orderIndex: 0,
            tags: [],
            content: {
                prompt: 'Choose one option',
                options: ['Option A', 'Option B', 'Option C'],
                correctAnswer: 0,
            },
        };

        it('uses native radio button roles and groups options under fieldset/legend', () => {
            render(
                <MultipleChoiceQuestion
                    question={question}
                    value={1}
                    onChange={vi.fn()}
                    showCorrectAnswer={false}
                />,
            );

            // Verify a fieldset/legend exists for group context
            const legend = screen.getByText('Choose one option');
            expect(legend.tagName.toLowerCase()).toBe('legend');

            // Verify role="radio" is used
            const radios = screen.getAllByRole('radio');
            expect(radios).toHaveLength(3);

            // Verify accessible names match the options
            expect(screen.getByRole('radio', { name: /Option A/i })).toBeTruthy();
            expect(screen.getByRole('radio', { name: /Option B/i })).toBeTruthy();

            // Verify checked state is conveyed correctly
            const radioB = screen.getByRole('radio', { name: /Option B/i }) as HTMLInputElement;
            expect(radioB.checked).toBe(true);
        });

        it('submits the attempt-specific option token when available', () => {
            const onChange = vi.fn();

            render(
                <MultipleChoiceQuestion
                    question={{
                        ...question,
                        content: {
                            ...question.content,
                            optionTokens: ['tok-a', 'tok-b', 'tok-c'],
                        },
                    }}
                    value={'tok-b'}
                    onChange={onChange}
                    showCorrectAnswer={false}
                />,
            );

            fireEvent.click(screen.getByRole('radio', { name: /Option C/i }));

            expect(onChange).toHaveBeenCalledWith('tok-c');
        });

        it('keeps the token-backed selection checked after rerender', () => {
            const { rerender } = render(
                <MultipleChoiceQuestion
                    question={{
                        ...question,
                        content: {
                            ...question.content,
                            optionTokens: ['tok-a', 'tok-b', 'tok-c'],
                        },
                    }}
                    value={'tok-b'}
                    onChange={vi.fn()}
                    showCorrectAnswer={false}
                />,
            );

            rerender(
                <MultipleChoiceQuestion
                    question={{
                        ...question,
                        content: {
                            ...question.content,
                            optionTokens: ['tok-a', 'tok-b', 'tok-c'],
                        },
                    }}
                    value={'tok-b'}
                    onChange={vi.fn()}
                    showCorrectAnswer={false}
                />,
            );

            const radioB = screen.getByRole('radio', { name: /Option B/i }) as HTMLInputElement;
            expect(radioB.checked).toBe(true);
        });
    });

    describe('MultipleResponseQuestion Baseline A11y', () => {
        const question: ExamQuestion = {
            id: 'q-mr',
            examId: 'exam-1',
            type: 'MULTIPLE_RESPONSE',
            points: 5,
            orderIndex: 0,
            tags: [],
            content: {
                prompt: 'Choose multiple options',
                options: ['Choice X', 'Choice Y', 'Choice Z'],
                correctAnswer: [0, 2],
            },
        };

        it('uses checkbox roles and groups options', () => {
            render(
                <MultipleResponseQuestion
                    question={question}
                    value={[0, 2]}
                    onChange={vi.fn()}
                    showCorrectAnswer={false}
                />,
            );

            const checkboxes = screen.getAllByRole('checkbox');
            expect(checkboxes).toHaveLength(3);

            const checkX = screen.getByRole('checkbox', { name: /Choice X/i }) as HTMLInputElement;
            const checkY = screen.getByRole('checkbox', { name: /Choice Y/i }) as HTMLInputElement;
            const checkZ = screen.getByRole('checkbox', { name: /Choice Z/i }) as HTMLInputElement;

            expect(checkX.checked).toBe(true);
            expect(checkY.checked).toBe(false);
            expect(checkZ.checked).toBe(true);
        });

        it('submits and retains attempt-specific option tokens when toggling selections', () => {
            const onChange = vi.fn();

            render(
                <MultipleResponseQuestion
                    question={{
                        ...question,
                        content: {
                            ...question.content,
                            optionTokens: ['mr-a', 'mr-b', 'mr-c'],
                        },
                    }}
                    value={['mr-a', 'mr-c']}
                    onChange={onChange}
                    showCorrectAnswer={false}
                />,
            );

            fireEvent.click(screen.getByRole('checkbox', { name: /Choice Y/i }));

            expect(onChange).toHaveBeenCalledWith(['mr-a', 'mr-c', 'mr-b']);
        });

        it('keeps token-backed checkbox selections checked after rerender', () => {
            const { rerender } = render(
                <MultipleResponseQuestion
                    question={{
                        ...question,
                        content: {
                            ...question.content,
                            optionTokens: ['mr-a', 'mr-b', 'mr-c'],
                        },
                    }}
                    value={['mr-a', 'mr-c']}
                    onChange={vi.fn()}
                    showCorrectAnswer={false}
                />,
            );

            rerender(
                <MultipleResponseQuestion
                    question={{
                        ...question,
                        content: {
                            ...question.content,
                            optionTokens: ['mr-a', 'mr-b', 'mr-c'],
                        },
                    }}
                    value={['mr-a', 'mr-c']}
                    onChange={vi.fn()}
                    showCorrectAnswer={false}
                />,
            );

            const checkX = screen.getByRole('checkbox', { name: /Choice X/i }) as HTMLInputElement;
            const checkZ = screen.getByRole('checkbox', { name: /Choice Z/i }) as HTMLInputElement;

            expect(checkX.checked).toBe(true);
            expect(checkZ.checked).toBe(true);
        });
    });

    describe('TrueFalseQuestion Baseline A11y', () => {
        const question: ExamQuestion = {
            id: 'q-tf',
            examId: 'exam-1',
            type: 'TRUE_FALSE',
            points: 5,
            orderIndex: 0,
            tags: [],
            content: {
                prompt: 'Is this statement true?',
                correctAnswer: true,
            },
        };

        it('uses radio button roles for True/False options', () => {
            render(
                <TrueFalseQuestion
                    question={question}
                    value={false}
                    onChange={vi.fn()}
                    showCorrectAnswer={false}
                />,
            );

            const radios = screen.getAllByRole('radio');
            expect(radios).toHaveLength(2);

            const radioTrue = screen.getByRole('radio', { name: /True/i }) as HTMLInputElement;
            const radioFalse = screen.getByRole('radio', { name: /False/i }) as HTMLInputElement;

            expect(radioTrue.checked).toBe(false);
            expect(radioFalse.checked).toBe(true);
        });
    });

    describe('IdentificationQuestion Baseline A11y', () => {
        const question: ExamQuestion = {
            id: 'q-id',
            examId: 'exam-1',
            type: 'IDENTIFICATION',
            points: 5,
            orderIndex: 0,
            tags: [],
            content: {
                prompt: 'Identify the capital of Japan',
                correctAnswer: 'Tokyo',
            },
        };

        it('associates input with a persistent accessible label', () => {
            render(
                <IdentificationQuestion
                    question={question}
                    value=""
                    onChange={vi.fn()}
                    showCorrectAnswer={false}
                />,
            );

            // We should be able to query the input by its label/prompt name
            const input = screen.getByLabelText('Identify the capital of Japan');
            expect(input).toBeTruthy();
        });
    });

    describe('EssayQuestion Baseline A11y', () => {
        const question: ExamQuestion = {
            id: 'q-es',
            examId: 'exam-1',
            type: 'ESSAY',
            points: 10,
            orderIndex: 0,
            tags: [],
            content: {
                prompt: 'Write about photosynthesis',
            },
        };

        it('associates textarea with a persistent accessible label', () => {
            render(
                <EssayQuestion
                    question={question}
                    value=""
                    onChange={vi.fn()}
                    showCorrectAnswer={false}
                />,
            );

            const textarea = screen.getByLabelText('Write about photosynthesis');
            expect(textarea).toBeTruthy();
        });
    });

    describe('EnumerationQuestion Baseline A11y', () => {
        const question: ExamQuestion = {
            id: 'q-en',
            examId: 'exam-1',
            type: 'ENUMERATION',
            points: 5,
            orderIndex: 0,
            tags: [],
            content: {
                prompt: 'List three colors',
                acceptedAnswers: ['red', 'green', 'blue'],
            },
        };

        it('associates each item input with its specific item number label', () => {
            render(
                <EnumerationQuestion
                    question={question}
                    value={['', '', '']}
                    onChange={vi.fn()}
                    showCorrectAnswer={false}
                />,
            );

            // Each input must be queryable by a label indicating its index/purpose
            expect(screen.getByLabelText('List three colors - Item 1')).toBeTruthy();
            expect(screen.getByLabelText('List three colors - Item 2')).toBeTruthy();
            expect(screen.getByLabelText('List three colors - Item 3')).toBeTruthy();
        });
    });
});
