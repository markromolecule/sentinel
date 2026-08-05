import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { GradingStudentSection } from '@sentinel/shared/types';
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

describe('GradingStudentList', () => {
    it('keeps grouped section labels correct while a search filter is active', () => {
        const sections: GradingStudentSection[] = [
            {
                sectionId: '11111111-1111-1111-1111-111111111111',
                sectionName: 'BSCS 3A',
                totalStudents: 2,
                submittedCount: 1,
                gradedCount: 1,
                students: [
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
                ],
            },
            {
                sectionId: '22222222-2222-2222-2222-222222222222',
                sectionName: 'BSCS 3B',
                totalStudents: 1,
                submittedCount: 1,
                gradedCount: 0,
                students: [
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
                ],
            },
        ];

        render(
            <GradingStudentList
                examId="33333333-3333-3333-3333-333333333333"
                sections={sections}
                searchValue="Charlie"
                onSearchChange={() => {}}
                onSectionChange={() => {}}
                availableSections={[
                    { id: '11111111-1111-1111-1111-111111111111', name: 'BSCS 3A' },
                    { id: '22222222-2222-2222-2222-222222222222', name: 'BSCS 3B' },
                ]}
            />,
        );

        expect(screen.getByText('BSCS 3A')).toBeTruthy();
        expect(screen.getByText('BSCS 3B')).toBeTruthy();
        expect(screen.getByText('Alice Student')).toBeTruthy();
        expect(screen.getByText('Bob Student')).toBeTruthy();
        expect(screen.getByText('Charlie Student')).toBeTruthy();
        expect(screen.getByText('SUBMITTED')).toBeTruthy();
        expect(screen.getByText('GRADED')).toBeTruthy();
        expect(screen.getByText('NOT SUBMITTED')).toBeTruthy();
    });
});
