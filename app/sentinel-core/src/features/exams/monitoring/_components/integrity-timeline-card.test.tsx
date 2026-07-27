import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IntegrityTimelineCard } from './integrity-timeline-card';

// Mock the child FlaggingTimeline component
vi.mock('./flagging-timeline', () => ({
    FlaggingTimeline: () => <div data-testid="flagging-timeline" />,
}));

describe('IntegrityTimelineCard', () => {
    const defaultProps = {
        flags: [],
        examId: 'exam-123456789',
        lifecycleEvents: [],
        onRefresh: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        document.body.innerHTML = '';
    });

    it('renders the header titles', () => {
        render(<IntegrityTimelineCard {...defaultProps} />);
        expect(screen.getByText('Integrity Timeline')).toBeTruthy();
        expect(screen.getByText('Chronological log of flagged incidents')).toBeTruthy();
    });

    it('displays the sliced exam ID', () => {
        render(<IntegrityTimelineCard {...defaultProps} />);
        expect(screen.getByText('EXAM ID: exam-123')).toBeTruthy();
    });

    it('renders the Force Submit button', () => {
        render(<IntegrityTimelineCard {...defaultProps} />);
        expect(screen.getByText('Force Submit')).toBeTruthy();
    });

    it('renders the Capture Frame button', () => {
        render(<IntegrityTimelineCard {...defaultProps} />);
        expect(screen.getByText('Capture Frame')).toBeTruthy();
    });

    it('calls onRefresh when Refresh button is clicked', () => {
        render(<IntegrityTimelineCard {...defaultProps} />);
        fireEvent.click(screen.getByText('Refresh'));
        expect(defaultProps.onRefresh).toHaveBeenCalled();
    });

    it('disables Refresh button and shows Refreshing... when isRefreshing is true', () => {
        render(<IntegrityTimelineCard {...defaultProps} isRefreshing={true} />);
        const refreshBtn = screen.getByRole('button', { name: 'Refreshing...' });
        expect(refreshBtn).toBeTruthy();
        expect(refreshBtn.hasAttribute('disabled')).toBe(true);
    });
});
