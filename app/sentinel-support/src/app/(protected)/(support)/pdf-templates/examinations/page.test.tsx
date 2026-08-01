import * as React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PdfTemplateExaminationsPage from './page';

const mockUseAcademicScope = vi.fn();
const mockUseActivePermissions = vi.fn();
const mockPreviewMutateAsync = vi.fn();
const mockCreateExportMutateAsync = vi.fn();
const mockToastError = vi.fn();
const mockToastSuccess = vi.fn();
const mockPreviewWindow = {
    location: {
        href: '',
    },
    close: vi.fn(),
} as unknown as Window;

type ChildrenProps = {
    children?: React.ReactNode;
};

type ButtonProps = ChildrenProps & {
    className?: string;
    disabled?: boolean;
    onClick?: React.MouseEventHandler<HTMLButtonElement>;
    variant?: string;
};

type LabelProps = ChildrenProps & {
    className?: string;
    htmlFor?: string;
};

type SelectProps = ChildrenProps & {
    disabled?: boolean;
    onValueChange: (value: string) => void;
    value: string;
};

type SelectItemProps = ChildrenProps & {
    value: string;
};

type PermissionDeniedStateProps = {
    resourceName: string;
};

type PageShellProps = ChildrenProps & {
    actions?: React.ReactNode;
    description: string;
    title: string;
};

vi.mock('sonner', () => ({
    toast: {
        success: (...args: unknown[]) => mockToastSuccess(...args),
        error: (...args: unknown[]) => mockToastError(...args),
    },
}));

vi.mock('@/hooks/use-academic-scope', () => ({
    useAcademicScope: () => mockUseAcademicScope(),
}));

vi.mock('@sentinel/ui', () => ({
    Button: ({ children, onClick, disabled, variant, className }: ButtonProps) => (
        <button className={className} data-variant={variant} disabled={disabled} onClick={onClick}>
            {children}
        </button>
    ),
    Label: ({ children, htmlFor, className }: LabelProps) => (
        <label className={className} htmlFor={htmlFor}>
            {children}
        </label>
    ),
    PermissionDeniedState: ({ resourceName }: PermissionDeniedStateProps) => (
        <div>{resourceName} access unavailable</div>
    ),
    Select: ({ children, value, onValueChange, disabled }: SelectProps) => (
        <select
            disabled={disabled}
            value={value}
            onChange={(event) => onValueChange(event.target.value)}
        >
            <option value="">Choose</option>
            {children}
        </select>
    ),
    SelectContent: ({ children }: ChildrenProps) => <>{children}</>,
    SelectItem: ({ children, value }: SelectItemProps) => <option value={value}>{children}</option>,
    SelectTrigger: () => null,
    SelectValue: () => null,
    Tabs: ({ children }: ChildrenProps) => <div>{children}</div>,
    TabsContent: ({ children }: ChildrenProps) => <div>{children}</div>,
    TabsList: ({ children }: ChildrenProps) => <div>{children}</div>,
    TabsTrigger: ({ children }: ChildrenProps) => <button>{children}</button>,
}));

vi.mock('lucide-react', () => ({
    ExternalLink: () => <span data-testid="external-link" />,
    Eye: () => <span data-testid="eye" />,
}));

vi.mock('@/data', () => ({
    useActivePermissions: () => mockUseActivePermissions(),
    useInstitutionsQuery: () => ({
        data: [
            { id: 'institution-1', name: 'Institution One', institutionKind: 'STANDALONE' },
            { id: 'institution-2', name: 'Institution Two', institutionKind: 'STANDALONE' },
        ],
    }),
    usePdfTemplatesQuery: () => ({ data: [] }),
    useExamsQuery: () => ({
        data: [
            { id: 'exam-a', title: 'Exam A' },
            { id: 'exam-b', title: 'Exam B' },
        ],
    }),
    useAnswerKeyExportsQuery: () => ({ data: { records: [] } }),
    usePreviewPdfTemplateMutation: () => ({
        mutateAsync: mockPreviewMutateAsync,
        isPending: false,
    }),
    useSavePdfTemplateDraftMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
    usePublishPdfTemplateMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
    useCreateAnswerKeyExportMutation: () => ({
        mutateAsync: mockCreateExportMutateAsync,
        isPending: false,
    }),
    useAnswerKeyExportDownloadMutation: () => ({ mutateAsync: vi.fn() }),
    useRetryAnswerKeyExportMutation: () => ({ mutateAsync: vi.fn() }),
    useDeleteAnswerKeyExportMutation: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock('../_components', () => ({
    PdfTemplatePageShell: ({ title, description, actions, children }: PageShellProps) => (
        <div>
            <h1>{title}</h1>
            <p>{description}</p>
            <div>{actions}</div>
            <div>{children}</div>
        </div>
    ),
    TemplateStatusCard: () => <div>Template status</div>,
    TemplateHeaderFooterFields: () => <div>Header footer fields</div>,
    AnswerKeyExportsPanel: () => <div>Answer key exports</div>,
}));

function setupPermissions({
    canView = true,
    canManage = true,
    canExport = true,
}: {
    canView?: boolean;
    canManage?: boolean;
    canExport?: boolean;
} = {}) {
    mockUseActivePermissions.mockReturnValue({
        hasAnyPermission: (permissions: string[]) =>
            canView && permissions.some((permission) => permission.startsWith('pdf_templates:')),
        hasPermission: (permission: string) => {
            if (permission === 'pdf_templates:manage') {
                return canManage;
            }

            if (permission === 'examinations:export_answer_key') {
                return canExport;
            }

            return false;
        },
    });
}

async function chooseInstitutionAndExam(examId = 'exam-a') {
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'institution-1' } });
    fireEvent.change(selects[1], { target: { value: examId } });

    await waitFor(() => expect((selects[1] as HTMLSelectElement).value).toBe(examId));
}

