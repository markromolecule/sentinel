// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QuestionBankWorkspaceShell } from './question-bank-workspace-shell';

const pathname = vi.hoisted(() => ({ value: '/question/bank' }));

vi.mock('next/navigation', () => ({
    usePathname: () => pathname.value,
}));

vi.mock('./question-bank-nav', () => ({
    QuestionBankNav: () => <div data-testid="question-bank-nav" />,
}));

describe('QuestionBankWorkspaceShell', () => {
    afterEach(() => {
        cleanup();
        pathname.value = '/question/bank';
    });

    it('shows the sidebar shell for regular question pages', () => {
        pathname.value = '/question/bank';

        render(
            <QuestionBankWorkspaceShell>
                <div data-testid="shell-children" />
            </QuestionBankWorkspaceShell>,
        );

        expect(screen.getByText('Question Bank')).toBeTruthy();
        expect(screen.getAllByTestId('question-bank-nav')).toHaveLength(2);
        expect(screen.getByTestId('shell-children')).toBeTruthy();
    });

    it('hides the sidebar shell on builder routes', () => {
        pathname.value = '/question/bank/123/builder';

        render(
            <QuestionBankWorkspaceShell>
                <div data-testid="shell-children" />
            </QuestionBankWorkspaceShell>,
        );

        expect(screen.queryByText('Question Bank')).toBeNull();
        expect(screen.queryAllByTestId('question-bank-nav')).toHaveLength(0);
        expect(screen.getByTestId('shell-children')).toBeTruthy();
    });
});
