import {
    cleanup,
    fireEvent,
    render,
    screen,
} from '../../../../app/sentinel-web/node_modules/@testing-library/react/dist/index.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PdfExportLifecyclePanel } from './pdf-export-lifecycle-panel';

describe('PdfExportLifecyclePanel', () => {
    afterEach(() => {
        cleanup();
    });

    it('renders the idle create state with an accessible create button name', () => {
        const onCreate = vi.fn();

        render(<PdfExportLifecyclePanel onCreate={onCreate} />);

        const button = screen.getByRole('button', { name: /create pdf export/i });
        fireEvent.click(button);

        expect(onCreate).toHaveBeenCalledOnce();
        expect(screen.getByText(/no export has been created/i)).toBeTruthy();
    });

    it('renders pending and generating lifecycle states', () => {
        const { rerender } = render(
            <PdfExportLifecyclePanel status="PENDING" onCreate={vi.fn()} onDelete={vi.fn()} />,
        );

        expect(screen.getAllByText('Pending').length).toBeGreaterThan(0);
        expect(screen.getAllByText(/generation will start shortly/i).length).toBeGreaterThan(0);

        rerender(
            <PdfExportLifecyclePanel status="GENERATING" onCreate={vi.fn()} onDelete={vi.fn()} />,
        );

        expect(screen.getAllByText('Generating').length).toBeGreaterThan(0);
        expect(screen.getAllByText(/generation is in progress/i).length).toBeGreaterThan(0);
    });

    it('renders ready state with download and delete actions', () => {
        const onDownload = vi.fn();
        const onDelete = vi.fn();

        render(
            <PdfExportLifecyclePanel
                status="READY"
                onCreate={vi.fn()}
                onDownload={onDownload}
                onDelete={onDelete}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: /download pdf export/i }));
        fireEvent.click(screen.getByRole('button', { name: /delete pdf export/i }));

        expect(onDownload).toHaveBeenCalledOnce();
        expect(onDelete).toHaveBeenCalledOnce();
    });

    it('renders lifecycle actions as popup-safe buttons', () => {
        render(
            <PdfExportLifecyclePanel
                status="READY"
                onCreate={vi.fn()}
                onDownload={vi.fn()}
                onDelete={vi.fn()}
            />,
        );

        expect(screen.getByRole('button', { name: /create pdf export/i })).toHaveProperty(
            'type',
            'button',
        );
        expect(screen.getByRole('button', { name: /download pdf export/i })).toHaveProperty(
            'type',
            'button',
        );
    });

    it('shows retry only for failed exports and surfaces failure copy', () => {
        const onRetry = vi.fn();
        const { rerender } = render(
            <PdfExportLifecyclePanel
                status="FAILED"
                failureMessage="The renderer timed out."
                onCreate={vi.fn()}
                onRetry={onRetry}
                onDelete={vi.fn()}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: /retry pdf export/i }));

        expect(onRetry).toHaveBeenCalledOnce();
        expect(screen.getByText(/renderer timed out/i)).toBeTruthy();

        rerender(<PdfExportLifecyclePanel status="READY" onCreate={vi.fn()} onDelete={vi.fn()} />);

        expect(screen.queryByRole('button', { name: /retry pdf export/i })).toBeNull();

        rerender(
            <PdfExportLifecyclePanel
                status="FAILED"
                onCreate={vi.fn()}
                onDownload={vi.fn()}
                onDelete={vi.fn()}
            />,
        );

        expect(screen.queryByRole('button', { name: /download pdf export/i })).toBeNull();
    });

    it('renders expired messaging without a retry action', () => {
        render(
            <PdfExportLifecyclePanel
                status="EXPIRED"
                onCreate={vi.fn()}
                onRetry={vi.fn()}
                onDelete={vi.fn()}
            />,
        );

        expect(screen.getAllByText('Expired').length).toBeGreaterThan(0);
        expect(screen.getAllByText(/has expired/i).length).toBeGreaterThan(0);
        expect(screen.queryByRole('button', { name: /retry pdf export/i })).toBeNull();
    });

    it('renders disabled permission state and disables actions', () => {
        render(
            <PdfExportLifecyclePanel
                status="READY"
                permissionMessage="You do not have permission to export this PDF."
                onCreate={vi.fn()}
                onDownload={vi.fn()}
                onDelete={vi.fn()}
            />,
        );

        expect(screen.getByText(/permission required/i)).toBeTruthy();
        expect(screen.getByRole('button', { name: /create pdf export/i })).toHaveProperty(
            'disabled',
            true,
        );
        expect(screen.getByRole('button', { name: /download pdf export/i })).toHaveProperty(
            'disabled',
            true,
        );
    });

    it('supports keyboard operation for lifecycle actions', () => {
        const onDownload = vi.fn();

        render(
            <PdfExportLifecyclePanel
                status="READY"
                onCreate={vi.fn()}
                onDownload={onDownload}
                onDelete={vi.fn()}
            />,
        );

        fireEvent.keyDown(screen.getByRole('button', { name: /download pdf export/i }), {
            key: 'Enter',
        });

        expect(onDownload).toHaveBeenCalledOnce();
    });

    it('announces explicit live-region updates', () => {
        render(
            <PdfExportLifecyclePanel
                status="GENERATING"
                liveRegionMessage="PDF generation is still running."
                onCreate={vi.fn()}
                onDelete={vi.fn()}
            />,
        );

        expect(screen.getByText(/pdf generation is still running/i).getAttribute('aria-live')).toBe(
            'polite',
        );
    });
});
