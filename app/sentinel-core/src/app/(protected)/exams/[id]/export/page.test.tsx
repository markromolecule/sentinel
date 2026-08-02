import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@sentinel/services';
import type { ReactNode } from 'react';
import ExamExportPage from './page';

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

vi.mock('next/navigation', () => ({
    useParams: () => ({ id: 'exam-1' }),
}));

vi.mock('next/link', () => ({
    default: ({ href, children }: { href: string; children: ReactNode }) => (
        <a href={href}>{children}</a>
    ),
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
    useAnswerKeyExportsQuery: mockExportsQuery,
    useAnswerKeyExportStatusQuery: mockStatusQuery,
    useCreateAnswerKeyExportMutation: (options: unknown) => ({
        mutate: (payload: unknown) => mockCreateMutate(payload, options),
        isPending: false,
    }),
    useRetryAnswerKeyExportMutation: (options: unknown) => ({
        mutate: (payload: unknown) => mockRetryMutate(payload, options),
        isPending: false,
    }),
    useAnswerKeyExportDownloadMutation: (options: unknown) => ({
        mutateAsync: (exportId: string) => mockDownloadMutateAsync(exportId, options),
        isPending: false,
    }),
    useDeleteAnswerKeyExportMutation: (options: unknown) => ({
        mutate: (payload: unknown) => mockDeleteMutate(payload, options),
        isPending: false,
    }),
    isPermissionDeniedError: (error: unknown) =>
        error instanceof ApiError
            ? error.status === 403
            : error instanceof Error && error.message.includes('403'),
    getPermissionDeniedMessage: () =>
        'You no longer have permission to export this examination answer key PDF. Contact support if you need access restored.',
    getErrorMessage: (error: Error, fallbackMessage: string) => error.message || fallbackMessage,
}));

interface MockPanelProps {
    title: string;
    status?: string | null;
    statusMessage?: string | null;
    failureMessage?: string | null;
    permissionMessage?: string;
    disabledMessage?: string | null;
    liveRegionMessage?: string | null;
    createLabel?: string;
    retryLabel?: string;
    downloadLabel?: string;
    deleteLabel?: string;
    onCreate?: (() => void) | null;
    onRetry?: (() => void) | null;
    onDownload?: (() => void) | null;
    onDelete?: (() => void) | null;
}

