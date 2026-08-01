import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PdfTemplateNav } from './pdf-template-nav';
import { PdfTemplateWorkspaceShell } from './pdf-template-workspace-shell';

const mockUsePathname = vi.fn();

vi.mock('next/navigation', () => ({
    usePathname: () => mockUsePathname(),
}));

vi.mock('@sentinel/ui', () => ({
    Separator: () => <div data-testid="separator" />,
    cn: (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(' '),
}));

describe('PdfTemplateNav', () => {
    it('renders all four template destinations with unambiguous labels', () => {
        render(<PdfTemplateNav activeSection="reports" />);

        expect(screen.getByRole('link', { name: 'Branding' })).toBeTruthy();
        expect(screen.getByRole('link', { name: 'Overall Report' })).toBeTruthy();
        expect(screen.getByRole('link', { name: 'Examination Answer Key' })).toBeTruthy();
        expect(screen.getByRole('link', { name: 'Examination Report' })).toBeTruthy();
    });

    it('marks the active section distinctly', () => {
        render(<PdfTemplateNav activeSection="examination-reports" />);

        expect(screen.getByRole('link', { name: 'Examination Report' }).className).toContain(
            'font-semibold',
        );
        expect(screen.getByRole('link', { name: 'Overall Report' }).className).not.toContain(
            'font-semibold',
        );
    });
});

describe('PdfTemplateWorkspaceShell', () => {
    it.each([
        ['/pdf-templates/reports', 'Overall Report'],
        ['/pdf-templates/examinations', 'Examination Answer Key'],
        ['/pdf-templates/examination-reports', 'Examination Report'],
        ['/pdf-templates/branding', 'Branding'],
    ])('resolves %s to the %s navigation item', (pathname, activeLabel) => {
        mockUsePathname.mockReturnValue(pathname);

        render(
            <PdfTemplateWorkspaceShell>
                <div>content</div>
            </PdfTemplateWorkspaceShell>,
        );

        expect(screen.getAllByRole('link', { name: activeLabel })[0].className).toContain(
            'font-semibold',
        );
    });
});
