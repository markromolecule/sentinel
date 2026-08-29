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
        studentId: 'student-123',
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

    it('does not render the deprecated Force Submit button', () => {
        render(<IntegrityTimelineCard {...defaultProps} />);
        expect(screen.queryByText('Force Submit')).toBeNull();
    });


    it('does not render View Evidence button when focusIncidentId is not provided', () => {
        render(<IntegrityTimelineCard {...defaultProps} />);
        expect(screen.queryByText('View Evidence')).toBeNull();
    });

    it('renders View Evidence button when focusIncidentId is provided', () => {
        render(<IntegrityTimelineCard {...defaultProps} focusIncidentId="incident-999" />);
        expect(screen.getByText('View Evidence')).toBeTruthy();
    });

    it('scrolls to the evidence section when View Evidence button is clicked', () => {
        const scrollIntoViewMock = vi.fn();
        const targetElement = document.createElement('div');
        targetElement.id = 'incident-evidence-incident-999';
        document.body.appendChild(targetElement);
        Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
            configurable: true,
            value: scrollIntoViewMock,
        });

        render(<IntegrityTimelineCard {...defaultProps} focusIncidentId="incident-999" />);
        fireEvent.click(screen.getByText('View Evidence'));

        expect(scrollIntoViewMock).toHaveBeenCalled();
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
