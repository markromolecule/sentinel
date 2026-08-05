import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import HistoryDetailsPage from './page';
import { HistoryDetailsContent } from '@/app/(protected)/student/history/_components/history-details-content';

const mockRedirect = vi.fn();
const mockUseExamDetails = vi.fn();

vi.mock('next/link', () => ({
    default: ({ children, href }: { children: React.ReactNode; href: string }) => (
        <a href={href}>{children}</a>
    ),
}));

vi.mock('next/navigation', () => ({
    redirect: (href: string) => mockRedirect(href),
}));

vi.mock('@/app/(protected)/student/history/details/_hooks/use-exam-details', () => ({
    useExamDetails: (...args: unknown[]) => mockUseExamDetails(...args),
}));

vi.mock('@/app/(protected)/student/history/details/_components/attempt-report-dialog', () => ({
    AttemptReportDialog: ({ open }: { open: boolean }) =>
        open ? <div>Detailed Report Dialog</div> : null,
}));

vi.mock('@/app/(protected)/student/history/details/_components/exam-detail-stats', () => ({
    ExamDetailStats: () => <div>Exam Detail Stats</div>,
}));

vi.mock('@/app/(protected)/student/history/details/_components/exam-header', () => ({
    ExamHeader: () => <div>Exam Header</div>,
}));

vi.mock('@/app/(protected)/student/history/details/_components/exam-hero-score', () => ({
    ExamHeroScore: () => <div>Exam Hero Score</div>,
}));

vi.mock('@/app/(protected)/student/history/details/_components/exam-info', () => ({
    ExamInfo: () => <div>Exam Info</div>,
}));

vi.mock('@/components/sidebar/student/CheatingReport', () => ({
    CheatingReport: () => <div>Cheating Report</div>,
}));

afterEach(() => {
    cleanup();
});

describe('HistoryDetailsContent', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders released report content using the provided attempt id', async () => {
        mockUseExamDetails.mockReturnValue({
            historyItem: {
                examTitle: 'Final Exam',
                subject: 'Algorithms',
                status: 'turned_in',
                completedAt: '2026-06-26T09:00:00.000Z',
                dueAt: null,
                availableAt: null,
                timeSpent: 45,
                score: null,
                totalScore: null,
                percentage: null,
                cheated: false,
                cheatingType: null,
                result: null,
            },
            report: {
                attempt: {},
                questions: [{ id: 'question-1' }],
            },
            reportAvailability: 'available',
            isLoading: false,
        });

        render(<HistoryDetailsContent attemptId="attempt-route-1" />);

        expect(await screen.findByText('Detailed Report Available')).toBeTruthy();
        expect(mockUseExamDetails).toHaveBeenCalledWith({
            attemptId: 'attempt-route-1',
            examId: undefined,
        });

        fireEvent.click(screen.getByRole('button', { name: /view detailed report/i }));

        expect(screen.getByText('Detailed Report Dialog')).toBeTruthy();
    });

    it('renders the in-review state using the provided exam id', async () => {
        mockUseExamDetails.mockReturnValue({
            historyItem: {
                examTitle: 'Essay Exam',
                subject: 'English',
                status: 'turned_in',
                completedAt: '2026-06-26T09:00:00.000Z',
                dueAt: null,
                availableAt: null,
                timeSpent: 45,
                score: 18,
                totalScore: 20,
                percentage: 90,
                cheated: false,
                cheatingType: null,
                result: 'passed',
            },
            report: undefined,
            reportAvailability: 'grading_in_progress',
            isLoading: false,
        });

        render(<HistoryDetailsContent examId="exam-route-1" />);

        expect(await screen.findByText('Report In Review')).toBeTruthy();
        expect(mockUseExamDetails).toHaveBeenCalledWith({
            attemptId: undefined,
            examId: 'exam-route-1',
        });
    });

    it('shows the shared student loading state while the history details load', () => {
        mockUseExamDetails.mockReturnValue({
            historyItem: null,
            report: undefined,
            reportAvailability: 'loading_report',
            isLoading: true,
        });

        render(<HistoryDetailsContent examId="exam-route-2" />);

        expect(screen.getByText('Loading exam flow...')).toBeTruthy();
        expect(screen.getByLabelText('Loading exam flow')).toBeTruthy();
    });
});

describe('HistoryDetailsPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('redirects legacy attempt urls to the canonical attempt route', async () => {
        await HistoryDetailsPage({
            searchParams: Promise.resolve({
                attemptId: 'attempt-1',
            }),
        });

        expect(mockRedirect).toHaveBeenCalledWith('/student/history/attempts/attempt-1');
    });

    it('redirects legacy exam urls and id aliases to the canonical exam route', async () => {
        await HistoryDetailsPage({
            searchParams: Promise.resolve({
                examId: 'exam-1',
            }),
        });

        expect(mockRedirect).toHaveBeenCalledWith('/student/history/exams/exam-1');

        vi.clearAllMocks();

        await HistoryDetailsPage({
            searchParams: Promise.resolve({
                id: 'exam-2',
            }),
        });

        expect(mockRedirect).toHaveBeenCalledWith('/student/history/exams/exam-2');
    });

    it('redirects missing legacy identifiers to the history index', async () => {
        await HistoryDetailsPage({
            searchParams: Promise.resolve({}),
        });

        expect(mockRedirect).toHaveBeenCalledWith('/student/history');
    });
});
