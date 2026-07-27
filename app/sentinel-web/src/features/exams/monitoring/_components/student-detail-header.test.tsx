import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StudentDetailHeader } from './student-detail-header';

const back = vi.fn();
const scrollIntoView = vi.fn();

vi.mock('next/navigation', () => ({
    useRouter: () => ({
        back,
    }),
}));

describe('StudentDetailHeader', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        document.body.innerHTML = '';
        Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
            configurable: true,
            value: scrollIntoView,
        });
    });

    it('shows the evidence shortcut only when a focusable incident exists', () => {
        const { rerender } = render(<StudentDetailHeader examId="exam-12345678" />);

        expect(screen.queryByText('View Evidence')).toBeNull();

        rerender(
            <StudentDetailHeader
                examId="exam-12345678"
                focusIncidentId="incident-12345678"
            />,
        );

        expect(screen.getByText('View Evidence')).toBeTruthy();
    });

    it('scrolls to the incident evidence section when requested', () => {
        const target = document.createElement('div');
        target.id = 'incident-evidence-incident-12345678';
        document.body.appendChild(target);

        render(
            <StudentDetailHeader
                examId="exam-12345678"
                focusIncidentId="incident-12345678"
            />,
        );

        fireEvent.click(screen.getByText('View Evidence'));

        expect(scrollIntoView).toHaveBeenCalled();
    });
});
