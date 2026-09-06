import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GradingRubricPane } from './grading-rubric-pane';
import { LEGACY_ESSAY_RUBRIC } from '@sentinel/shared';

global.ResizeObserver = class {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
};

describe('GradingRubricPane', () => {
    afterEach(() => {
        cleanup();
    });
    const mockQuestion = {
        id: 'q-1',
        examId: 'e-1',
        type: 'ESSAY',
        points: 20,
        orderIndex: 0,
        content: { prompt: 'Write an essay.' },
    };

    const mockEval = {
        scores: {
            contentSubstance: 3,
            structureOrganization: 4,
            argumentationSupport: 2,
            styleTone: 4,
            grammarConventions: 3,
        },
        feedback: 'Good overall work.',
    };

    it('renders rubric version and calculated weighted score', () => {
        const onScoreChange = vi.fn();

        render(
            <GradingRubricPane
                activeQuestion={mockQuestion}
                activeEval={mockEval}
                onScoreChange={onScoreChange}
                overallFeedback="Great essay"
                onOverallFeedbackChange={vi.fn()}
                rubric={{
                    id: 'r-1',
                    versionNumber: 2,
                    source: 'EXAM_OVERRIDE' as const,
                    definition: LEGACY_ESSAY_RUBRIC,
                    updatedAt: null,
                }}
            />,
        );

        // Verify rubric version
        expect(screen.getByText(/Exam Override \(v2\)/i)).toBeTruthy();

        // Verify criteria name rendered
        expect(screen.getByText(/Content & Substance/i)).toBeTruthy();

        // Verify weighted score calculation rendered
        expect(screen.getByText(/\/ 20 pts/i)).toBeTruthy();
    });

    it('renders overall feedback textarea and calls change handler', () => {
        const onOverallFeedbackChange = vi.fn();

        render(
            <GradingRubricPane
                activeQuestion={mockQuestion}
                activeEval={mockEval}
                onScoreChange={vi.fn()}
                overallFeedback="Initial feedback"
                onOverallFeedbackChange={onOverallFeedbackChange}
            />,
        );

        expect(screen.getByDisplayValue('Initial feedback')).toBeTruthy();
    });

    it('renders recalculate button and calls handler on click', () => {
        const onRecalculateRubric = vi.fn();

        render(
            <GradingRubricPane
                activeQuestion={mockQuestion}
                activeEval={mockEval}
                onScoreChange={vi.fn()}
                overallFeedback="Initial feedback"
                onOverallFeedbackChange={vi.fn()}
                onRecalculateRubric={onRecalculateRubric}
            />,
        );

        const button = screen.getByRole('button', { name: /Re-calculate with Rubric/i });
        expect(button).toBeTruthy();

        fireEvent.click(button);
        expect(onRecalculateRubric).toHaveBeenCalledTimes(1);
    });

    it('does not render recalculate button when onRecalculateRubric is not provided', () => {
        render(
            <GradingRubricPane
                activeQuestion={mockQuestion}
                activeEval={mockEval}
                onScoreChange={vi.fn()}
                overallFeedback="Initial feedback"
                onOverallFeedbackChange={vi.fn()}
            />,
        );

        expect(screen.queryByRole('button', { name: /Re-calculate with Rubric/i })).toBeNull();
    });
});
