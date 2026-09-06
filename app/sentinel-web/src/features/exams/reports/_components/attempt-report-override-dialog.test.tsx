import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { AttemptReportOverrideDialog } from './attempt-report-override-dialog';
import type { ReportCardType } from '../_hooks/use-attempt-report/_types';

afterEach(() => {
    cleanup();
});

function createMockReport(overrides: Partial<ReportCardType> = {}): ReportCardType {
    return {
        questionId: 'q-essay-1',
        questionType: 'ESSAY',
        prompt: 'Explain why the order of steps is crucial in an algorithm.',
        answer: 'Algorithms require precise sequential execution to achieve deterministic outputs.',
        correctAnswer: null,
        isCorrect: null,
        awardedScore: 3.5,
        maxScore: 5,
        evaluation: null,
        override: null,
        question: {
            id: 'q-essay-1',
            examId: 'exam-1',
            type: 'ESSAY',
            content: {
                prompt: 'Explain why the order of steps is crucial in an algorithm.',
            },
            points: 5,
            orderIndex: 0,
        },
        ...overrides,
    };
}

describe('AttemptReportOverrideDialog', () => {
    it('returns null when selectedReport is null', () => {
        const { container } = render(
            <AttemptReportOverrideDialog
                selectedReport={null}
                open={true}
                onOpenChange={vi.fn()}
                onOverrideChange={vi.fn()}
                questionIndex={0}
            />,
        );

        expect(container.firstChild).toBeNull();
    });

    it('renders the question prompt, answer, word count metrics, and score controls', () => {
        const onOverrideChange = vi.fn();
        const selectedReport = createMockReport();

        render(
            <AttemptReportOverrideDialog
                selectedReport={selectedReport}
                open={true}
                onOpenChange={vi.fn()}
                onOverrideChange={onOverrideChange}
                questionIndex={1}
            />,
        );

        // Header
        expect(screen.getByRole('heading', { name: 'Adjust Score' })).toBeTruthy();
        expect(screen.getByText('Adjust score for Question 2')).toBeTruthy();
        expect(screen.getByText('ESSAY')).toBeTruthy();
        expect(screen.getByText('Max: 5 pts')).toBeTruthy();

        // Prompt & Answer
        expect(
            screen.getByText('Explain why the order of steps is crucial in an algorithm.'),
        ).toBeTruthy();
        expect(
            screen.getByText(
                'Algorithms require precise sequential execution to achieve deterministic outputs.',
            ),
        ).toBeTruthy();

        // Word count chip
        expect(screen.getByText(/words.*chars/)).toBeTruthy();

        // Scoring fields
        expect(screen.getByText('Current Awarded Score')).toBeTruthy();
        expect(screen.getByText('3.5')).toBeTruthy();
        expect(screen.getByLabelText('Override Score')).toBeTruthy();
        expect(screen.getByLabelText('Override Reason')).toBeTruthy();

        // Buttons
        expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Done' })).toBeTruthy();
    });

    it('triggers onOverrideChange when score or reason are changed', () => {
        const onOverrideChange = vi.fn();
        const selectedReport = createMockReport();

        render(
            <AttemptReportOverrideDialog
                selectedReport={selectedReport}
                open={true}
                onOpenChange={vi.fn()}
                onOverrideChange={onOverrideChange}
                questionIndex={0}
            />,
        );

        fireEvent.change(screen.getByLabelText('Override Score'), {
            target: { value: '4.5' },
        });
        expect(onOverrideChange).toHaveBeenCalledWith('q-essay-1', 'awardedScore', '4.5');

        fireEvent.change(screen.getByLabelText('Override Reason'), {
            target: { value: 'Well-structured explanation' },
        });
        expect(onOverrideChange).toHaveBeenCalledWith(
            'q-essay-1',
            'reason',
            'Well-structured explanation',
        );
    });

    it('renders empty answer fallback when student answer is blank', () => {
        const selectedReport = createMockReport({ answer: '' });

        render(
            <AttemptReportOverrideDialog
                selectedReport={selectedReport}
                open={true}
                onOpenChange={vi.fn()}
                onOverrideChange={vi.fn()}
                questionIndex={0}
            />,
        );

        expect(screen.getByText('No answer provided by student')).toBeTruthy();
        expect(screen.queryByText(/words •/)).toBeNull();
    });
});
