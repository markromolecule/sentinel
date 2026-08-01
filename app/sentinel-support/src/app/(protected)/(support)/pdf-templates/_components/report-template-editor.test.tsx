import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ReportTemplateEditor } from './report-template-editor';

vi.mock('@sentinel/ui', async () => {
    const React = await import('react');
    const TabsContext = React.createContext<{
        value: string;
        setValue: (value: string) => void;
    } | null>(null);

    return {
        AlertDialog: ({ open, children }: any) =>
            open ? <div>{children}</div> : <div>{children}</div>,
        AlertDialogAction: ({ children, onClick }: any) => (
            <button onClick={onClick}>{children}</button>
        ),
        AlertDialogCancel: ({ children }: any) => <button>{children}</button>,
        AlertDialogContent: ({ children }: any) => <div>{children}</div>,
        AlertDialogDescription: ({ children }: any) => <p>{children}</p>,
        AlertDialogFooter: ({ children }: any) => <div>{children}</div>,
        AlertDialogHeader: ({ children }: any) => <div>{children}</div>,
        AlertDialogTitle: ({ children }: any) => <h2>{children}</h2>,
        Button: ({ children, onClick, disabled, asChild }: any) =>
            asChild ? (
                <div>{children}</div>
            ) : (
                <button disabled={disabled} onClick={onClick}>
                    {children}
                </button>
            ),
        Label: ({ children, htmlFor }: any) => <label htmlFor={htmlFor}>{children}</label>,
        Select: ({ children }: any) => <div>{children}</div>,
        SelectContent: ({ children }: any) => <>{children}</>,
        SelectItem: ({ children }: any) => <div>{children}</div>,
        SelectTrigger: ({ children, id }: any) => <button id={id}>{children}</button>,
        SelectValue: () => null,
        Tabs: ({ value, onValueChange, children }: any) => (
            <TabsContext.Provider value={{ value, setValue: onValueChange }}>
                <div>{children}</div>
            </TabsContext.Provider>
        ),
        TabsList: ({ children }: any) => <div>{children}</div>,
        TabsTrigger: ({ value, children }: any) => {
            const ctx = React.useContext(TabsContext)!;
            return (
                <button
                    role="tab"
                    aria-selected={ctx.value === value}
                    onClick={() => ctx.setValue(value)}
                >
                    {children}
                </button>
            );
        },
        TabsContent: ({ value, children }: any) => {
            const ctx = React.useContext(TabsContext)!;
            return ctx.value === value ? <div>{children}</div> : null;
        },
    };
});

vi.mock('./template-header-footer-fields', () => ({
    TemplateHeaderFooterFields: ({ section }: any) => <div>{section}-fields</div>,
}));

vi.mock('./template-preview-card', () => ({
    TemplatePreviewCard: ({ onGeneratePreview, isGenerating }: any) => (
        <div>
            <button onClick={onGeneratePreview}>Generate preview</button>
            <span>{isGenerating ? 'Generating...' : 'Preview action ready'}</span>
        </div>
    ),
}));

vi.mock('./template-status-card', () => ({
    TemplateStatusCard: ({ scopeLabel, hasUnsavedChanges }: any) => (
        <div>
            <span>{scopeLabel}</span>
            <span>{hasUnsavedChanges ? 'Unsaved changes' : 'Saved'}</span>
        </div>
    ),
}));

describe('ReportTemplateEditor', () => {
    const baseProps = {
        scopeValue: '__global__',
        scopeOptions: [
            { value: '__global__', label: 'Global (Sentinel)' },
            { value: 'parent-1', label: 'Parent One' },
        ],
        onScopeChange: vi.fn(),
        scopeHint: 'Hint text',
        scopeError: null,
        isScopeLoading: false,
        template: null,
        scopeLabel: 'Global (Sentinel)',
        hasUnsavedChanges: true,
        headerConfig: {} as any,
        footerConfig: {} as any,
        onHeaderChange: vi.fn(),
        onFooterChange: vi.fn(),
        isGeneratingPreview: false,
        onGeneratePreview: vi.fn(),
        showResetOverride: false,
        isResettingOverride: false,
        onResetOverride: vi.fn(),
    };

    it('shows compact status and renders both preview and settings controls', () => {
        const { container } = render(<ReportTemplateEditor {...baseProps} />);

        expect(screen.getAllByText('Global (Sentinel)').length).toBeGreaterThan(0);
        expect(screen.getByText('Unsaved changes')).toBeTruthy();
        expect(container.textContent).toContain('header-fields');
        expect(container.textContent).toContain('Generate preview');
    });

    it('shows reset confirmation and preview loading for parent overrides', () => {
        render(
            <ReportTemplateEditor
                {...baseProps}
                scopeValue="parent-1"
                scopeLabel="Parent One"
                isGeneratingPreview
                showResetOverride
            />,
        );

        expect(screen.getByText('Generating...')).toBeTruthy();

        fireEvent.click(screen.getByText('Reset to global'));
        fireEvent.click(screen.getByText('Confirm reset'));

        expect(baseProps.onResetOverride).toHaveBeenCalled();
    });

    it('displays scope loading state, errors, and hints correctly', () => {
        render(
            <ReportTemplateEditor
                {...baseProps}
                isScopeLoading
                scopeError="Scope error message"
                scopeHint="Scope hint message"
            />,
        );

        expect(screen.getByText('Loading parent institutions…')).toBeTruthy();
        expect(screen.getByText('Scope error message')).toBeTruthy();
        expect(screen.getByText('Scope hint message')).toBeTruthy();
    });
});