describe('PdfTemplateExaminationsPage', () => {
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
        setupPermissions();
        mockPreviewMutateAsync.mockResolvedValue(new Blob(['pdf'], { type: 'application/pdf' }));
        mockCreateExportMutateAsync.mockResolvedValue(undefined);
    });

    it('renders a permission denied state without PDF template access', () => {
        setupPermissions({ canView: false, canManage: false, canExport: false });

        render(<PdfTemplateExaminationsPage />);

        expect(screen.getByText(/pdf templates access unavailable/i)).toBeTruthy();
    });

    it('keeps real preview disabled until institution, exam, and export permission are present', async () => {
        setupPermissions({ canExport: false });

        render(<PdfTemplateExaminationsPage />);

        const previewButton = screen.getByRole('button', { name: /generate preview/i });
        expect(previewButton).toHaveProperty('disabled', true);

        await chooseInstitutionAndExam('exam-a');

        expect(previewButton).toHaveProperty('disabled', true);
        expect(mockPreviewMutateAsync).not.toHaveBeenCalled();
    });

    it('sends the selected exam id in the preview payload and opens a new tab', async () => {
        render(<PdfTemplateExaminationsPage />);

        await chooseInstitutionAndExam('exam-a');
        fireEvent.click(screen.getByRole('button', { name: /generate preview/i }));

        await waitFor(() =>
            expect(mockPreviewMutateAsync).toHaveBeenCalledWith(
                expect.objectContaining({
                    institution_id: 'institution-1',
                    exam_id: 'exam-a',
                    document_kind: 'EXAM_ANSWER_KEY',
                }),
            ),
        );
        expect(window.open).toHaveBeenCalledWith('about:blank', '_blank');
        expect(mockPreviewWindow.location.href).toBe('blob:preview-url');
    });

    it('sends different IDs after changing from Exam A to Exam B', async () => {
        render(<PdfTemplateExaminationsPage />);

        await chooseInstitutionAndExam('exam-a');
        fireEvent.click(screen.getByRole('button', { name: /generate preview/i }));
        await waitFor(() => expect(mockPreviewMutateAsync).toHaveBeenCalledTimes(1));

        await chooseInstitutionAndExam('exam-b');
        fireEvent.click(screen.getByRole('button', { name: /generate preview/i }));
        await waitFor(() => expect(mockPreviewMutateAsync).toHaveBeenCalledTimes(2));

        expect(mockPreviewMutateAsync).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({ exam_id: 'exam-a' }),
        );
        expect(mockPreviewMutateAsync).toHaveBeenNthCalledWith(
            2,
            expect.objectContaining({ exam_id: 'exam-b' }),
        );
    });

    it('shows popup blocked and preview error feedback', async () => {
        vi.mocked(window.open).mockReturnValueOnce(null);

        render(<PdfTemplateExaminationsPage />);

        await chooseInstitutionAndExam('exam-a');
        fireEvent.click(screen.getByRole('button', { name: /generate preview/i }));

        await waitFor(() =>
            expect(mockToastError).toHaveBeenCalledWith(
                'Allow pop-ups to open the PDF preview in a new tab.',
            ),
        );
        expect(mockPreviewMutateAsync).not.toHaveBeenCalled();

        mockPreviewMutateAsync.mockRejectedValueOnce(new Error('preview failed'));
        vi.mocked(window.open).mockReturnValueOnce(mockPreviewWindow);
        fireEvent.click(screen.getByRole('button', { name: /generate preview/i }));

        await waitFor(() => expect(mockPreviewWindow.close).toHaveBeenCalled());
        expect(mockToastError).toHaveBeenCalledWith('preview failed');
    });
});
