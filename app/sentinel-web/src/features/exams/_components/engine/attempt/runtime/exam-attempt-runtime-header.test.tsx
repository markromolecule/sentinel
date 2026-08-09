import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ComponentProps, ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExamAttemptRuntimeHeader } from './exam-attempt-runtime-header';

vi.mock('@sentinel/ui', () => ({
    Badge: ({ children, className }: { children: ReactNode; className?: string }) => (
        <span className={className}>{children}</span>
    ),
    Button: ({ children, className, onClick, ...props }: ComponentProps<'button'>) => (
        <button className={className} onClick={onClick} {...props}>
            {children}
        </button>
    ),
    Tooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
    TooltipContent: ({ children }: { children: ReactNode }) => <>{children}</>,
    TooltipProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
    TooltipTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

describe('ExamAttemptRuntimeHeader', () => {
    afterEach(cleanup);

    it('renders visible compact and desktop passage controls only when a passage exists', () => {
        const onToggleCompactPassage = vi.fn();
        const onTogglePassagePanel = vi.fn();

        const { rerender } = render(
            <ExamAttemptRuntimeHeader
                answeredCount={1}
                totalQuestions={3}
                flaggedCount={0}
                hasPassage
                showPassagePanel={false}
                onToggleCompactPassage={onToggleCompactPassage}
                onTogglePassagePanel={onTogglePassagePanel}
                onSubmit={vi.fn()}
            />,
        );

        const showPassageButtons = screen.getAllByRole('button', { name: 'Show passage' });

        expect(showPassageButtons).toHaveLength(2);
        expect(showPassageButtons[0].className).toContain('md:hidden');
        expect(showPassageButtons[1].parentElement?.className).toContain('hidden md:block');

        fireEvent.click(showPassageButtons[0]);
        fireEvent.click(showPassageButtons[1]);

        expect(onToggleCompactPassage).toHaveBeenCalledOnce();
        expect(onTogglePassagePanel).toHaveBeenCalledOnce();

        rerender(
            <ExamAttemptRuntimeHeader
                answeredCount={1}
                totalQuestions={3}
                flaggedCount={0}
                hasPassage={false}
                showPassagePanel={false}
                onToggleCompactPassage={onToggleCompactPassage}
                onTogglePassagePanel={onTogglePassagePanel}
                onSubmit={vi.fn()}
            />,
        );

        expect(screen.queryByRole('button', { name: /passage/i })).toBeNull();
    });

    it('keeps compact-sheet and desktop-panel controls independent', () => {
        const onToggleCompactPassage = vi.fn();
        const onTogglePassagePanel = vi.fn();

        render(
            <ExamAttemptRuntimeHeader
                answeredCount={1}
                totalQuestions={3}
                flaggedCount={0}
                hasPassage
                showPassagePanel
                onToggleCompactPassage={onToggleCompactPassage}
                onTogglePassagePanel={onTogglePassagePanel}
                onSubmit={vi.fn()}
            />,
        );

        const compactControl = screen.getByRole('button', { name: 'Show passage' });
        const desktopControl = screen.getByRole('button', { name: 'Hide passage' });

        expect(compactControl.className).toContain('md:hidden');
        expect(desktopControl.parentElement?.className).toContain('hidden md:block');

        fireEvent.click(compactControl);
        fireEvent.click(desktopControl);

        expect(onToggleCompactPassage).toHaveBeenCalledOnce();
        expect(onTogglePassagePanel).toHaveBeenCalledOnce();
    });

    it('keeps the mobile controls ordered and preserves submit behavior', () => {
        const onToggleCompactPassage = vi.fn();
        const onTogglePassagePanel = vi.fn();
        const onSubmit = vi.fn();

        const { rerender } = render(
            <ExamAttemptRuntimeHeader
                answeredCount={8}
                totalQuestions={12}
                flaggedCount={3}
                hasPassage
                showPassagePanel={false}
                onToggleCompactPassage={onToggleCompactPassage}
                onTogglePassagePanel={onTogglePassagePanel}
                onSubmit={onSubmit}
            />,
        );

        const answeredBadge = screen.getByText('8/12 answered');
        const flaggedBadge = screen.getByText('3 flagged');
        const compactControl = screen
            .getAllByRole('button', { name: 'Show passage' })
            .find((el) => el.className.includes('md:hidden'))!;
        const submitButton = screen.getByRole('button', { name: 'Turn In' });

        expect(answeredBadge.className).toContain('order-2');
        expect(flaggedBadge.className).toContain('order-3');
        expect(compactControl.className).toContain('order-4');
        expect(compactControl.className).toContain('md:hidden');
        expect(submitButton.className).toContain('order-5');
        expect(submitButton.className).toContain('basis-full');

        fireEvent.click(compactControl);
        fireEvent.click(submitButton);

        expect(onToggleCompactPassage).toHaveBeenCalledOnce();
        expect(onTogglePassagePanel).not.toHaveBeenCalled();
        expect(onSubmit).toHaveBeenCalledOnce();

        rerender(
            <ExamAttemptRuntimeHeader
                answeredCount={8}
                totalQuestions={12}
                flaggedCount={3}
                hasPassage
                showPassagePanel={false}
                onToggleCompactPassage={onToggleCompactPassage}
                onTogglePassagePanel={onTogglePassagePanel}
                onSubmit={onSubmit}
                isSubmitting
            />,
        );

        const submittingButton = screen.getByRole('button', { name: 'Preparing...' });
        expect((submittingButton as HTMLButtonElement).disabled).toBe(true);
    });
});
