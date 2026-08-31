import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import StudentClassroomDetailPage from './page';

vi.mock('@sentinel/hooks', () => ({
    useStudentClassroomsQuery: vi.fn(),
    useExamsQuery: vi.fn(),
}));

vi.mock('next/navigation', () => ({
    useParams: () => ({ id: 'classroom-1' }),
    useRouter: () => ({
        push: vi.fn(),
        back: vi.fn(),
    }),
}));

vi.mock('../../exam/_components/exam-card', () => ({
    ExamCard: ({ exam }: { exam: { title: string; status: string } }) => (
        <div data-testid="exam-card">
            <span>{exam.title}</span>
            <span>{exam.status}</span>
        </div>
    ),
}));

import { useStudentClassroomsQuery, useExamsQuery } from '@sentinel/hooks';

describe('StudentClassroomDetailPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('shows only active classroom assessments', () => {
        vi.mocked(useStudentClassroomsQuery).mockReturnValue({
            data: [
                {
                    id: 'classroom-1',
                    subjectCode: 'GEETH01X',
                    sectionName: 'INF232',
                    subjectTitle: 'ETHICS',
                    instructors: ['Keanna Mae Cloma'],
                    term: 'AY 2025-2026 1st Semester',
                },
            ],
            isLoading: false,
        } as any);
        vi.mocked(useExamsQuery).mockReturnValue({
            data: [
                {
                    id: 'exam-available',
                    title: 'Available Exam',
                    status: 'available',
                },
                {
                    id: 'exam-upcoming',
                    title: 'Upcoming Exam',
                    status: 'upcoming',
                },
                {
                    id: 'exam-archived',
                    title: 'Archived Exam',
                    status: 'archived',
                },
            ],
            isLoading: false,
        } as any);

        render(<StudentClassroomDetailPage />);

        expect(screen.getByText('Available Exam')).toBeTruthy();
        expect(screen.getByText('Upcoming Exam')).toBeTruthy();
        expect(screen.queryByText('Archived Exam')).toBeNull();
    });

    it('shows the active empty state when only archived assessments exist', () => {
        vi.mocked(useStudentClassroomsQuery).mockReturnValue({
            data: [
                {
                    id: 'classroom-1',
                    subjectCode: 'GEETH01X',
                    sectionName: 'INF232',
                    subjectTitle: 'ETHICS',
                    instructors: ['Keanna Mae Cloma'],
                    term: 'AY 2025-2026 1st Semester',
                },
            ],
            isLoading: false,
        } as any);
        vi.mocked(useExamsQuery).mockReturnValue({
            data: [
                {
                    id: 'exam-archived',
                    title: 'Archived Exam',
                    status: 'archived',
                },
            ],
            isLoading: false,
        } as any);

        render(<StudentClassroomDetailPage />);

        expect(screen.getByText('No assessments found')).toBeTruthy();
        expect(
            screen.getByText(
                'There are no active assessments assigned to this classroom right now.',
            ),
        ).toBeTruthy();
    });

    it('shows classroom not found and hides exams when the active classroom list no longer includes the requested classroom', () => {
        vi.mocked(useStudentClassroomsQuery).mockReturnValue({
            data: [],
            isLoading: false,
        } as any);
        vi.mocked(useExamsQuery).mockReturnValue({
            data: [
                {
                    id: 'exam-from-archived-classroom',
                    title: 'Archived Classroom Exam',
                    status: 'available',
                    classroomId: 'classroom-1',
                },
            ],
            isLoading: false,
        } as any);

        render(<StudentClassroomDetailPage />);

        expect(screen.getByText('Classroom not found')).toBeTruthy();
        expect(screen.queryByText('Archived Classroom Exam')).toBeNull();
    });

    it('keeps published classroom assessments visible after student status normalization', () => {
        vi.mocked(useStudentClassroomsQuery).mockReturnValue({
            data: [
                {
                    id: 'classroom-1',
                    subjectCode: 'GEETH01X',
                    sectionName: 'INF232',
                    subjectTitle: 'ETHICS',
                    instructors: ['Keanna Mae Cloma'],
                    term: 'AY 2025-2026 1st Semester',
                },
            ],
            isLoading: false,
        } as any);
        vi.mocked(useExamsQuery).mockReturnValue({
            data: [
                {
                    id: 'exam-published',
                    title: 'Published Exam',
                    status: 'published',
                    scheduledDate: '2099-06-24T09:00:00Z',
                    endDateTime: '2099-06-24T11:00:00Z',
                    duration: 60,
                },
            ],
            isLoading: false,
        } as any);

        render(<StudentClassroomDetailPage />);

        expect(screen.getByText('Published Exam')).toBeTruthy();
        expect(screen.getAllByText('upcoming').length).toBeGreaterThan(0);
    });

    it('keeps classroom-linked assigned exams visible in Class Assessments', () => {
        vi.mocked(useStudentClassroomsQuery).mockReturnValue({
            data: [
                {
                    id: 'classroom-1',
                    subjectId: 'subject-1',
                    subjectCode: 'GEETH01X',
                    sectionName: 'INF232',
                    sectionId: 'section-1',
                    subjectTitle: 'ETHICS',
                    instructors: ['Keanna Mae Cloma'],
                    term: 'AY 2025-2026 1st Semester',
                },
            ],
            isLoading: false,
        } as any);
        vi.mocked(useExamsQuery).mockReturnValue({
            data: [
                {
                    id: 'exam-classroom-assigned',
                    title: 'Classroom Assigned Exam',
                    status: 'available',
                    classroomId: 'classroom-1',
                    sectionIds: ['section-1'],
                },
            ],
            isLoading: false,
        } as any);

        render(<StudentClassroomDetailPage />);

        expect(useExamsQuery).toHaveBeenCalledWith(
            { classroomId: 'classroom-1', viewer: 'student' },
            expect.objectContaining({
                staleTime: 0,
                refetchOnMount: 'always',
                refetchOnWindowFocus: true,
            }),
        );
        expect(screen.getByText('Classroom Assigned Exam')).toBeTruthy();
    });

    it('shows section-assigned published exams for the classroom even when the exam has no direct classroom id', () => {
        vi.mocked(useStudentClassroomsQuery).mockReturnValue({
            data: [
                {
                    id: 'classroom-1',
                    subjectId: 'subject-1',
                    subjectCode: 'GEETH01X',
                    sectionName: 'INF232',
                    sectionId: 'section-1',
                    subjectTitle: 'ETHICS',
                    instructors: ['Keanna Mae Cloma'],
                    term: 'AY 2025-2026 1st Semester',
                },
            ],
            isLoading: false,
        } as any);
        vi.mocked(useExamsQuery).mockReturnValue({
            data: [
                {
                    id: 'exam-section-assigned',
                    title: 'Section Assigned Exam',
                    status: 'published',
                    classroomId: null,
                    subjectId: 'subject-1',
                    sectionIds: ['section-1'],
                    scheduledDate: '2099-06-24T09:00:00Z',
                    endDateTime: '2099-06-24T11:00:00Z',
                    duration: 60,
                },
            ],
            isLoading: false,
        } as any);

        render(<StudentClassroomDetailPage />);

        expect(screen.getByText('Section Assigned Exam')).toBeTruthy();
        expect(screen.getAllByText('upcoming').length).toBeGreaterThan(0);
    });

    it('requests classroom-scoped exams and keeps assign-first published exams visible after normalization', () => {
        vi.mocked(useStudentClassroomsQuery).mockReturnValue({
            data: [
                {
                    id: 'classroom-1',
                    subjectId: 'subject-1',
                    subjectCode: 'GEETH01X',
                    sectionName: 'INF232',
                    sectionId: 'section-1',
                    subjectTitle: 'ETHICS',
                    instructors: ['Keanna Mae Cloma'],
                    term: 'AY 2025-2026 1st Semester',
                },
            ],
            isLoading: false,
        } as any);
        vi.mocked(useExamsQuery).mockReturnValue({
            data: [
                {
                    id: 'exam-assigned-published',
                    title: 'Assigned Published Exam',
                    status: 'published',
                    classroomId: null,
                    classroomIds: ['classroom-1'],
                    sectionIds: [],
                    scheduledDate: '2099-06-24T09:00:00Z',
                    endDateTime: '2099-06-24T11:00:00Z',
                    duration: 60,
                },
            ],
            isLoading: false,
        } as any);

        render(<StudentClassroomDetailPage />);

        expect(useExamsQuery).toHaveBeenCalledWith(
            { classroomId: 'classroom-1', viewer: 'student' },
            expect.objectContaining({
                staleTime: 0,
                refetchOnMount: 'always',
                refetchOnWindowFocus: true,
            }),
        );
        expect(screen.getByText('Assigned Published Exam')).toBeTruthy();
        expect(screen.getAllByText('upcoming').length).toBeGreaterThan(0);
    });

    it('keeps private classroom-assigned exams visible when they arrive through classroomIds only', () => {
        vi.mocked(useStudentClassroomsQuery).mockReturnValue({
            data: [
                {
                    id: 'classroom-1',
                    subjectId: 'subject-1',
                    subjectCode: 'GEETH01X',
                    sectionName: 'INF232',
                    sectionId: 'section-1',
                    subjectTitle: 'ETHICS',
                    instructors: ['Keanna Mae Cloma'],
                    term: 'AY 2025-2026 1st Semester',
                },
            ],
            isLoading: false,
        } as any);
        vi.mocked(useExamsQuery).mockReturnValue({
            data: [
                {
                    id: 'exam-private-assigned',
                    title: 'Private Assigned Exam',
                    status: 'published',
                    isPublic: false,
                    classroomId: null,
                    classroomIds: ['classroom-1'],
                    sectionIds: [],
                    scheduledDate: '2099-06-24T09:00:00Z',
                    endDateTime: '2099-06-24T11:00:00Z',
                    duration: 60,
                },
            ],
            isLoading: false,
        } as any);

        render(<StudentClassroomDetailPage />);

        expect(screen.getByText('Private Assigned Exam')).toBeTruthy();
        expect(screen.getAllByText('upcoming').length).toBeGreaterThan(0);
    });

    it('hides exams whose stale active status normalizes to past_due on the classroom page', () => {
        vi.mocked(useStudentClassroomsQuery).mockReturnValue({
            data: [
                {
                    id: 'classroom-1',
                    subjectId: 'subject-1',
                    subjectCode: 'GEETH01X',
                    sectionName: 'INF232',
                    sectionId: 'section-1',
                    subjectTitle: 'ETHICS',
                    instructors: ['Keanna Mae Cloma'],
                    term: 'AY 2025-2026 1st Semester',
                },
            ],
            isLoading: false,
        } as any);
        vi.mocked(useExamsQuery).mockReturnValue({
            data: [
                {
                    id: 'exam-stale-available',
                    title: 'Stale Available Exam',
                    status: 'available',
                    classroomId: 'classroom-1',
                    scheduledDate: '2000-06-24T09:00:00Z',
                    endDateTime: '2000-06-24T11:00:00Z',
                    duration: 60,
                },
            ],
            isLoading: false,
        } as any);

        render(<StudentClassroomDetailPage />);

        expect(screen.queryByText('Stale Available Exam')).toBeNull();
        expect(screen.getAllByText('No assessments found').length).toBeGreaterThan(0);
    });

    it('shows exams linked through assign-first classroom ids', () => {
        vi.mocked(useStudentClassroomsQuery).mockReturnValue({
            data: [
                {
                    id: 'classroom-1',
                    subjectId: 'subject-1',
                    subjectCode: 'GEETH01X',
                    sectionName: 'INF232',
                    sectionId: 'section-1',
                    subjectTitle: 'ETHICS',
                    instructors: ['Keanna Mae Cloma'],
                    term: 'AY 2025-2026 1st Semester',
                },
            ],
            isLoading: false,
        } as any);
        vi.mocked(useExamsQuery).mockReturnValue({
            data: [
                {
                    id: 'exam-assigned-after-publish',
                    title: 'Assigned After Publish',
                    status: 'upcoming',
                    classroomId: null,
                    classroomIds: ['classroom-1'],
                    sectionIds: [],
                },
            ],
            isLoading: false,
        } as any);

        render(<StudentClassroomDetailPage />);

        expect(screen.getByText('Assigned After Publish')).toBeTruthy();
    });

    it('does not show an explicitly assigned exam in another classroom with the same section', () => {
        vi.mocked(useStudentClassroomsQuery).mockReturnValue({
            data: [
                {
                    id: 'classroom-1',
                    subjectId: 'subject-1',
                    subjectCode: 'GEETH01X',
                    sectionName: 'INF232',
                    sectionId: 'section-1',
                    subjectTitle: 'ETHICS',
                    instructors: ['Keanna Mae Cloma'],
                    term: 'AY 2025-2026 1st Semester',
                },
            ],
            isLoading: false,
        } as any);
        vi.mocked(useExamsQuery).mockReturnValue({
            data: [
                {
                    id: 'exam-other-classroom',
                    title: 'Other Classroom Exam',
                    status: 'upcoming',
                    classroomId: 'classroom-2',
                    classroomIds: ['classroom-2'],
                    sectionIds: ['section-1'],
                },
            ],
            isLoading: false,
        } as any);

        render(<StudentClassroomDetailPage />);

        expect(screen.queryByText('Other Classroom Exam')).toBeNull();
        expect(screen.getAllByText('No assessments found').length).toBeGreaterThan(0);
    });
});
