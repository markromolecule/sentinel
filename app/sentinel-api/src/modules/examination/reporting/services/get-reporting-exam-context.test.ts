import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type DbClient } from '@sentinel/db';
import { sql } from 'kysely';
import { resolveExaminationGlobalSettings } from '../../configuration/configuration.service';
import { buildAssignedInstructorExamVisibilityPredicates } from '../../assign/services/exam-access.service';
import { getReportingExamContext } from './get-reporting-exam-context';

vi.mock('../../configuration/configuration.service', () => ({
    resolveExaminationGlobalSettings: vi.fn(),
}));

vi.mock('../../assign/services/exam-access.service', () => ({
    buildAssignedInstructorExamVisibilityPredicates: vi.fn(),
}));

describe('getReportingExamContext', () => {
    let mockDb: any;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(resolveExaminationGlobalSettings).mockResolvedValue({
            defaultDurationMinutes: 60,
            defaultPassingScore: 68,
        } as any);
        vi.mocked(buildAssignedInstructorExamVisibilityPredicates).mockResolvedValue([
            sql<boolean>`e.exam_id in (
                select esa.exam_id
                from exam_section_assignments as esa
                where esa.instructor_id = ${'user-1'}
            )`,
        ]);

        mockDb = {
            selectFrom: vi.fn().mockReturnThis(),
            leftJoin: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            executeTakeFirst: vi.fn(),
        };
    });

    it('returns assigned-only reporting context data for instructors', async () => {
        mockDb.executeTakeFirst.mockResolvedValue({
            exam_id: 'exam-1',
            title: 'Final Exam',
            class_group_id: 'class-1',
            subject_id: 'subject-1',
            section_id: 'section-1',
            duration_minutes: 45,
            passing_score: 72,
            scheduled_date: '2026-07-08T08:00:00.000Z',
            end_date_time: '2026-07-08T09:00:00.000Z',
            subject_title: 'Mathematics',
            institution_id: 'institution-1',
            assigned_section_ids: ['section-1'],
        });

        const result = await getReportingExamContext({
            dbClient: mockDb as DbClient,
            examId: 'exam-1',
            institutionId: 'institution-1',
            viewerRole: 'instructor',
            userId: 'user-1',
        });

        expect(buildAssignedInstructorExamVisibilityPredicates).toHaveBeenCalledWith({
            dbClient: mockDb,
            userId: 'user-1',
        });
        expect(mockDb.where).toHaveBeenCalledWith('e.institution_id', '=', 'institution-1');
        expect(result).toMatchObject({
            examId: 'exam-1',
            title: 'Final Exam',
            subject: 'Mathematics',
            durationMinutes: 45,
            passingScore: 72,
            assignedSectionIds: ['section-1'],
            institutionId: 'institution-1',
        });
    });

    it('returns a 404 when the reporting exam is missing', async () => {
        mockDb.executeTakeFirst.mockResolvedValue(undefined);

        await expect(
            getReportingExamContext({
                dbClient: mockDb as DbClient,
                examId: 'exam-1',
                institutionId: 'institution-1',
                viewerRole: 'instructor',
                userId: 'user-1',
            }),
        ).rejects.toThrow('Exam report record not found.');
    });
});
