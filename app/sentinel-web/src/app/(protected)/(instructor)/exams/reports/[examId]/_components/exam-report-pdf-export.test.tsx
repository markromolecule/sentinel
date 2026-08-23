import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@sentinel/services';
import { ExamReportPdfExport } from './exam-report-pdf-export';

const {
    mockInvalidateQueries,
    mockHasPermission,
    mockExportsQuery,
    mockStatusQuery,
    mockCreateMutate,
    mockRetryMutate,
    mockDownloadMutateAsync,
    mockDeleteMutate,
    mockToastSuccess,
    mockToastError,
} = vi.hoisted(() => ({
    mockInvalidateQueries: vi.fn(),
    mockHasPermission: vi.fn(),
    mockExportsQuery: vi.fn(),
    mockStatusQuery: vi.fn(),
    mockCreateMutate: vi.fn(),
    mockRetryMutate: vi.fn(),
    mockDownloadMutateAsync: vi.fn(),
    mockDeleteMutate: vi.fn(),
    mockToastSuccess: vi.fn(),
    mockToastError: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
    useQueryClient: () => ({
        invalidateQueries: mockInvalidateQueries,
    }),
}));

vi.mock('@sentinel/hooks', () => ({
    useActivePermissions: () => ({
        hasPermission: mockHasPermission,
        isLoading: false,
    }),
    useExamReportExportsQuery: mockExportsQuery,
    useExamReportExportStatusQuery: mockStatusQuery,
    useCreateExamReportExportMutation: (options: unknown) => ({
        mutate: (payload: unknown) => mockCreateMutate(payload, options),
        isPending: false,
    }),
    useRetryExamReportExportMutation: (options: unknown) => ({
        mutate: (payload: unknown) => mockRetryMutate(payload, options),
        isPending: false,
    }),
    useExamReportExportDownloadMutation: (options: unknown) => ({
        mutateAsync: (exportId: string) => mockDownloadMutateAsync(exportId, options),
        isPending: false,
    }),
    useDeleteExamReportExportMutation: (options: unknown) => ({
        mutate: (payload: unknown) => mockDeleteMutate(payload, options),
        isPending: false,
    }),
    isPermissionDeniedError: (error: unknown) =>
        error instanceof ApiError
            ? error.status === 403
            : error instanceof Error && error.message.includes('403'),
    getPermissionDeniedMessage: () =>
        'You no longer have permission to export this exam results PDF. Contact support if you need access restored.',
    getErrorMessage: (error: Error, fallbackMessage: string) => error.message || fallbackMessage,
}));

interface MockPanelProps {
    title: string;
    status?: string;
    statusMessage?: string;
    failureMessage?: string;
    permissionMessage?: string;
    disabledMessage?: string;
    liveRegionMessage?: string;
    createLabel?: string;
    retryLabel?: string;
    downloadLabel?: string;
    deleteLabel?: string;
    onCreate?: () => void;
    onRetry?: () => void;
    onDownload?: () => void;
    onDelete?: () => void;
}

vi.mock('@sentinel/ui', () => ({
    Button: ({
        children,
        onClick,
        disabled,
    }: {
        children: React.ReactNode;
        onClick?: () => void;
        disabled?: boolean;
    }) => (
        <button type="button" onClick={onClick} disabled={disabled}>
            {children}
        </button>
    ),
    PdfExportLifecyclePanel: (props: MockPanelProps) => (
        <div>
            <div>{props.title}</div>
            {props.status ? <div>{props.status}</div> : null}
            {props.statusMessage ? <div>{props.statusMessage}</div> : null}
            {props.failureMessage ? <div>{props.failureMessage}</div> : null}
            {props.permissionMessage ? <div>{props.permissionMessage}</div> : null}
            {props.disabledMessage ? <div>{props.disabledMessage}</div> : null}
            {props.liveRegionMessage ? <div>{props.liveRegionMessage}</div> : null}
            {props.onCreate ? (
                <button type="button" onClick={props.onCreate}>
                    {props.createLabel}
                </button>
            ) : null}
            {props.status === 'FAILED' && props.onRetry ? (
                <button type="button" onClick={props.onRetry}>
                    {props.retryLabel}
                </button>
            ) : null}
            {props.status === 'READY' && props.onDownload ? (
                <button type="button" onClick={props.onDownload}>
                    {props.downloadLabel}
                </button>
            ) : null}
            {props.status && props.onDelete ? (
                <button type="button" onClick={props.onDelete}>
                    {props.deleteLabel}
                </button>
            ) : null}
        </div>
    ),
}));

vi.mock('sonner', () => ({
    toast: {
        success: mockToastSuccess,
        error: mockToastError,
    },
}));

