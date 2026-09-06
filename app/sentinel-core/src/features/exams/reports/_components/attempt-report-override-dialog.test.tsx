import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { AttemptReportOverrideDialog } from './attempt-report-override-dialog';
import type { ReportCardType } from '../_types';

afterEach(() => {
    cleanup();
});

function createMockReport(overrides: Partial<ReportCardType> = {}): ReportCardType {
    return {
        questionId: 'q-essay-core-1',
        questionType: 'ESSAY',
        prompt: 'Describe the core responsibilities of a secure exam proctoring runtime.',
        answer: 'It must monitor lock state, capture flag signals with evidence, and preserve tamper-evident audit logs.',
        correctAnswer: null,
        isCorrect: null,
        awardedScore: 4,
        maxScore: 5,
        evaluation: null,
        override: null,
        question: {
            id: 'q-essay-core-1',
            examId: 'exam-core-1',
            type: 'ESSAY',
            content: {
                prompt: 'Describe the core responsibilities of a secure exam proctoring runtime.',
            },
            points: 5,
            orderIndex: 0,
        },
        ...overrides,
    };
}

describe('AttemptReportOverrideDialog (sentinel-core)', () => {
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
                questionIndex={0}
            />,
        );

        // Header
        expect(screen.getByRole('heading', { name: 'Adjust Score' })).toBeTruthy();
        expect(screen.getByText('Adjust score for Question 1')).toBeTruthy();
        expect(screen.getByText('ESSAY')).toBeTruthy();
        expect(screen.getByText('Max: 5 pts')).toBeTruthy();

        // Prompt & Answer
        expect(
            screen.getByText('Describe the core responsibilities of a secure exam proctoring runtime.'),
        ).toBeTruthy();
        expect(
            screen.getByText(
                'It must monitor lock state, capture flag signals with evidence, and preserve tamper-evident audit logs.',
            ),
        ).toBeTruthy();

        // Word count chip
        expect(screen.getByText(/words.*chars/)).toBeTruthy();

        // Scoring fields
        expect(screen.getByText('Current Awarded Score')).toBeTruthy();
        expect(screen.getByText('4')).toBeTruthy();
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
            target: { value: '4.8' },
        });
        expect(onOverrideChange).toHaveBeenCalledWith('q-essay-core-1', 'awardedScore', '4.8');

        fireEvent.change(screen.getByLabelText('Override Reason'), {
            target: { value: 'Thorough coverage of proctoring security architecture.' },
        });
        expect(onOverrideChange).toHaveBeenCalledWith(
            'q-essay-core-1',
            'reason',
            'Thorough coverage of proctoring security architecture.',
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
        expect(screen.queryByText(/words.*chars/)).toBeNull();
    });
});
