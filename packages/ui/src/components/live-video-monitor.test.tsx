import {
    cleanup,
    fireEvent,
    render,
    screen,
} from '../../../../app/sentinel-web/node_modules/@testing-library/react/dist/index.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LiveVideoMonitor } from './live-video-monitor';

describe('LiveVideoMonitor', () => {
    afterEach(() => {
        cleanup();
    });

    it('shows start only while idle and eligible', () => {
        const onStart = vi.fn();
        render(
            <LiveVideoMonitor
                state="idle"
                videoRef={vi.fn()}
                onStart={onStart}
                onStop={vi.fn()}
                onRetry={vi.fn()}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: /start live view/i }));
        expect(onStart).toHaveBeenCalledTimes(1);
        expect(screen.queryByText('LIVE')).toBeNull();
    });

    it('renders LIVE only for the live state and keeps the video muted inline', () => {
        render(
            <LiveVideoMonitor
                state="live"
                videoRef={vi.fn()}
                onStart={vi.fn()}
                onStop={vi.fn()}
                onRetry={vi.fn()}
            />,
        );

        const video = screen.getByLabelText(/authorized live camera view/i) as HTMLVideoElement;
        expect(screen.getByText('LIVE')).toBeTruthy();
        expect(video.muted).toBe(true);
        expect(video.autoplay).toBe(true);
        expect(video.playsInline).toBe(true);
        expect(screen.queryByText(/record/i)).toBeNull();
    });

    it('renders denied and retry states without exposing provider identifiers', () => {
        render(
            <LiveVideoMonitor
                state="failed"
                reason="PERMISSION_DENIED"
                videoRef={vi.fn()}
                onStart={vi.fn()}
                onStop={vi.fn()}
                onRetry={vi.fn()}
            />,
        );

        expect(screen.getAllByText(/live view denied/i).length).toBeGreaterThan(0);
        expect(screen.getByRole('button', { name: /retry live view/i })).toBeTruthy();
        expect(screen.queryByText(/token|room|livekit/i)).toBeNull();
    });

    it('renders waitingProgress when provided during waiting state', () => {
        render(
            <LiveVideoMonitor
                state="waiting_for_student"
                waitingProgress="Waiting for student device (10s)..."
                videoRef={vi.fn()}
                onStart={vi.fn()}
                onStop={vi.fn()}
                onRetry={vi.fn()}
            />,
        );

        expect(
            screen.getAllByText(/Waiting for student device \(10s\)\.\.\./i).length,
        ).toBeGreaterThan(0);
    });

    it('renders correct labels for new reason codes like TIMEOUT and NO_LIVE_CAMERA_TRACK', () => {
        const { rerender } = render(
            <LiveVideoMonitor
                state="failed"
                reason="TIMEOUT"
                videoRef={vi.fn()}
                onStart={vi.fn()}
                onStop={vi.fn()}
                onRetry={vi.fn()}
            />,
        );

        expect(screen.getAllByText(/Student connection timed out/i).length).toBeGreaterThan(0);

        rerender(
            <LiveVideoMonitor
                state="failed"
                reason="NO_LIVE_CAMERA_TRACK"
                videoRef={vi.fn()}
                onStart={vi.fn()}
                onStop={vi.fn()}
                onRetry={vi.fn()}
            />,
        );

        expect(screen.getAllByText(/Student camera not ready/i).length).toBeGreaterThan(0);

        rerender(
            <LiveVideoMonitor
                state="failed"
                reason="LIVEKIT_CONNECT_FAILED"
                videoRef={vi.fn()}
                onStart={vi.fn()}
                onStop={vi.fn()}
                onRetry={vi.fn()}
            />,
        );

        expect(screen.getAllByText(/Student live connection failed/i).length).toBeGreaterThan(0);

        rerender(
            <LiveVideoMonitor
                state="failed"
                reason="CONFLICT"
                videoRef={vi.fn()}
                onStart={vi.fn()}
                onStop={vi.fn()}
                onRetry={vi.fn()}
            />,
        );

        expect(
            screen.getAllByText(/Student is currently under live inspection by another proctor/i).length,
        ).toBeGreaterThan(0);
    });
});
