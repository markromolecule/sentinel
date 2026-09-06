import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ExamSessionNav } from './exam-session-nav';

const mockPathname = vi.hoisted(() => vi.fn());
const mockSearchParams = vi.hoisted(() => ({
    get: vi.fn(),
}));
const mockUseExamQuery = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
    usePathname: () => mockPathname(),
    useSearchParams: () => mockSearchParams,
}));

vi.mock('@sentinel/hooks', () => ({
    useExamQuery: (id?: string) => mockUseExamQuery(id),
}));

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('ExamSessionNav', () => {
    beforeEach(() => {
        mockUseExamQuery.mockReturnValue({ data: { status: 'in-progress' } });
    });
    it('renders all runtime access links for the current exam', () => {
        mockPathname.mockReturnValue('/exams/exam-1/lobby');
        mockSearchParams.get.mockReturnValue(null);

        render(<ExamSessionNav examId="exam-1" />);

        expect(screen.getByRole('link', { name: 'Lobby' }).getAttribute('href')).toBe(
            '/exams/exam-1/lobby',
        );
        expect(screen.getByRole('link', { name: 'Monitoring' }).getAttribute('href')).toBe(
            '/exams/exam-1/monitoring',
        );
        expect(screen.getByRole('link', { name: 'Summary' }).getAttribute('href')).toBe(
            '/exams/exam-1/report',
        );
        expect(screen.getByRole('link', { name: 'Actions' }).getAttribute('href')).toBe(
            '/exams/exam-1/report?section=queue',
        );
        expect(screen.getByRole('link', { name: 'Incident Logs' }).getAttribute('href')).toBe(
            '/exams/exam-1/logs',
        );
    });

    it('marks Lobby active for lobby routes', () => {
        mockPathname.mockReturnValue('/exams/exam-1/lobby');
        mockSearchParams.get.mockReturnValue(null);

        render(<ExamSessionNav examId="exam-1" />);

        const activeLink = screen.getByRole('link', { name: 'Lobby' });
        expect(activeLink.className).toContain('bg-accent/50');
        expect(activeLink.className).toContain('border-r-2');
    });

    it('marks Monitoring active for nested monitoring student routes', () => {
        mockPathname.mockReturnValue('/exams/exam-1/monitoring/student-1');
        mockSearchParams.get.mockReturnValue(null);

        render(<ExamSessionNav examId="exam-1" />);

        const activeLink = screen.getByRole('link', { name: 'Monitoring' });
        expect(activeLink.className).toContain('bg-accent/50');
        expect(activeLink.className).toContain('border-r-2');
    });

    it('marks Summary active for report routes', () => {
        mockPathname.mockReturnValue('/exams/exam-1/report');
        mockSearchParams.get.mockImplementation((key: string) => (key === 'section' ? null : null));

        render(<ExamSessionNav examId="exam-1" />);

        const activeLink = screen.getByRole('link', { name: 'Summary' });
        expect(activeLink.className).toContain('bg-accent/50');
        expect(activeLink.className).toContain('border-r-2');
    });

    it('marks Actions active for queued report routes', () => {
        mockPathname.mockReturnValue('/exams/exam-1/report');
        mockSearchParams.get.mockImplementation((key: string) =>
            key === 'section' ? 'queue' : null,
        );

        render(<ExamSessionNav examId="exam-1" />);

        const activeLink = screen.getByRole('link', { name: 'Actions' });
        expect(activeLink.className).toContain('bg-accent/50');
        expect(activeLink.className).toContain('border-r-2');
    });

    it('marks Incident Logs active for logs routes', () => {
        mockPathname.mockReturnValue('/exams/exam-1/logs');
        mockSearchParams.get.mockReturnValue(null);

        render(<ExamSessionNav examId="exam-1" />);

        const activeLink = screen.getByRole('link', { name: 'Incident Logs' });
        expect(activeLink.className).toContain('bg-accent/50');
        expect(activeLink.className).toContain('border-r-2');
    });

    it('filters out Lobby and Monitoring on report routes in sentinel-core when completed', () => {
        mockPathname.mockReturnValue('/exams/exam-1/report');
        mockSearchParams.get.mockReturnValue(null);
        mockUseExamQuery.mockReturnValue({ data: { status: 'completed' } });

        render(<ExamSessionNav examId="exam-1" />);

        expect(screen.queryByRole('link', { name: 'Lobby' })).toBeNull();
        expect(screen.queryByRole('link', { name: 'Monitoring' })).toBeNull();

        expect(screen.getByRole('link', { name: 'Summary' }).getAttribute('href')).toBe(
            '/exams/exam-1/report',
        );
        expect(screen.getByRole('link', { name: 'Actions' }).getAttribute('href')).toBe(
            '/exams/exam-1/report?section=queue',
        );
        expect(screen.getByRole('link', { name: 'Incident Logs' }).getAttribute('href')).toBe(
            '/exams/exam-1/logs',
        );
    });

    it('does not filter out Lobby and Monitoring on report routes when active in sentinel-core', () => {
        mockPathname.mockReturnValue('/exams/exam-1/report');
        mockSearchParams.get.mockReturnValue(null);
        mockUseExamQuery.mockReturnValue({ data: { status: 'in-progress' } });

        render(<ExamSessionNav examId="exam-1" />);

        expect(screen.getByRole('link', { name: 'Lobby' })).toBeTruthy();
        expect(screen.getByRole('link', { name: 'Monitoring' })).toBeTruthy();
    });
});
