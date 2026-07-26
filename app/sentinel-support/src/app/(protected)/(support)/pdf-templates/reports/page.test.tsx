import * as React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import PdfTemplateReportsPage from './page';

const mockUseInstitutionsQuery = vi.fn();
const mockUsePdfTemplatesQuery = vi.fn();
const mockPreviewMutateAsync = vi.fn();
const mockSaveDraftMutateAsync = vi.fn();
const mockPublishMutateAsync = vi.fn();
const mockResetMutateAsync = vi.fn();
const mockReportTemplateEditor = vi.fn();
const mockPreviewWindow = {
    location: {
        href: '',
    },
    close: vi.fn(),
} as unknown as Window;

vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

vi.mock('@sentinel/ui', () => ({
    Button: ({ children, onClick, disabled, variant }: any) => (
        <button data-variant={variant} disabled={disabled} onClick={onClick}>
            {children}
        </button>
    ),
    PermissionDeniedState: ({ resourceName }: any) => <div>{resourceName} access unavailable</div>,
}));

vi.mock('@/data', () => ({
    useActivePermissions: () => ({
        hasAnyPermission: () => true,
        hasPermission: () => true,
    }),
    useInstitutionsQuery: (...args: any[]) => mockUseInstitutionsQuery(...args),
    usePdfTemplatesQuery: (...args: any[]) => mockUsePdfTemplatesQuery(...args),
    usePreviewPdfTemplateMutation: () => ({
        mutateAsync: mockPreviewMutateAsync,
        isPending: false,
    }),
    useSavePdfTemplateDraftMutation: () => ({
        mutateAsync: mockSaveDraftMutateAsync,
        isPending: false,
    }),
    usePublishPdfTemplateMutation: () => ({
        mutateAsync: mockPublishMutateAsync,
        isPending: false,
    }),
    useResetPdfTemplateOverrideMutation: () => ({
        mutateAsync: mockResetMutateAsync,
        isPending: false,
    }),
}));

vi.mock('../_components', () => ({
    PdfTemplatePageShell: ({ title, description, actions, children }: any) => (
        <div>
            <h1>{title}</h1>
            <p>{description}</p>
            <div>{actions}</div>
            <div>{children}</div>
        </div>
    ),
    ReportTemplateEditor: (props: any) => {
        mockReportTemplateEditor(props);
        return (
            <div>
                <div>{props.scopeOptions.map((option: any) => option.label).join(', ')}</div>
                <div>{props.scopeHint}</div>
                <button onClick={() => props.onScopeChange('parent-1')}>Choose parent</button>
                <button onClick={() => props.onGeneratePreview()}>Trigger preview</button>
                <button onClick={() => props.onResetOverride?.()}>Trigger reset</button>
                <div>{props.showResetOverride ? 'reset-visible' : 'reset-hidden'}</div>
            </div>
        );
    },
}));

describe('PdfTemplateReportsPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:preview-url');
        vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
        mockPreviewWindow.location.href = '';
        vi.spyOn(window, 'open').mockReturnValue(mockPreviewWindow);
        mockUseInstitutionsQuery.mockReturnValue({
            data: [
                { id: 'parent-1', name: 'Parent One', institutionKind: 'PARENT' },
                { id: 'parent-2', name: 'Parent Two', institutionKind: 'PARENT' },
            ],
            isLoading: false,
            isError: false,
            error: null,
        });
        mockUsePdfTemplatesQuery.mockReturnValue({ data: [] });
        mockPreviewMutateAsync.mockResolvedValue(new Blob(['pdf'], { type: 'application/pdf' }));
        mockSaveDraftMutateAsync.mockResolvedValue(undefined);
        mockPublishMutateAsync.mockResolvedValue(undefined);
        mockResetMutateAsync.mockResolvedValue(undefined);
    });

    it('requests parent institutions and defaults the page to Global (Sentinel)', () => {
        render(<PdfTemplateReportsPage />);

        expect(mockUseInstitutionsQuery).toHaveBeenCalledWith({
            institutionKind: 'PARENT',
            enabled: true,
        });

        const lastProps = mockReportTemplateEditor.mock.calls.at(-1)?.[0];
        expect(lastProps.scopeValue).toBe('__global__');
        expect(lastProps.scopeOptions[0]).toEqual({
            value: '__global__',
            label: 'Global (Sentinel)',
        });
    });

    it('generates the preview and opens it in a new tab', async () => {
        render(<PdfTemplateReportsPage />);

        fireEvent.click(screen.getByText('Trigger preview'));

        await waitFor(() =>
            expect(mockPreviewMutateAsync).toHaveBeenCalledWith(
                expect.objectContaining({
                    institution_id: null,
                    document_kind: 'ANALYTICS_OVERALL',
                }),
            ),
        );
        expect(window.open).toHaveBeenCalledWith('about:blank', '_blank');
        expect(mockPreviewWindow.location.href).toBe('blob:preview-url');
    });

    it('switches to a parent override and enables reset behavior', async () => {
        render(<PdfTemplateReportsPage />);

        fireEvent.click(screen.getByText('Choose parent'));

        await waitFor(() => {
            const lastProps = mockReportTemplateEditor.mock.calls.at(-1)?.[0];
            expect(lastProps.scopeValue).toBe('parent-1');
            expect(lastProps.showResetOverride).toBe(true);
        });

        fireEvent.click(screen.getByText('Trigger reset'));

        await waitFor(() =>
            expect(mockResetMutateAsync).toHaveBeenCalledWith({
                institutionId: 'parent-1',
                documentKind: 'ANALYTICS_OVERALL',
            }),
        );
    });

    it('shows a fallback hint when no parent institutions are available', () => {
        mockUseInstitutionsQuery.mockReturnValue({
            data: [],
            isLoading: false,
            isError: false,
            error: null,
        });

        render(<PdfTemplateReportsPage />);

        expect(
            screen.getByText(
                /No parent institutions are available yet. Global \(Sentinel\) remains available./i,
            ),
        ).toBeTruthy();
    });
});
