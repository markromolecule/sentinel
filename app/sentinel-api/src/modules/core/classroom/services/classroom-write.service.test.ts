import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    archiveClassroom,
    bulkDeleteClassrooms,
    deleteClassroom,
    unarchiveClassroom,
} from './classroom-write.service';
import { ActivityNotificationService } from '../../../general/notification/services/activity-notification.service';
import { HTTPException } from 'hono/http-exception';
import { deleteExamForCleanup } from '../../../examination/exams/services/delete-exam.service';
import { assertHeadInstructorClassroomAccess } from './classroom-instructor-write-helper.service';

vi.mock('../../../general/notification/services/activity-notification.service', () => ({
    ActivityNotificationService: {
        notifyInstitutionActivityDeleted: vi.fn().mockResolvedValue(undefined),
        notifyInstitutionActivityUpdated: vi.fn().mockResolvedValue(undefined),
    },
}));

vi.mock('../../../examination/exams/services/delete-exam.service', () => ({
    deleteExamForCleanup: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('./classroom-instructor-write-helper.service', () => ({
    assertHeadInstructorClassroomAccess: vi.fn().mockResolvedValue(undefined),
}));

function createSelectBuilder(result: any) {
    return {
        select: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        execute: vi.fn().mockResolvedValue(result),
    };
}

function createDeleteBuilder() {
    return {
        where: vi.fn().mockReturnThis(),
        execute: vi.fn().mockResolvedValue(undefined),
    };
}

function createSelectFirstBuilder(result: any) {
    return {
        select: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        executeTakeFirst: vi.fn().mockResolvedValue(result),
    };
}

function createUpdateBuilder() {
    return {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        execute: vi.fn().mockResolvedValue(undefined),
    };
}

describe('classroom-write.service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(assertHeadInstructorClassroomAccess).mockResolvedValue(undefined);
    });

    describe('bulkDeleteClassrooms', () => {
        it('throws 404 if no classrooms are found', async () => {
            const dbClient = {
                selectFrom: vi.fn().mockReturnValue(createSelectBuilder([])),
            } as any;

            await expect(
                bulkDeleteClassrooms(dbClient, {
                    classGroupIds: ['class-1'],
                    userId: 'user-1',
                    institutionId: 'inst-1',
                    userRole: 'instructor',
                }),
            ).rejects.toThrow(HTTPException);
        });

        it('deletes classrooms and logs notifications for instructors', async () => {
            const mockClassrooms = [
                { class_group_id: 'class-1', class_name: 'CS 101' },
                { class_group_id: 'class-2', class_name: 'CS 102' },
            ];

            const selectBuilder = createSelectBuilder(mockClassrooms);
            const deleteBuilder = createDeleteBuilder();

            const dbClient = {
                selectFrom: vi.fn().mockReturnValue(selectBuilder),
                deleteFrom: vi.fn().mockReturnValue(deleteBuilder),
            } as any;

            await bulkDeleteClassrooms(dbClient, {
                classGroupIds: ['class-1', 'class-2'],
                userId: 'user-1',
                institutionId: 'inst-1',
                userRole: 'instructor',
            });

            expect(assertHeadInstructorClassroomAccess).toHaveBeenCalledTimes(2);
            expect(assertHeadInstructorClassroomAccess).toHaveBeenNthCalledWith(1, {
                dbClient,
                classGroupId: 'class-1',
                userId: 'user-1',
                institutionId: 'inst-1',
                userRole: 'instructor',
            });
            expect(dbClient.selectFrom).toHaveBeenCalledWith('class_groups as cg');
            expect(selectBuilder.innerJoin).toHaveBeenCalledTimes(2); // joins class_roles and roles
            expect(dbClient.deleteFrom).toHaveBeenCalledWith('class_groups');
            expect(deleteBuilder.where).toHaveBeenCalledWith('class_group_id', 'in', [
                'class-1',
                'class-2',
            ]);
            expect(
                ActivityNotificationService.notifyInstitutionActivityDeleted,
            ).toHaveBeenCalledTimes(2);
        });

        it('deletes classrooms without joining roles for core admins', async () => {
            const mockClassrooms = [{ class_group_id: 'class-1', class_name: 'CS 101' }];

            const selectBuilder = createSelectBuilder(mockClassrooms);
            const deleteBuilder = createDeleteBuilder();

            const dbClient = {
                selectFrom: vi.fn().mockReturnValue(selectBuilder),
                deleteFrom: vi.fn().mockReturnValue(deleteBuilder),
            } as any;

            await bulkDeleteClassrooms(dbClient, {
                classGroupIds: ['class-1'],
                userId: 'admin-1',
                institutionId: 'inst-1',
                userRole: 'admin',
            });

            expect(assertHeadInstructorClassroomAccess).not.toHaveBeenCalled();
            expect(dbClient.selectFrom).toHaveBeenCalledWith('class_groups as cg');
            expect(selectBuilder.innerJoin).not.toHaveBeenCalled();
            expect(dbClient.deleteFrom).toHaveBeenCalledWith('class_groups');
            expect(deleteBuilder.where).toHaveBeenCalledWith('class_group_id', 'in', ['class-1']);
            expect(
                ActivityNotificationService.notifyInstitutionActivityDeleted,
            ).toHaveBeenCalledTimes(1);
        });

        it('blocks bulk deletion when the instructor is not the head instructor', async () => {
            vi.mocked(assertHeadInstructorClassroomAccess).mockRejectedValue(
                new HTTPException(403, {
                    message: 'Only the head instructor can manage classroom instructors.',
                }),
            );

            const dbClient = {
                selectFrom: vi.fn(),
                deleteFrom: vi.fn(),
            } as any;

            await expect(
                bulkDeleteClassrooms(dbClient, {
                    classGroupIds: ['class-1'],
                    userId: 'assistant-1',
                    institutionId: 'inst-1',
                    userRole: 'instructor',
                }),
            ).rejects.toMatchObject<Partial<HTTPException>>({
                status: 403,
            });

            expect(dbClient.selectFrom).not.toHaveBeenCalled();
            expect(dbClient.deleteFrom).not.toHaveBeenCalled();
        });
    });

    describe('deleteClassroom', () => {
        it('deletes classroom-owned exams before deleting the classroom', async () => {
            const classroomSelectBuilder = createSelectFirstBuilder({
                class_group_id: 'class-1',
                class_name: 'CS 101',
            });
            const ownedExamsSelectBuilder = {
                select: vi.fn().mockReturnThis(),
                where: vi.fn().mockReturnThis(),
                execute: vi.fn().mockResolvedValue([{ exam_id: 'exam-1' }, { exam_id: 'exam-2' }]),
            };
            const deleteAssignmentBuilder = createDeleteBuilder();
            const deleteClassroomBuilder = createDeleteBuilder();

            const dbClient = {
                selectFrom: vi
                    .fn()
                    .mockReturnValueOnce(classroomSelectBuilder)
                    .mockReturnValueOnce(ownedExamsSelectBuilder),
                deleteFrom: vi
                    .fn()
                    .mockReturnValueOnce(deleteAssignmentBuilder)
                    .mockReturnValueOnce(deleteClassroomBuilder),
            } as any;

            await deleteClassroom(dbClient, {
                classGroupId: 'class-1',
                userId: 'user-1',
                institutionId: 'inst-1',
                userRole: 'admin',
            });

            expect(assertHeadInstructorClassroomAccess).toHaveBeenCalledWith({
                dbClient,
                classGroupId: 'class-1',
                userId: 'user-1',
                institutionId: 'inst-1',
                userRole: 'admin',
            });
            expect(deleteExamForCleanup).toHaveBeenCalledTimes(2);
            expect(deleteExamForCleanup).toHaveBeenNthCalledWith(1, dbClient, 'exam-1', 'inst-1');
            expect(deleteExamForCleanup).toHaveBeenNthCalledWith(2, dbClient, 'exam-2', 'inst-1');
            expect(dbClient.deleteFrom).toHaveBeenNthCalledWith(1, 'exam_section_assignments');
            expect(deleteAssignmentBuilder.where).toHaveBeenCalledWith(
                'class_group_id',
                '=',
                'class-1',
            );
            expect(dbClient.deleteFrom).toHaveBeenNthCalledWith(2, 'class_groups');
            expect(deleteClassroomBuilder.where).toHaveBeenCalledWith(
                'class_group_id',
                '=',
                'class-1',
            );
        });

        it('blocks deletion when the instructor is not the head instructor', async () => {
            vi.mocked(assertHeadInstructorClassroomAccess).mockRejectedValue(
                new HTTPException(403, {
                    message: 'Only the head instructor can manage classroom instructors.',
                }),
            );

            const dbClient = {
                selectFrom: vi.fn(),
                deleteFrom: vi.fn(),
            } as any;

            await expect(
                deleteClassroom(dbClient, {
                    classGroupId: 'class-1',
                    userId: 'assistant-1',
                    institutionId: 'inst-1',
                    userRole: 'instructor',
                }),
            ).rejects.toMatchObject<Partial<HTTPException>>({
                status: 403,
            });

            expect(dbClient.selectFrom).not.toHaveBeenCalled();
            expect(dbClient.deleteFrom).not.toHaveBeenCalled();
        });

        it('removes classroom assignment rows without deleting exams that are only shared links', async () => {
            const classroomSelectBuilder = createSelectFirstBuilder({
                class_group_id: 'class-1',
                class_name: 'CS 101',
            });
            const ownedExamsSelectBuilder = {
                select: vi.fn().mockReturnThis(),
                where: vi.fn().mockReturnThis(),
                execute: vi.fn().mockResolvedValue([]),
            };
            const deleteAssignmentBuilder = createDeleteBuilder();
            const deleteClassroomBuilder = createDeleteBuilder();

            const dbClient = {
                selectFrom: vi
                    .fn()
                    .mockReturnValueOnce(classroomSelectBuilder)
                    .mockReturnValueOnce(ownedExamsSelectBuilder),
                deleteFrom: vi
                    .fn()
                    .mockReturnValueOnce(deleteAssignmentBuilder)
                    .mockReturnValueOnce(deleteClassroomBuilder),
            } as any;

            await deleteClassroom(dbClient, {
                classGroupId: 'class-1',
                userId: 'user-1',
                institutionId: 'inst-1',
                userRole: 'admin',
            });

            expect(deleteExamForCleanup).not.toHaveBeenCalled();
            expect(dbClient.deleteFrom).toHaveBeenNthCalledWith(1, 'exam_section_assignments');
            expect(dbClient.deleteFrom).toHaveBeenNthCalledWith(2, 'class_groups');
        });

        it('still deletes the classroom when no exams are attached', async () => {
            const classroomSelectBuilder = createSelectFirstBuilder({
                class_group_id: 'class-1',
                class_name: 'CS 101',
            });
            const ownedExamsSelectBuilder = {
                select: vi.fn().mockReturnThis(),
                where: vi.fn().mockReturnThis(),
                execute: vi.fn().mockResolvedValue([]),
            };
            const deleteAssignmentBuilder = createDeleteBuilder();
            const deleteClassroomBuilder = createDeleteBuilder();

            const dbClient = {
                selectFrom: vi
                    .fn()
                    .mockReturnValueOnce(classroomSelectBuilder)
                    .mockReturnValueOnce(ownedExamsSelectBuilder),
                deleteFrom: vi
                    .fn()
                    .mockReturnValueOnce(deleteAssignmentBuilder)
                    .mockReturnValueOnce(deleteClassroomBuilder),
            } as any;

            await deleteClassroom(dbClient, {
                classGroupId: 'class-1',
                userId: 'user-1',
                institutionId: 'inst-1',
                userRole: 'admin',
            });

            expect(deleteExamForCleanup).not.toHaveBeenCalled();
            expect(deleteClassroomBuilder.where).toHaveBeenCalledWith(
                'class_group_id',
                '=',
                'class-1',
            );
            expect(
                ActivityNotificationService.notifyInstitutionActivityDeleted,
            ).toHaveBeenCalledTimes(1);
        });
    });

    describe('archiveClassroom', () => {
        it('archives a classroom even when the caller is not a core admin role', async () => {
            const selectBuilder = createSelectFirstBuilder({
                class_group_id: 'class-1',
                class_name: 'CS 101',
            });
            const updateBuilder = createUpdateBuilder();

            const dbClient = {
                selectFrom: vi.fn().mockReturnValue(selectBuilder),
                updateTable: vi.fn().mockReturnValue(updateBuilder),
            } as any;

            await archiveClassroom(dbClient, {
                classGroupId: 'class-1',
                userId: 'user-1',
                institutionId: 'inst-1',
                userRole: 'registrar',
            });

            expect(dbClient.selectFrom).toHaveBeenCalledWith('class_groups as cg');
            expect(dbClient.updateTable).toHaveBeenCalledWith('class_groups');
            expect(updateBuilder.where).toHaveBeenCalledWith('class_group_id', '=', 'class-1');
            expect(
                ActivityNotificationService.notifyInstitutionActivityUpdated,
            ).toHaveBeenCalledTimes(1);
        });
    });

    describe('unarchiveClassroom', () => {
        it('unarchives a classroom even when the caller is not a core admin role', async () => {
            const selectBuilder = createSelectFirstBuilder({
                class_group_id: 'class-1',
                class_name: 'CS 101',
            });
            const updateBuilder = createUpdateBuilder();

            const dbClient = {
                selectFrom: vi.fn().mockReturnValue(selectBuilder),
                updateTable: vi.fn().mockReturnValue(updateBuilder),
            } as any;

            await unarchiveClassroom(dbClient, {
                classGroupId: 'class-1',
                userId: 'user-1',
                institutionId: 'inst-1',
                userRole: 'registrar',
            });

            expect(dbClient.selectFrom).toHaveBeenCalledWith('class_groups as cg');
            expect(dbClient.updateTable).toHaveBeenCalledWith('class_groups');
            expect(updateBuilder.where).toHaveBeenCalledWith('class_group_id', '=', 'class-1');
            expect(
                ActivityNotificationService.notifyInstitutionActivityUpdated,
            ).toHaveBeenCalledTimes(1);
        });
    });
});