describe('ExamReportPdfExport', () => {
    afterEach(() => {
        cleanup();
    });

    beforeEach(() => {
        vi.clearAllMocks();
        mockHasPermission.mockReturnValue(true);
        mockExportsQuery.mockReturnValue({
            data: { records: [], total_records: 0, page: 1, limit: 1 },
            error: null,
        });
        mockStatusQuery.mockReturnValue({
            data: null,
            error: null,
        });
        mockDownloadMutateAsync.mockResolvedValue({
            success: true,
            downloadUrl: 'https://signed.example/exam-report.pdf',
        });
        vi.stubGlobal('window', {
            open: vi.fn(() => ({})),
        } as unknown as Window & typeof globalThis);
    });

    it('hides the export control when the user lacks permission', () => {
        mockHasPermission.mockReturnValue(false);

        render(<ExamReportPdfExport examId="exam-1" />);

        expect(screen.queryByText('Export Results PDF')).toBeNull();
    });

    it('creates an export using only the route exam id', () => {
        render(<ExamReportPdfExport examId="exam-1" />);

        fireEvent.click(screen.getByRole('button', { name: 'Export Results PDF' }));

        expect(mockCreateMutate).toHaveBeenCalledWith({ exam_id: 'exam-1' }, expect.any(Object));
    });

    it('creates a section-filtered export when sectionId prop is provided', () => {
        render(<ExamReportPdfExport examId="exam-1" sectionId="section-123" />);

        fireEvent.click(screen.getByRole('button', { name: 'Export Results PDF' }));

        expect(mockCreateMutate).toHaveBeenCalledWith(
            { exam_id: 'exam-1', section_id: 'section-123' },
            expect.any(Object),
        );
    });

    it('renders a compact header button variant that creates an export', () => {
        render(<ExamReportPdfExport examId="exam-1" variant="button" />);

        fireEvent.click(screen.getByRole('button', { name: /export results pdf/i }));

        expect(screen.queryByText('Create and manage a PDF export')).toBeNull();
        expect(mockCreateMutate).toHaveBeenCalledWith({ exam_id: 'exam-1' }, expect.any(Object));
    });

    it('renders pending and generating statuses from the latest export record', () => {
        mockExportsQuery.mockReturnValueOnce({
            data: {
                records: [{ exportId: 'export-1', status: 'PENDING', failureMessage: null }],
                total_records: 1,
                page: 1,
                limit: 1,
            },
            error: null,
        });

        const { rerender } = render(<ExamReportPdfExport examId="exam-1" />);

        expect(screen.getByText('PENDING')).toBeTruthy();

        mockExportsQuery.mockReturnValueOnce({
            data: {
                records: [{ exportId: 'export-1', status: 'GENERATING', failureMessage: null }],
                total_records: 1,
                page: 1,
                limit: 1,
            },
            error: null,
        });

        rerender(<ExamReportPdfExport examId="exam-1" />);

        expect(screen.getByText('GENERATING')).toBeTruthy();
    });

    it('downloads a ready export through a popup-safe window.open call', async () => {
        mockExportsQuery.mockReturnValue({
            data: {
                records: [{ exportId: 'export-1', status: 'READY', failureMessage: null }],
                total_records: 1,
                page: 1,
                limit: 1,
            },
            error: null,
        });

        render(<ExamReportPdfExport examId="exam-1" />);

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Download PDF' }));
        });

        expect(mockDownloadMutateAsync).toHaveBeenCalledWith('export-1', expect.any(Object));
        expect(window.open).toHaveBeenCalledWith(
            'https://signed.example/exam-report.pdf',
            '_blank',
            'noopener,noreferrer',
        );
    });

    it('shows blocked-popup feedback without leaking the signed url', async () => {
        vi.stubGlobal('window', {
            open: vi.fn(() => null),
        } as unknown as Window & typeof globalThis);

        mockExportsQuery.mockReturnValue({
            data: {
                records: [{ exportId: 'export-1', status: 'READY', failureMessage: null }],
                total_records: 1,
                page: 1,
                limit: 1,
            },
            error: null,
        });

        render(<ExamReportPdfExport examId="exam-1" />);

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Download PDF' }));
        });

        expect(mockToastError).toHaveBeenCalledWith(
            'Your browser blocked the PDF download. Allow pop-ups and try again.',
        );
        expect(mockToastError).not.toHaveBeenCalledWith(
            expect.stringContaining('https://signed.example'),
        );
    });

    it('shows failed exports with retry and expired exports without retry', () => {
        mockExportsQuery.mockReturnValueOnce({
            data: {
                records: [
                    {
                        exportId: 'export-1',
                        status: 'FAILED',
                        failureMessage: 'Renderer timed out.',
                    },
                ],
                total_records: 1,
                page: 1,
                limit: 1,
            },
            error: null,
        });

        const { rerender } = render(<ExamReportPdfExport examId="exam-1" />);

        expect(screen.getByText('FAILED')).toBeTruthy();
        expect(screen.getByText('Renderer timed out.')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Retry Export' }));
        expect(mockRetryMutate).toHaveBeenCalledWith(
            {
                exportId: 'export-1',
                examId: 'exam-1',
                page: 1,
                limit: 1,
            },
            expect.any(Object),
        );

        mockExportsQuery.mockReturnValueOnce({
            data: {
                records: [{ exportId: 'export-2', status: 'EXPIRED', failureMessage: null }],
                total_records: 1,
                page: 1,
                limit: 1,
            },
            error: null,
        });

        rerender(<ExamReportPdfExport examId="exam-1" />);

        expect(screen.getByText('EXPIRED')).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Retry Export' })).toBeNull();
    });

    it('deletes the current export', () => {
        mockExportsQuery.mockReturnValue({
            data: {
                records: [{ exportId: 'export-1', status: 'READY', failureMessage: null }],
                total_records: 1,
                page: 1,
                limit: 1,
            },
            error: null,
        });

        render(<ExamReportPdfExport examId="exam-1" />);

        fireEvent.click(screen.getByRole('button', { name: 'Delete Export' }));

        expect(mockDeleteMutate).toHaveBeenCalledWith(
            {
                exportId: 'export-1',
                examId: 'exam-1',
                page: 1,
                limit: 1,
            },
            expect.any(Object),
        );
    });
});
