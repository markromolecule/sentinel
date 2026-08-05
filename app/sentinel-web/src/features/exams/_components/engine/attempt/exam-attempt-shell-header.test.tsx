import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ExamAttemptShellHeader } from './exam-attempt-shell-header';

describe('ExamAttemptShellHeader', () => {
    afterEach(cleanup);

    it('keeps the timer and toolbar inside the shared mobile wrap group', () => {
        const { container } = render(
            <ExamAttemptShellHeader
                title="Attempt title"
                timerLabel="1800s"
                toolbar={<div data-testid="runtime-toolbar">Toolbar</div>}
            />,
        );

        expect(screen.getByText('Attempt title')).toBeTruthy();
        expect(screen.getByText('1800s').className).toContain('order-1');

        const toolbar = screen.getByTestId('runtime-toolbar');
        expect(toolbar.parentElement?.className).toContain('order-2');
        expect(toolbar.parentElement?.className).toContain('min-w-0');
        expect(toolbar.parentElement?.className).toContain('flex-1');

        const mobileWrap = container.querySelector('header > div > div:last-child');
        expect(mobileWrap?.className).toContain('flex w-full flex-wrap');
    });
});