vi.mock('@sentinel/ui', () => ({
    Button: ({ children }: { children: ReactNode }) => <button type="button">{children}</button>,
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
                <button
                    type="button"
                    disabled={Boolean(props.permissionMessage)}
                    onClick={props.onCreate}
                >
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

const readyExport = {
    exportId: 'export-1',
    examId: 'exam-1',
    institutionId: 'institution-1',
    status: 'READY',
    failureMessage: null,
};

describe('ExamExportPage', () => {
    afterEach(() => {
        cleanup();
    });

    beforeEach(() => {
        vi.clearAllMocks();
        mockHasPermission.mockReturnValue(true);
        mockExportsQuery.mockReturnValue({
            data: { records: [], total_records: 0, page: 1, limit: 1 },
            error: null,
            isLoading: false,
        });
        mockStatusQuery.mockReturnValue({
            data: null,
            error: null,
        });
        mockDownloadMutateAsync.mockResolvedValue({
            success: true,
            downloadUrl: 'https://signed.example/answer-key.pdf',
        });
        vi.stubGlobal('window', {
            open: vi.fn(() => ({})),
            localStorage: { setItem: vi.fn() },
            sessionStorage: { setItem: vi.fn() },
        } as unknown as Window & typeof globalThis);
    });

    it('shows a permission-denied lifecycle state without answer-key actions when permission is revoked', () => {
        mockHasPermission.mockReturnValue(false);

        render(<ExamExportPage />);

        expect(screen.getByRole('heading', { name: /examination answer key pdf/i })).toBeTruthy();
        expect(
            screen.getByText(
                /no longer have permission to export this examination answer key pdf/i,
            ),
        ).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Create Answer Key PDF' })).toHaveProperty(
            'disabled',
            true,
        );
        expect(mockExportsQuery).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
    });

    it('creates explicitly from the route exam id and does not auto-create on remount', () => {
        const { unmount } = render(<ExamExportPage />);

        expect(mockCreateMutate).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', { name: 'Create Answer Key PDF' }));
        expect(mockCreateMutate).toHaveBeenCalledWith({ exam_id: 'exam-1' }, expect.any(Object));

        unmount();
        render(<ExamExportPage />);

        expect(mockCreateMutate).toHaveBeenCalledTimes(1);
    });

    it('shows the newly created export immediately after create succeeds', () => {
        mockCreateMutate.mockImplementation(
            (_payload, options: { onSuccess: (record: typeof readyExport) => void }) => {
                options.onSuccess({ ...readyExport, status: 'PENDING' });
            },
        );

        render(<ExamExportPage />);

        fireEvent.click(screen.getByRole('button', { name: 'Create Answer Key PDF' }));

        expect(screen.getByText('PENDING')).toBeTruthy();
        expect(screen.getByText('Examination answer key PDF export requested.')).toBeTruthy();
        expect(mockStatusQuery).toHaveBeenLastCalledWith('export-1', {
            enabled: true,
        });
    });

    it('replaces an optimistic pending export with the refreshed server status', () => {
        mockCreateMutate.mockImplementation(
            (_payload, options: { onSuccess: (record: typeof readyExport) => void }) => {
                options.onSuccess({ ...readyExport, status: 'PENDING' });
            },
        );

        const { rerender } = render(<ExamExportPage />);

        fireEvent.click(screen.getByRole('button', { name: 'Create Answer Key PDF' }));
        expect(screen.getByText('PENDING')).toBeTruthy();

        mockStatusQuery.mockReturnValue({
            data: readyExport,
            error: null,
        });

        rerender(<ExamExportPage />);

        expect(screen.getByText('READY')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Download PDF' })).toBeTruthy();
        expect(screen.queryByText('PENDING')).toBeNull();
    });

    it('polls latest export status through the answer-key status hook', () => {
        mockExportsQuery.mockReturnValue({
            data: {
                records: [{ ...readyExport, status: 'GENERATING' }],
                total_records: 1,
                page: 1,
                limit: 1,
            },
            error: null,
            isLoading: false,
        });

        render(<ExamExportPage />);

        expect(mockStatusQuery).toHaveBeenCalledWith('export-1', {
            enabled: true,
        });
    });

    it('downloads a ready export from a click with popup-safe options and no stored signed url', async () => {
        mockExportsQuery.mockReturnValue({
            data: { records: [readyExport], total_records: 1, page: 1, limit: 1 },
            error: null,
            isLoading: false,
        });

        render(<ExamExportPage />);

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Download PDF' }));
        });

        expect(mockDownloadMutateAsync).toHaveBeenCalledWith('export-1', expect.any(Object));
        expect(window.open).toHaveBeenCalledWith(
            'https://signed.example/answer-key.pdf',
            '_blank',
            'noopener,noreferrer',
        );
        expect(window.localStorage.setItem).not.toHaveBeenCalled();
        expect(window.sessionStorage.setItem).not.toHaveBeenCalled();
        expect(mockToastSuccess).not.toHaveBeenCalledWith(
            expect.stringContaining('https://signed.example'),
        );
    });

    it('does not show a blocked-popup error when a noopener download returns no window handle', async () => {
        mockExportsQuery.mockReturnValue({
            data: { records: [readyExport], total_records: 1, page: 1, limit: 1 },
            error: null,
            isLoading: false,
        });
        vi.stubGlobal('window', {
            open: vi.fn(() => null),
            localStorage: { setItem: vi.fn() },
            sessionStorage: { setItem: vi.fn() },
        } as unknown as Window & typeof globalThis);

        render(<ExamExportPage />);

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Download PDF' }));
        });

        expect(mockToastError).not.toHaveBeenCalledWith(
            'Your browser blocked the PDF download. Allow pop-ups and try again.',
        );
    });

    it('retries only failed exports and deletes the current export', () => {
        mockExportsQuery.mockReturnValue({
            data: {
                records: [{ ...readyExport, status: 'FAILED', failureMessage: 'Renderer failed.' }],
                total_records: 1,
                page: 1,
                limit: 1,
            },
            error: null,
            isLoading: false,
        });

        render(<ExamExportPage />);

        fireEvent.click(screen.getByRole('button', { name: 'Retry Export' }));
        fireEvent.click(screen.getByRole('button', { name: 'Delete Export' }));

        expect(mockRetryMutate).toHaveBeenCalledWith(
            {
                exportId: 'export-1',
                institutionId: 'institution-1',
                examId: 'exam-1',
            },
            expect.any(Object),
        );
        expect(mockDeleteMutate).toHaveBeenCalledWith(
            {
                exportId: 'export-1',
                institutionId: 'institution-1',
                examId: 'exam-1',
            },
            expect.any(Object),
        );
    });

    it('removes the deleted export from the panel immediately after delete succeeds', () => {
        mockExportsQuery.mockReturnValue({
            data: { records: [readyExport], total_records: 1, page: 1, limit: 1 },
            error: null,
            isLoading: false,
        });
        mockDeleteMutate.mockImplementation((_payload, options: { onSuccess: () => void }) => {
            options.onSuccess();
        });

        render(<ExamExportPage />);

        fireEvent.click(screen.getByRole('button', { name: 'Delete Export' }));

        expect(screen.queryByText('READY')).toBeNull();
        expect(screen.queryByRole('button', { name: 'Download PDF' })).toBeNull();
        expect(screen.getByText('Examination answer key PDF export deleted.')).toBeTruthy();
    });

    it('surfaces stale-permission 403 errors from mutations', () => {
        mockCreateMutate.mockImplementation(
            (_payload, options: { onError: (error: Error) => void }) => {
                options.onError(
                    new ApiError({
                        message: 'Forbidden',
                        status: 403,
                        statusText: 'Forbidden',
                    }),
                );
            },
        );

        render(<ExamExportPage />);

        fireEvent.click(screen.getByRole('button', { name: 'Create Answer Key PDF' }));

        expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['user'] });
        expect(mockToastError).toHaveBeenCalledWith(
            expect.stringContaining('export this examination answer key PDF'),
        );
    });

    it('shows missing exam and API errors from answer-key endpoints only', () => {
        mockExportsQuery.mockReturnValue({
            data: null,
            error: new Error('Exam not found'),
            isLoading: false,
        });

        render(<ExamExportPage />);

        expect(screen.getByText('Exam not found')).toBeTruthy();
        expect(mockExportsQuery).toHaveBeenCalledWith(
            expect.objectContaining({
                payload: {
                    examId: 'exam-1',
                    page: 1,
                    limit: 1,
                },
            }),
        );
        expect(screen.queryByText(/correct answer from exam.questions/i)).toBeNull();
    });
});
