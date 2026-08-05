import { render, screen, cleanup } from '@testing-library/react';
import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { InstructorProfileDropdown } from './instructor-profile-dropdown';
import { useAuth, useProfileQuery } from '@sentinel/hooks';
import React from 'react';

vi.mock('@sentinel/hooks', () => ({
    useProfileQuery: vi.fn(),
    useUpdatePasswordMutation: vi.fn(),
    useAuth: vi.fn(),
}));

vi.mock('next-themes', () => ({
    useTheme: () => ({
        theme: 'light',
        setTheme: vi.fn(),
    }),
}));

vi.mock('./hooks/use-instructor-nav', () => ({
    useInstructorNav: () => ({
        handleLogout: vi.fn(),
    }),
}));

afterEach(() => {
    cleanup();
});

describe('InstructorProfileDropdown', () => {
    beforeEach(() => {
        vi.mocked(useAuth).mockReturnValue({
            user: { user_metadata: {} },
        } as unknown as ReturnType<typeof useAuth>);
    });

    it('renders fallback when loading', () => {
        vi.mocked(useProfileQuery).mockReturnValue({
            profile: null,
            isLoading: true,
        } as unknown as ReturnType<typeof useProfileQuery>);

        const { container } = render(<InstructorProfileDropdown />);
        const fallback = container.querySelector('.animate-pulse');
        expect(fallback).toBeTruthy();
    });

    it('renders dynamic profile data initials', () => {
        vi.mocked(useProfileQuery).mockReturnValue({
            profile: {
                firstName: 'Alice',
                lastName: 'Smith',
                email: 'alice.smith@example.com',
                employeeNo: 'EMP-123',
                department: 'CS',
                institution: 'State Uni',
            },
            isLoading: false,
        } as unknown as ReturnType<typeof useProfileQuery>);

        render(<InstructorProfileDropdown />);
        expect(screen.getByText('AS')).toBeTruthy();
    });

    it('renders avatar image when avatarUrl is provided', () => {
        vi.mocked(useProfileQuery).mockReturnValue({
            profile: {
                firstName: 'Alice',
                lastName: 'Smith',
                email: 'alice.smith@example.com',
                avatarUrl: 'https://example.com/avatar.png',
            },
            isLoading: false,
        } as unknown as ReturnType<typeof useProfileQuery>);

        render(<InstructorProfileDropdown />);
        const img = screen.getByAltText('Alice avatar');
        expect(img).toBeTruthy();
        expect(img.getAttribute('src')).toContain('avatar.png');
    });

    it('renders avatar image from auth metadata when profile avatarUrl is missing', () => {
        vi.mocked(useAuth).mockReturnValue({
            user: { user_metadata: { image: 'https://example.com/auth-avatar.png' } },
        } as unknown as ReturnType<typeof useAuth>);
        vi.mocked(useProfileQuery).mockReturnValue({
            profile: {
                firstName: 'Alice',
                lastName: 'Smith',
                email: 'alice.smith@example.com',
                avatarUrl: null,
            },
            isLoading: false,
        } as unknown as ReturnType<typeof useProfileQuery>);

        render(<InstructorProfileDropdown />);
        const img = screen.getByAltText('Alice avatar');
        expect(img).toBeTruthy();
        expect(img.getAttribute('src')).toContain('auth-avatar.png');
    });

    it('falls back to initials when avatarUrl is null', () => {
        vi.mocked(useProfileQuery).mockReturnValue({
            profile: {
                firstName: 'Alice',
                lastName: 'Smith',
                email: 'alice.smith@example.com',
                avatarUrl: null,
            },
            isLoading: false,
        } as unknown as ReturnType<typeof useProfileQuery>);

        render(<InstructorProfileDropdown />);
        expect(screen.getByText('AS')).toBeTruthy();
        expect(screen.queryByAltText('Alice avatar')).toBeNull();
    });
});
