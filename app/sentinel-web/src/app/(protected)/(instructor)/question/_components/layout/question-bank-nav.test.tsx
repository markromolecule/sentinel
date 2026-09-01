import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { QuestionBankNav } from './question-bank-nav';

const mockPathname = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
    usePathname: () => mockPathname(),
}));

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('QuestionBankNav', () => {
    it.each([
        ['/question', 'Questions'],
        ['/question/bank', 'Questions'],
        ['/question/bank/collections', 'Collections'],
        ['/question/bank/collections/abc', 'Collections'],
        ['/question/bank/tos', 'Table of Specifications'],
        ['/question/bank/import/preview', 'Questions'],
    ])('highlights %s as %s', (pathname, expectedLabel) => {
        mockPathname.mockReturnValue(pathname);

        render(<QuestionBankNav />);

        const activeLink = screen.getByRole('link', { name: expectedLabel });
        expect(activeLink.className).toContain('bg-accent/50');
        expect(activeLink.className).toContain('border-r-2');
    });

    it('renders the expected question-bank links', () => {
        mockPathname.mockReturnValue('/question/bank');

        render(<QuestionBankNav />);

        expect(screen.getByRole('link', { name: 'Questions' }).getAttribute('href')).toBe(
            '/question/bank',
        );
        expect(screen.getByRole('link', { name: 'Collections' }).getAttribute('href')).toBe(
            '/question/bank/collections',
        );
        expect(
            screen.getByRole('link', { name: 'Table of Specifications' }).getAttribute('href'),
        ).toBe('/question/bank/tos');
    });
});
