import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StudentDetailHeader } from './student-detail-header';

const back = vi.fn();

vi.mock('next/navigation', () => ({
    useRouter: () => ({
        back,
    }),
}));

describe('StudentDetailHeader', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders the back button and handles back navigation', () => {
        render(<StudentDetailHeader />);

        const backButton = screen.getByText('Back to Monitoring');
        expect(backButton).toBeTruthy();

        fireEvent.click(backButton);
        expect(back).toHaveBeenCalled();
    });
});
