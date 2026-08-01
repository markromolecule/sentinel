import * as React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PdfTemplateExaminationReportsPage from './page';

const mockUseInstitutionsQuery = vi.fn();
const mockUsePdfTemplatesQuery = vi.fn();
const mockPreviewMutateAsync = vi.fn();
const mockSaveDraftMutateAsync = vi.fn();
const mockPublishMutateAsync = vi.fn();
const mockResetMutateAsync = vi.fn();
const mockReportTemplateEditor = vi.fn();
const mockUseAcademicScope = vi.fn();
const mockUseActivePermissions = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
const mockPreviewWindow = {
    location: {
        href: '',
    },
    close: vi.fn(),
} as unknown as Window;

vi.mock('sonner', () => ({
    toast: {
        success: (...args: any[]) => mockToastSuccess(...args),
        error: (...args: any[]) => mockToastError(...args),
    },
}));

vi.mock('@/hooks/use-academic-scope', () => ({
    useAcademicScope: () => mockUseAcademicScope(),
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
    useActivePermissions: () => mockUseActivePermissions(),
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
                <div>{props.scopeError}</div>
                <div>{props.showResetOverride ? 'reset-visible' : 'reset-hidden'}</div>
                <button onClick={() => props.onScopeChange('branch-1')}>Choose branch</button>
                <button onClick={() => props.onGeneratePreview()}>Trigger preview</button>
                <button onClick={() => props.onResetOverride?.()}>Trigger reset</button>
                <button
                    onClick={() =>
                        props.onHeaderChange({
                            ...props.headerConfig,
                            title_text: 'Updated title',
                        })
                    }
                >
                    Make dirty
                </button>
            </div>
        );
    },
}));

describe('PdfTemplateExaminationReportsPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:preview-url');
        vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
        vi.spyOn(window, 'open').mockReturnValue(mockPreviewWindow);
        mockPreviewWindow.location.href = '';

        mockUseAcademicScope.mockReturnValue({
            institutionId: '',
            isLoading: false,
        });
        mockUseActivePermissions.mockReturnValue({
            hasAnyPermission: () => true,
            hasPermission: () => true,
        });
        mockUseInstitutionsQuery.mockReturnValue({
            data: [
                { id: 'parent-1', name: 'Parent One', institutionKind: 'PARENT' },
                {
                    id: 'branch-1',
                    name: 'Branch One',
                    institutionKind: 'CHILD',
                    parentInstitutionId: 'parent-1',
                },
                { id: 'standalone-1', name: 'Standalone One', institutionKind: 'STANDALONE' },
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

    it('renders a permission denied state without PDF template access', () => {
        mockUseActivePermissions.mockReturnValue({
            hasAnyPermission: () => false,
            hasPermission: () => false,
        });

        render(<PdfTemplateExaminationReportsPage />);

        expect(screen.getByText(/pdf templates access unavailable/i)).toBeTruthy();
    });

    it('defaults to global fallback and queries all institutions when unscoped', () => {
        render(<PdfTemplateExaminationReportsPage />);

        expect(mockUseInstitutionsQuery).toHaveBeenCalledWith({ enabled: true });

        const lastProps = mockReportTemplateEditor.mock.calls.at(-1)?.[0];
        expect(lastProps.scopeValue).toBe('__global__');
        expect(lastProps.scopeOptions).toEqual([
            { value: '__global__', label: 'Global (Sentinel)' },
            { value: 'parent-1', label: 'Parent One' },
            { value: 'branch-1', label: 'Branch One' },
            { value: 'standalone-1', label: 'Standalone One' },
        ]);
    });

    it('constrains institution overrides to the parent scope and its branches', async () => {
        mockUseAcademicScope.mockReturnValue({
            institutionId: 'parent-1',
            isLoading: false,
        });

        render(<PdfTemplateExaminationReportsPage />);

        await waitFor(() => {
            const lastProps = mockReportTemplateEditor.mock.calls.at(-1)?.[0];
            expect(lastProps.scopeOptions).toEqual([
                { value: '__global__', label: 'Global (Sentinel)' },
                { value: 'parent-1', label: 'Parent One' },
                { value: 'branch-1', label: 'Branch One' },
            ]);
        });

        expect(screen.getByText(/choose your parent institution or one of its branches/i)).toBeTruthy();
    });

    it('uses the assigned institution only for non-parent academic scope', async () => {
        mockUseAcademicScope.mockReturnValue({
            institutionId: 'branch-1',
            isLoading: false,
        });

        render(<PdfTemplateExaminationReportsPage />);

        await waitFor(() => {
            const lastProps = mockReportTemplateEditor.mock.calls.at(-1)?.[0];
            expect(lastProps.scopeOptions).toEqual([
                { value: '__global__', label: 'Global (Sentinel)' },
                { value: 'branch-1', label: 'Branch One' },
            ]);
        });
    });

    it('passes the exam results report preview payload and opens a new tab', async () => {
        render(<PdfTemplateExaminationReportsPage />);

        fireEvent.click(screen.getByText('Trigger preview'));

        await waitFor(() =>
            expect(mockPreviewMutateAsync).toHaveBeenCalledWith(
                expect.objectContaining({
                    institution_id: null,
                    document_kind: 'EXAM_RESULTS_REPORT',
                }),
            ),
        );

        expect(window.open).toHaveBeenCalledWith('about:blank', '_blank');
        expect(mockPreviewWindow.location.href).toBe('blob:preview-url');
    });

    it('shows popup blocked feedback when preview tab cannot open', async () => {
        vi.mocked(window.open).mockReturnValueOnce(null);

        render(<PdfTemplateExaminationReportsPage />);

        fireEvent.click(screen.getByText('Trigger preview'));

        await waitFor(() =>
            expect(mockToastError).toHaveBeenCalledWith(
                'Allow pop-ups to open the PDF preview in a new tab.',
            ),
        );
        expect(mockPreviewMutateAsync).not.toHaveBeenCalled();
    });

    it('saves, publishes, and resets the selected institution override', async () => {
        mockUsePdfTemplatesQuery.mockReturnValue({
            data: [
                {
                    template_id: 'draft-1',
                    status: 'DRAFT',
                    header_config: {
                        title_text: 'Draft',
                    },
                    footer_config: {
                        text: 'Footer',
                    },
                    updated_at: '2026-08-01T00:00:00.000Z',
                },
            ],
        });

        render(<PdfTemplateExaminationReportsPage />);

        fireEvent.click(screen.getByText('Choose branch'));
        fireEvent.click(screen.getByText('Make dirty'));
        fireEvent.click(screen.getByText('Save draft'));
        fireEvent.click(screen.getByText('Publish'));
        fireEvent.click(screen.getByText('Trigger reset'));

        await waitFor(() =>
            expect(mockSaveDraftMutateAsync).toHaveBeenCalledWith(
                expect.objectContaining({
                    institution_id: 'branch-1',
                    document_kind: 'EXAM_RESULTS_REPORT',
                }),
            ),
        );
        expect(mockPublishMutateAsync).toHaveBeenCalledWith({
            templateId: 'draft-1',
            institutionId: 'branch-1',
            documentKind: 'EXAM_RESULTS_REPORT',
        });
        expect(mockResetMutateAsync).toHaveBeenCalledWith({
            institutionId: 'branch-1',
            documentKind: 'EXAM_RESULTS_REPORT',
        });
    });

    it('surfaces institution query errors while keeping global fallback available', () => {
        mockUseInstitutionsQuery.mockReturnValue({
            data: [],
            isLoading: false,
            isError: true,
            error: new Error('Institution query failed'),
        });

        render(<PdfTemplateExaminationReportsPage />);

        expect(screen.getByText('Institution query failed')).toBeTruthy();
        expect(
            screen.getByText(
                /Global \(Sentinel\) remains available while institution overrides are unavailable./i,
            ),
        ).toBeTruthy();
    });

    it('keeps save and publish disabled for view-only access', () => {
        mockUseActivePermissions.mockReturnValue({
            hasAnyPermission: () => true,
            hasPermission: () => false,
        });

        render(<PdfTemplateExaminationReportsPage />);

        expect(screen.getByText('Save draft')).toHaveProperty('disabled', true);
        expect(screen.getByText('Publish')).toHaveProperty('disabled', true);
    });
});
