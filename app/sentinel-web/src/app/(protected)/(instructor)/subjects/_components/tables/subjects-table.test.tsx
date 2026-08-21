import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiProvider } from '@sentinel/hooks';
import { SubjectsTable } from './subjects-table';
import { type Subject } from '@sentinel/shared/types';

const mockSubjects: Subject[] = [
    {
        id: 'so-1',
        subjectOfferingId: 'so-1',
        code: 'CCPRGG1L',
        title: 'FUNDAMENTALS OF PROGRAMMING',
        department_code: 'SECA',
        course_code: 'BSIT-MWA-MNL',
        yearLevels: ['Year 1'],
        sections: [{ id: 'sec-1', name: 'INF266' }],
        status: 'APPROVED',
        requested_at: '2026-08-06T00:00:00Z',
        approved_at: '2026-08-07T00:00:00Z',
        approved_by: 'Dr. Jane Smith',
        termId: 'term-1',
        termAcademicYear: '2026-2027',
        termSemester: '1ST TERM',
        departments: ['SECA'],
        courses: ['BSIT-MWA-MNL'],
        departmentIds: ['dept-1'],
        courseIds: ['course-1'],
        sectionIds: ['sec-1'],
        yearLevelsNumeric: [1],
        requestIds: ['req-1'],
        createdAt: '2026-08-06T00:00:00Z',
        createdBy: 'Dr. Jane Smith',
    },
];

describe('SubjectsTable', () => {
    afterEach(() => {
        cleanup();
    });

    it('renders table headers and hides approved_at and approved_by by default', () => {
        const queryClient = new QueryClient({
            defaultOptions: { queries: { retry: false } },
        });
        const fakeApiClient = vi.fn().mockResolvedValue({ data: [] });

        render(
            <QueryClientProvider client={queryClient}>
                <ApiProvider apiClient={fakeApiClient as any}>
                    <SubjectsTable data={mockSubjects} />
                </ApiProvider>
            </QueryClientProvider>,
        );

        // Core columns should be visible
        expect(screen.getByText('Code')).toBeTruthy();
        expect(screen.getByText('Title')).toBeTruthy();
        expect(screen.getByText('Term')).toBeTruthy();
        expect(screen.getByText('Dept')).toBeTruthy();
        expect(screen.getByText('Course')).toBeTruthy();
        expect(screen.getByText('Year')).toBeTruthy();
        expect(screen.getByText('Sections')).toBeTruthy();
        expect(screen.getByText('Requested At')).toBeTruthy();
        expect(screen.getByText('Status')).toBeTruthy();

        // Row content
        expect(screen.getByText('CCPRGG1L')).toBeTruthy();
        expect(screen.getByText('FUNDAMENTALS OF PROGRAMMING')).toBeTruthy();

        // Approved At and Approved By column headers should NOT be in the table header
        expect(screen.queryByRole('columnheader', { name: /Approved At/i })).toBeNull();
        expect(screen.queryByRole('columnheader', { name: /Approved By/i })).toBeNull();
    });
});
