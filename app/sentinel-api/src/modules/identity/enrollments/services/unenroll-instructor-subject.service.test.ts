import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HTTPException } from 'hono/http-exception';
import { unenrollInstructorSubjectData } from '../data/unenroll-instructor-subject';
import { LogsService } from '../../../general/logs/logs.service';
import { unenrollInstructorSubjectService } from './unenroll-instructor-subject.service';

vi.mock('../data/unenroll-instructor-subject', () => ({
    unenrollInstructorSubjectData: vi.fn(),
}));

vi.mock('../../../general/logs/logs.service', () => ({
    LogsService: {
        createLog: vi.fn(),
    },
}));

describe('unenrollInstructorSubjectService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('throws when no instructor assignment or request was removed', async () => {
        vi.mocked(unenrollInstructorSubjectData).mockResolvedValue({
            deletedRequestCount: 0,
            deletedClassRoleCount: 0,
            deletedInstructorAssignmentCount: 0,
            deletedCount: 0,
            classGroupIds: [],
        });

        await expect(
            unenrollInstructorSubjectService({
                dbClient: {} as any,
                userId: 'instructor-user-id',
                subjectId: 'subject-offering-id',
                status: 'APPROVED',
                classGroupIds: ['section-id'],
            }),
        ).rejects.toMatchObject<Partial<HTTPException>>({
            status: 404,
            message: 'No matching instructor assignment found to unenroll.',
        });

        expect(LogsService.createLog).not.toHaveBeenCalled();
    });

    it('logs the resolved class groups after a successful unenroll', async () => {
        vi.mocked(unenrollInstructorSubjectData).mockResolvedValue({
            deletedRequestCount: 1,
            deletedClassRoleCount: 1,
            deletedInstructorAssignmentCount: 1,
            deletedCount: 3,
            classGroupIds: ['class-group-id'],
        });

        const dbClient = {
            selectFrom: vi.fn(() => ({
                select: vi.fn().mockReturnThis(),
                where: vi.fn().mockReturnThis(),
                executeTakeFirst: vi.fn().mockResolvedValue({
                    institution_id: 'institution-id',
                }),
            })),
        } as any;

        const result = await unenrollInstructorSubjectService({
            dbClient,
            userId: 'instructor-user-id',
            subjectId: 'subject-offering-id',
            status: 'APPROVED',
            classGroupIds: ['section-id'],
        });

        expect(result.deletedCount).toBe(3);
        expect(LogsService.createLog).toHaveBeenCalledWith(
            dbClient,
            expect.objectContaining({
                details: {
                    subjectId: 'subject-offering-id',
                    classGroupIds: ['class-group-id'],
                    status: 'APPROVED',
                },
            }),
        );
    });
});
