import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { HistoryCardProps } from '@sentinel/shared/types';
import { HistoryCard } from './history-card';
import { formatDateTimeLabel } from '@/app/(protected)/student/_lib/student-exam-listing';

vi.mock('next/link', () => ({
    default: ({
        children,
        href,
        className,
    }: {
        children: ReactNode;
        href: string;
        className?: string;
    }) => (
        <a href={href} className={className}>
            {children}
        </a>
    ),
}));

const baseItem: HistoryCardProps['item'] = {
    examId: 'exam-123',
    examTitle: 'Operating Systems Finals',
    status: 'turned_in',
    score: 12,
    timeSpent: 45,
    cheated: false,
    availableAt: '2026-07-01T10:00:00.000Z',
    dueAt: '2026-07-01T12:00:00.000Z',
    completedAt: '2026-07-01T11:30:00.000Z',
};

describe('HistoryCard', () => {
    afterEach(() => {
        cleanup();
    });

    it('renders upcoming items as non-interactive cards and shows the availableAt timestamp', () => {
        const upcomingAvailableAt = '2026-07-01T10:00:00.000Z';
        const upcomingDueAt = '2026-07-01T12:00:00.000Z';

        render(
            <HistoryCard
                item={{
                    ...baseItem,
                    status: 'upcoming',
                    completedAt: null,
                    availableAt: upcomingAvailableAt,
                    dueAt: upcomingDueAt,
                }}
            />,
        );

        expect(screen.queryByRole('link')).toBeNull();
        expect(screen.queryByTestId('history-card-chevron')).toBeNull();
        expect(screen.getByText(formatDateTimeLabel(upcomingAvailableAt))).toBeTruthy();
        expect(screen.queryByText(formatDateTimeLabel(upcomingDueAt))).toBeNull();
    });

    it('links available items to the student exam route', () => {
        render(
            <HistoryCard
                item={{
                    ...baseItem,
                    status: 'available',
                    attemptId: null,
                }}
            />,
        );

        expect(screen.getByRole('link').getAttribute('href')).toBe('/student/exam/exam-123');
        expect(screen.getByTestId('history-card-chevron')).toBeTruthy();
    });

    it('links in-progress items to the student exam route', () => {
        render(
            <HistoryCard
                item={{
                    ...baseItem,
                    status: 'in-progress',
                    attemptId: null,
                }}
            />,
        );

        expect(screen.getByRole('link').getAttribute('href')).toBe('/student/exam/exam-123');
        expect(screen.getByTestId('history-card-chevron')).toBeTruthy();
    });

    it('links completed items with an attempt id to the canonical attempt history route', () => {
        render(
            <HistoryCard
                item={{
                    ...baseItem,
                    attemptId: 'attempt-456',
                }}
            />,
        );

        expect(screen.getByRole('link').getAttribute('href')).toBe(
            '/student/history/attempts/attempt-456',
        );
        expect(screen.getByTestId('history-card-chevron')).toBeTruthy();
    });

    it('links past due items without an attempt id to the canonical exam history route', () => {
        render(
            <HistoryCard
                item={{
                    ...baseItem,
                    status: 'past_due',
                    attemptId: null,
                    completedAt: null,
                }}
            />,
        );

        expect(screen.getByRole('link').getAttribute('href')).toBe(
            '/student/history/exams/exam-123',
        );
        expect(screen.getByTestId('history-card-chevron')).toBeTruthy();
    });

    it('renders the expected status labels for the supported states', () => {
        const { rerender } = render(
            <HistoryCard
                item={{
                    ...baseItem,
                    status: 'upcoming',
                }}
            />,
        );
        expect(screen.getAllByText('upcoming')).toHaveLength(2);

        rerender(
            <HistoryCard
                item={{
                    ...baseItem,
                    status: 'available',
                }}
            />,
        );
        expect(screen.getAllByText('Open Exam')).toHaveLength(2);

        rerender(
            <HistoryCard
                item={{
                    ...baseItem,
                    status: 'in-progress',
                }}
            />,
        );
        expect(screen.getAllByText('Open Exam')).toHaveLength(2);

        rerender(
            <HistoryCard
                item={{
                    ...baseItem,
                    status: 'turned_in',
                }}
            />,
        );
        expect(screen.getAllByText('turned in')).toHaveLength(2);
    });
});
