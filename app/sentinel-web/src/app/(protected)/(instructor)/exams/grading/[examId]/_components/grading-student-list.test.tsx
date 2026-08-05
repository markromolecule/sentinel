import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { GradingStudent } from '@sentinel/shared/types';
import { GradingStudentList } from './grading-student-list';

vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: vi.fn(),
        replace: vi.fn(),
        refresh: vi.fn(),
    }),
    usePathname: () => '/exams/grading',
    useSearchParams: () => new URLSearchParams(),
}));

const students: GradingStudent[] = [
    {
        id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        name: 'Alice Student',
        studentId: '2026-0001',
        sectionId: '11111111-1111-1111-1111-111111111111',
        sectionName: 'BSCS 3A',
        submissionDate: '2026-04-18T08:30:00.000Z',
        score: 18,
        maxScore: 20,
        status: 'GRADED',
        attemptId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    },
    {
        id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
        name: 'Bob Student',
        studentId: '2026-0002',
        sectionId: '11111111-1111-1111-1111-111111111111',
        sectionName: 'BSCS 3A',
        submissionDate: null,
        score: null,
        maxScore: 20,
        status: 'NOT_SUBMITTED',
        attemptId: null,
    },
    {
        id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
        name: 'Charlie Student',
        studentId: '2026-0003',
        sectionId: '22222222-2222-2222-2222-222222222222',
        sectionName: 'BSCS 3B',
        submissionDate: '2026-04-18T09:00:00.000Z',
        score: null,
        maxScore: 20,
        status: 'SUBMITTED',
        attemptId: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    },
];

describe('GradingStudentList', () => {
    it('renders a flat DataTable with all student rows while search is active', () => {
        render(
            <GradingStudentList
                students={students}
                searchValue="Charlie"
                onSearchChange={() => {}}
                onSectionChange={() => {}}
                availableSections={[
                    { id: '11111111-1111-1111-1111-111111111111', name: 'BSCS 3A' },
                    { id: '22222222-2222-2222-2222-222222222222', name: 'BSCS 3B' },
                ]}
            />,
        );

        expect(screen.getByText('Alice Student')).toBeTruthy();
        expect(screen.getByText('Bob Student')).toBeTruthy();
        expect(screen.getByText('Charlie Student')).toBeTruthy();
        expect(screen.getByText('SUBMITTED')).toBeTruthy();
        expect(screen.getByText('GRADED')).toBeTruthy();
        expect(screen.getByText('NOT SUBMITTED')).toBeTruthy();
    });

    it('shows empty state when students array is empty', () => {
        render(
            <GradingStudentList
                students={[]}
                searchValue=""
                onSearchChange={() => {}}
                onSectionChange={() => {}}
                availableSections={[]}
            />,
        );

        expect(screen.getByText('No students matched the current filters.')).toBeTruthy();
    });

    it('renders section facet options from availableSections', () => {
        render(
            <GradingStudentList
                students={students}
                searchValue=""
                onSearchChange={() => {}}
                onSectionChange={() => {}}
                availableSections={[
                    { id: '11111111-1111-1111-1111-111111111111', name: 'BSCS 3A' },
                    { id: '22222222-2222-2222-2222-222222222222', name: 'BSCS 3B' },
                ]}
            />,
        );

        // The facet button label appears in the toolbar
        expect(screen.getAllByText('Section').length).toBeGreaterThan(0);
    });
});
