import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { DashboardProfileDropdown } from './dashboard-profile-dropdown';
import { useAuth, useProfileQuery } from '@sentinel/hooks';
import React from 'react';

vi.mock('@sentinel/hooks', () => ({
    useLogoutMutation: () => ({
        mutate: vi.fn(),
    }),
    useProfileQuery: vi.fn(),
    useAuth: vi.fn(),
}));

vi.mock('next-themes', () => ({
    useTheme: () => ({
        theme: 'light',
        setTheme: vi.fn(),
    }),
}));

vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: vi.fn(),
    }),
}));

vi.mock('@sentinel/ui', () => ({
    DropdownMenu: ({ children }: any) => <div data-testid="mock-dropdown">{children}</div>,
    DropdownMenuTrigger: ({ children }: any) => <div data-testid="mock-trigger">{children}</div>,
    DropdownMenuContent: ({ children }: any) => <div data-testid="mock-content">{children}</div>,
    DropdownMenuLabel: ({ children }: any) => <div>{children}</div>,
    DropdownMenuSeparator: () => <hr />,
    DropdownMenuItem: ({ children, onClick }: any) => <div onClick={onClick}>{children}</div>,
}));

afterEach(() => {
    cleanup();
});

describe('DashboardProfileDropdown', () => {
    beforeEach(() => {
        vi.mocked(useAuth).mockReturnValue({
            user: { user_metadata: {} },
        } as unknown as ReturnType<typeof useAuth>);
    });

    it('renders fallback skeleton when loading', () => {
        vi.mocked(useProfileQuery).mockReturnValue({
            profile: null,
            isLoading: true,
        } as unknown as ReturnType<typeof useProfileQuery>);

        const { container } = render(<DashboardProfileDropdown />);
        const skeleton = container.querySelector('.animate-pulse');
        expect(skeleton).toBeTruthy();
    });

    it('renders user initials', () => {
        vi.mocked(useProfileQuery).mockReturnValue({
            profile: {
                email: 'test@example.com',
                firstName: 'Admin',
                lastName: 'User',
            },
            isLoading: false,
        } as unknown as ReturnType<typeof useProfileQuery>);

        render(<DashboardProfileDropdown />);
        expect(screen.getByText('AU')).toBeTruthy();
    });

    it('renders full name and email in dropdown label on click', () => {
        vi.mocked(useProfileQuery).mockReturnValue({
            profile: {
                email: 'test@example.com',
                firstName: 'Admin',
                lastName: 'User',
            },
            isLoading: false,
        } as unknown as ReturnType<typeof useProfileQuery>);

        render(<DashboardProfileDropdown />);
        const trigger = screen.getByText('AU');
        fireEvent.click(trigger);

        expect(screen.getByText('Admin User')).toBeTruthy();
        expect(screen.getByText('test@example.com')).toBeTruthy();
    });

    it('renders avatar image when avatarUrl is provided', () => {
        vi.mocked(useProfileQuery).mockReturnValue({
            profile: {
                email: 'test@example.com',
                firstName: 'Admin',
                lastName: 'User',
                avatarUrl: 'https://example.com/avatar.png',
            },
            isLoading: false,
        } as unknown as ReturnType<typeof useProfileQuery>);

        render(<DashboardProfileDropdown />);
        const img = screen.getByAltText('Admin avatar');
        expect(img).toBeTruthy();
        expect(img.getAttribute('src')).toContain('avatar.png');
    });

    it('renders avatar image from auth metadata when profile avatarUrl is missing', () => {
        vi.mocked(useAuth).mockReturnValue({
            user: { user_metadata: { avatar_url: 'https://example.com/auth-avatar.png' } },
        } as unknown as ReturnType<typeof useAuth>);
        vi.mocked(useProfileQuery).mockReturnValue({
            profile: {
                email: 'test@example.com',
                firstName: 'Admin',
                lastName: 'User',
                avatarUrl: null,
            },
            isLoading: false,
        } as unknown as ReturnType<typeof useProfileQuery>);

        render(<DashboardProfileDropdown />);
        const img = screen.getByAltText('Admin avatar');
        expect(img).toBeTruthy();
        expect(img.getAttribute('src')).toContain('auth-avatar.png');
    });

    it('falls back to initials when avatarUrl is null', () => {
        vi.mocked(useProfileQuery).mockReturnValue({
            profile: {
                email: 'test@example.com',
                firstName: 'Admin',
                lastName: 'User',
                avatarUrl: null,
            },
            isLoading: false,
        } as unknown as ReturnType<typeof useProfileQuery>);

        render(<DashboardProfileDropdown />);
        expect(screen.getByText('AU')).toBeTruthy();
        expect(screen.queryByAltText('Admin avatar')).toBeNull();
    });
});
