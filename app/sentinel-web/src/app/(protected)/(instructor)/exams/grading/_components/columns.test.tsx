'use client';

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { columns } from './columns';
import type { GradingExam } from '@sentinel/shared/types';

vi.mock('next/link', () => ({
    default: ({ children, href }: { children: React.ReactNode; href: string }) => (
        <a href={href}>{children}</a>
    ),
}));

describe('Grading Columns', () => {
    afterEach(() => {
        cleanup();
    });

    const mockExam: GradingExam = {
        id: '11111111-1111-1111-1111-111111111111',
        title: 'Midterm Examination',
        subject: 'Computer Science',
        scheduledDate: '2026-09-06T10:00:00.000Z',
        totalStudents: 46,
        submittedCount: 1,
        gradedCount: 1,
        status: 'IN_PROGRESS',
        sectionIds: ['sec-1'],
        sectionNames: ['Section A'],
    };

    const getColumn = (idOrKey: string) => {
        return columns.find((col) => ('accessorKey' in col && col.accessorKey === idOrKey) || col.id === idOrKey);
    };

    describe('Progress Column', () => {
        const progressCol = getColumn('progress')!;
        const renderProgress = (exam: Partial<GradingExam>) => {
            const rowData = { ...mockExam, ...exam };
            const cell = progressCol.cell as (props: { row: { original: GradingExam } }) => React.ReactNode;
            return render(<>{cell({ row: { original: rowData } })}</>);
        };

        it('renders cohort-accurate progress for 1 submitted and 1 graded out of 46 students', () => {
            renderProgress({ totalStudents: 46, submittedCount: 1, gradedCount: 1 });

            expect(screen.getByText('1/1 graded • 1/46 submitted')).toBeDefined();

            const submittedBar = screen.getByTestId('submitted-progress');
            const gradedBar = screen.getByTestId('graded-progress');

            // 1 / 46 = 2.17% -> Math.round is 2%
            expect(submittedBar.style.width).toBe('2%');
            expect(gradedBar.style.width).toBe('2%');
        });

        it('renders dual-layer progress for partial submissions and partial grading', () => {
            renderProgress({ totalStudents: 50, submittedCount: 25, gradedCount: 10 });

            expect(screen.getByText('10/25 graded • 25/50 submitted')).toBeDefined();

            const submittedBar = screen.getByTestId('submitted-progress');
            const gradedBar = screen.getByTestId('graded-progress');

            // 25 / 50 = 50%, 10 / 50 = 20%
            expect(submittedBar.style.width).toBe('50%');
            expect(gradedBar.style.width).toBe('20%');
        });

        it('handles zero-division edge cases gracefully when total is 0', () => {
            renderProgress({ totalStudents: 0, submittedCount: 0, gradedCount: 0 });

            expect(screen.getByText('0/0 graded • 0/0 submitted')).toBeDefined();

            const submittedBar = screen.getByTestId('submitted-progress');
            const gradedBar = screen.getByTestId('graded-progress');

            expect(submittedBar.style.width).toBe('0%');
            expect(gradedBar.style.width).toBe('0%');
        });

        it('handles edge case where total > 0 but submitted is 0', () => {
            renderProgress({ totalStudents: 46, submittedCount: 0, gradedCount: 0 });

            expect(screen.getByText('0/0 graded • 0/46 submitted')).toBeDefined();

            const submittedBar = screen.getByTestId('submitted-progress');
            const gradedBar = screen.getByTestId('graded-progress');

            expect(submittedBar.style.width).toBe('0%');
            expect(gradedBar.style.width).toBe('0%');
        });

        it('clamps percentages to 100% maximum if submitted or graded exceed total', () => {
            renderProgress({ totalStudents: 10, submittedCount: 15, gradedCount: 12 });

            expect(screen.getByText('12/15 graded • 15/10 submitted')).toBeDefined();

            const submittedBar = screen.getByTestId('submitted-progress');
            const gradedBar = screen.getByTestId('graded-progress');

            expect(submittedBar.style.width).toBe('100%');
            expect(gradedBar.style.width).toBe('100%');
        });
    });

    describe('General Columns', () => {
        it('renders title cell properly', () => {
            const titleCol = getColumn('title')!;
            const cell = titleCol.cell as (props: { row: { getValue: (k: string) => any } }) => React.ReactNode;
            render(<>{cell({ row: { getValue: () => 'Midterm Examination' } })}</>);
            expect(screen.getByText('Midterm Examination')).toBeDefined();
        });

        it('renders scheduled date or "Not scheduled" fallback', () => {
            const dateCol = getColumn('scheduledDate')!;
            const cell = dateCol.cell as (props: { row: { getValue: (k: string) => any } }) => React.ReactNode;

            const { unmount } = render(<>{cell({ row: { getValue: () => '2026-09-06T10:00:00.000Z' } })}</>);
            expect(screen.getByText(new Date('2026-09-06T10:00:00.000Z').toLocaleDateString())).toBeDefined();
            unmount();

            render(<>{cell({ row: { getValue: () => null } })}</>);
            expect(screen.getByText('Not scheduled')).toBeDefined();
        });

        it('renders actions link pointing to grading page', () => {
            const actionsCol = getColumn('actions')!;
            const cell = actionsCol.cell as (props: { row: { original: GradingExam } }) => React.ReactNode;
            render(<>{cell({ row: { original: mockExam } })}</>);

            const link = screen.getByRole('link', { name: /view grades/i });
            expect(link.getAttribute('href')).toBe(`/exams/grading/${mockExam.id}`);
        });

        it('filters sectionName correctly', () => {
            const sectionCol = getColumn('sectionName')!;
            const filterFn = sectionCol.filterFn as (row: any, id: string, value: string[]) => boolean;

            const row = {
                getValue: () => ['Section A', 'Section B'],
            };

            expect(filterFn(row, 'sectionName', [])).toBe(true);
            expect(filterFn(row, 'sectionName', ['Section A'])).toBe(true);
            expect(filterFn(row, 'sectionName', ['Section C'])).toBe(false);

            const emptyRow = {
                getValue: () => undefined,
            };
            expect(filterFn(emptyRow, 'sectionName', ['Section A'])).toBe(false);
        });
    });
});
