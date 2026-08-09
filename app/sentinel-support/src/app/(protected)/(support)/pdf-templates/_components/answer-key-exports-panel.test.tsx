import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AnswerKeyExportsPanel } from './answer-key-exports-panel';
import type { ExamAnswerKeyExportRecord } from '@/data';

vi.mock('@/components/common/status-badge', () => ({
    StatusBadge: ({ status }: { status: string }) => (
        <span data-testid="status-badge">{status}</span>
    ),
}));

vi.mock('@sentinel/ui', () => ({
    Button: ({ children, onClick, disabled }: any) => (
        <button disabled={disabled} onClick={onClick}>
            {children}
        </button>
    ),
    Card: ({ children }: any) => <div>{children}</div>,
    CardContent: ({ children }: any) => <div>{children}</div>,
    CardDescription: ({ children }: any) => <div>{children}</div>,
    CardHeader: ({ children }: any) => <div>{children}</div>,
    CardTitle: ({ children }: any) => <div>{children}</div>,
}));

const mockExports: ExamAnswerKeyExportRecord[] = [
    {
        exportId: 'export-ready-1',
        examId: 'exam-1',
        institutionId: 'inst-1',
        templateId: null,
        status: 'READY',
        failureCode: null,
        failureMessage: null,
        retryCount: 0,
        createdBy: null,
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: '2026-08-01T00:00:00.000Z',
        completedAt: '2026-08-01T00:01:00.000Z',
    },
    {
        exportId: 'export-failed-1',
        examId: 'exam-1',
        institutionId: 'inst-1',
        templateId: null,
        status: 'FAILED',
        failureCode: 'RENDER_ERROR',
        failureMessage: 'PDF generation failed',
        retryCount: 0,
        createdBy: null,
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: '2026-08-01T00:00:00.000Z',
        completedAt: null,
    },
];

describe('AnswerKeyExportsPanel', () => {
    it('renders list of exports with correct statuses', () => {
        render(
            <AnswerKeyExportsPanel
                exports={mockExports}
                onDownload={vi.fn()}
                onRetry={vi.fn()}
                onDelete={vi.fn()}
            />,
        );

        expect(screen.getByText('export-ready-1')).toBeTruthy();
        expect(screen.getByText('export-failed-1')).toBeTruthy();
        expect(screen.getByText('PDF generation failed')).toBeTruthy();
    });

    it('enforces button state based on canExport and canManage permissions', () => {
        const { rerender } = render(
            <AnswerKeyExportsPanel
                exports={mockExports}
                onDownload={vi.fn()}
                onRetry={vi.fn()}
                onDelete={vi.fn()}
                canExport={false}
                canManage={false}
            />,
        );

        // Download, Retry, and Delete should all be disabled
        const downloadBtns = screen.getAllByRole('button', { name: /download/i });
        const retryBtns = screen.getAllByRole('button', { name: /retry/i });
        const deleteBtns = screen.getAllByRole('button', { name: /delete/i });

        expect(downloadBtns[0]).toHaveProperty('disabled', true);
        expect(retryBtns[0]).toHaveProperty('disabled', true);
        expect(deleteBtns[0]).toHaveProperty('disabled', true);

        // Rerender with permissions enabled
        rerender(
            <AnswerKeyExportsPanel
                exports={mockExports}
                onDownload={vi.fn()}
                onRetry={vi.fn()}
                onDelete={vi.fn()}
                canExport={true}
                canManage={true}
            />,
        );

        const enabledDownloadBtns = screen.getAllByRole('button', { name: /download/i });
        const enabledRetryBtns = screen.getAllByRole('button', { name: /retry/i });
        const enabledDeleteBtns = screen.getAllByRole('button', { name: /delete/i });

        expect(enabledDownloadBtns[0]).toHaveProperty('disabled', false);
        expect(enabledRetryBtns[0]).toHaveProperty('disabled', false);
        expect(enabledDeleteBtns[0]).toHaveProperty('disabled', false);
    });

    it('triggers action callbacks when buttons are clicked', () => {
        const onDownload = vi.fn();
        const onRetry = vi.fn();
        const onDelete = vi.fn();

        render(
            <AnswerKeyExportsPanel
                exports={mockExports}
                onDownload={onDownload}
                onRetry={onRetry}
                onDelete={onDelete}
                canExport={true}
                canManage={true}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: /download/i }));
        fireEvent.click(screen.getByRole('button', { name: /retry/i }));
        fireEvent.click(screen.getAllByRole('button', { name: /delete/i })[0]);

        expect(onDownload).toHaveBeenCalledWith('export-ready-1');
        expect(onRetry).toHaveBeenCalledWith('export-failed-1');
        expect(onDelete).toHaveBeenCalledWith('export-ready-1');
    });
});
