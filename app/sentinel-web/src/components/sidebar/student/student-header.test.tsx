import { render, screen, cleanup } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import StudentHeader from './StudentHeader';
import { useProfileQuery } from '@sentinel/hooks';
import React from 'react';
import { WebNotificationDropdown } from '../common/web-notification-dropdown';

vi.mock('@sentinel/hooks', () => ({
    useProfileQuery: vi.fn(),
    useLogoutMutation: () => ({
        mutate: vi.fn(),
    }),
    useUserSearch: vi.fn().mockReturnValue({ users: [], isLoading: false }),
}));

vi.mock('next/navigation', () => ({
    usePathname: () => '/student/classroom',
    useRouter: () => ({
        push: vi.fn(),
    }),
    useSearchParams: () => ({
        get: vi.fn(),
    }),
}));

vi.mock('next-themes', () => ({
    useTheme: () => ({
        theme: 'light',
        setTheme: vi.fn(),
    }),
}));

vi.mock('../common/web-notification-dropdown', () => ({
    WebNotificationDropdown: vi.fn(({ queryKey, viewAllHref, triggerClassName }) => (
        <div
            data-testid="mock-web-notification-dropdown"
            data-query-key={JSON.stringify(queryKey)}
            data-view-all-href={viewAllHref}
            data-trigger-class-name={triggerClassName}
        >
            Mock Web Notification Dropdown
        </div>
    )),
}));

afterEach(() => {
    cleanup();
});

describe('StudentHeader', () => {
    it('renders initials when loaded', () => {
        vi.mocked(useProfileQuery).mockReturnValue({
            profile: {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
            },
            isLoading: false,
        } as unknown as ReturnType<typeof useProfileQuery>);

        render(<StudentHeader />);
        expect(screen.getByText('JD')).toBeTruthy();
    });

    it('renders dots/loading indicator when profile is loading', () => {
        vi.mocked(useProfileQuery).mockReturnValue({
            profile: null,
            isLoading: true,
        } as unknown as ReturnType<typeof useProfileQuery>);

        render(<StudentHeader />);
        expect(screen.getByText('...')).toBeTruthy();
    });

    it('renders avatar image when avatarUrl is provided', () => {
        vi.mocked(useProfileQuery).mockReturnValue({
            profile: {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
                avatarUrl: 'https://example.com/avatar.png',
            },
            isLoading: false,
        } as unknown as ReturnType<typeof useProfileQuery>);

        render(<StudentHeader />);
        const img = screen.getByAltText('John avatar');
        expect(img).toBeTruthy();
        expect(img.getAttribute('src')).toContain('avatar.png');
    });

    it('falls back to initials when avatarUrl is null', () => {
        vi.mocked(useProfileQuery).mockReturnValue({
            profile: {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
                avatarUrl: null,
            },
            isLoading: false,
        } as unknown as ReturnType<typeof useProfileQuery>);

        render(<StudentHeader />);
        expect(screen.getByText('JD')).toBeTruthy();
        expect(screen.queryByAltText('John avatar')).toBeNull();
    });

    it('renders WebNotificationDropdown with student query key and viewAllHref', () => {
        vi.mocked(useProfileQuery).mockReturnValue({
            profile: {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
            },
            isLoading: false,
        } as unknown as ReturnType<typeof useProfileQuery>);

        render(<StudentHeader />);
        const dropdown = screen.getByTestId('mock-web-notification-dropdown');
        expect(dropdown).toBeTruthy();
        expect(dropdown.getAttribute('data-query-key')).toBe(
            JSON.stringify(['notifications', 'student-header'])
        );
        expect(dropdown.getAttribute('data-view-all-href')).toBe('/student/notifications');
        expect(dropdown.getAttribute('data-trigger-class-name')).toContain('hidden sm:flex');
    });
});

