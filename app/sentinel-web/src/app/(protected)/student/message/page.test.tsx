import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import StudentMessagePage from './page';

vi.mock('@/features/messaging', () => ({
    MessagingPageClient: () => <div data-testid="messaging-page-client">Client Page</div>,
    MessagingPageSkeleton: () => <div data-testid="messaging-page-skeleton">Skeleton Loading</div>,
}));

describe('StudentMessagePage', () => {
    it('renders MessagingPageClient inside page content', () => {
        render(<StudentMessagePage />);
        expect(screen.getByTestId('messaging-page-client')).toBeTruthy();
    });
});
