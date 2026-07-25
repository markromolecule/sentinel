import { render, screen, cleanup } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import StudentLayout from './layout';


const mockUsePathname = vi.fn();
vi.mock('next/navigation', () => ({
    usePathname: () => mockUsePathname(),
}));

vi.mock('@/components/sidebar/student/StudentHeader', () => ({
    default: () => <div data-testid="student-header">Header</div>,
}));

vi.mock('@/components/sidebar/student/StudentBottomNav', () => ({
    default: () => <div data-testid="student-bottom-nav">BottomNav</div>,
}));

vi.mock('@/components/sidebar/student/StudentFooter', () => ({
    default: () => <div data-testid="student-footer">Footer</div>,
}));

vi.mock('@/components/common', () => ({
    PageShell: ({ children }: any) => <div data-testid="page-shell">{children}</div>,
}));

describe('StudentLayout', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        cleanup();
    });

    it('renders the header, footer, bottom nav, and children on standard pages', () => {
        mockUsePathname.mockReturnValue('/student/dashboard');

        render(
            <StudentLayout>
                <div data-testid="test-child">Child Content</div>
            </StudentLayout>
        );

        expect(screen.getByTestId('student-header')).toBeTruthy();
        expect(screen.getByTestId('student-footer')).toBeTruthy();
        expect(screen.getByTestId('student-bottom-nav')).toBeTruthy();
        expect(screen.getByTestId('test-child')).toBeTruthy();
    });

    it('omits the footer on the student message page', () => {
        mockUsePathname.mockReturnValue('/student/message');

        render(
            <StudentLayout>
                <div data-testid="test-child">Child Content</div>
            </StudentLayout>
        );

        expect(screen.getByTestId('student-header')).toBeTruthy();
        expect(screen.queryByTestId('student-footer')).toBeNull(); // Footer should be omitted!
        expect(screen.getByTestId('student-bottom-nav')).toBeTruthy();
        expect(screen.getByTestId('test-child')).toBeTruthy();
    });
});
