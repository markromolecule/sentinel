import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HTTPException } from 'hono/http-exception';
import {
    assignInstructorToClassroom,
    removeInstructorFromClassroom,
} from './classroom-instructor-write.service';
import { getAccessibleClassroomOrThrow } from './classroom-access-query.service';
import { executeTransaction } from '@sentinel/db';
import { ClassroomNotificationService } from '../../../general/notification/services/classroom-notification.service';

vi.mock('./classroom-access-query.service', () => ({
    getAccessibleClassroomOrThrow: vi.fn(),
}));

vi.mock('@sentinel/db', async () => {
    const actual = await vi.importActual<typeof import('@sentinel/db')>('@sentinel/db');
    return {
        ...actual,
        executeTransaction: vi.fn(),
    };
});

vi.mock('../../../general/notification/services/classroom-notification.service', () => ({
    ClassroomNotificationService: {
        notifyClassroomInstructorAssigned: vi.fn().mockResolvedValue(undefined),
    },
}));

function createSelectBuilder<T>(result: T) {
    return {
        innerJoin: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        executeTakeFirst: vi.fn().mockResolvedValue(result),
        execute: vi.fn().mockResolvedValue(result),
    };
}

describe('classroom instructor write service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('rejects assignment attempts from non-head instructors', async () => {
        vi.mocked(getAccessibleClassroomOrThrow).mockResolvedValue({
            class_group_id: 'class-1',
        } as any);

        const roleBuilder = createSelectBuilder({ role_id: 7 });
        const headCheckBuilder = createSelectBuilder(undefined);
        const dbClient = {
            selectFrom: vi
                .fn()
                .mockReturnValueOnce(roleBuilder)
                .mockReturnValueOnce(headCheckBuilder),
        } as any;

        await expect(
            assignInstructorToClassroom({
                dbClient,
                classGroupId: 'class-1',
                instructorUserId: 'target-1',
                actorUserId: 'member-1',
                institutionId: 'institution-1',
            }),
        ).rejects.toMatchObject<Partial<HTTPException>>({
            status: 403,
            message: 'Only the head instructor can manage classroom instructors.',
        });
    });

    it('assigns an instructor and returns the refreshed membership list', async () => {
        vi.mocked(getAccessibleClassroomOrThrow).mockResolvedValue({
            class_group_id: 'class-1',
            class_name: 'Physics 101 - BSCS 3A',
            updated_by_name: 'Head Instructor',
        } as any);
        vi.mocked(executeTransaction).mockImplementation(async (callback: any) => {
            const trx = {
                selectFrom: vi.fn().mockReturnValue(createSelectBuilder(undefined)),
                insertInto: vi.fn().mockReturnValue({
                    values: vi.fn().mockReturnThis(),
                    execute: vi.fn().mockResolvedValue(undefined),
                }),
            } as any;

            return await callback(trx);
        });

        const roleBuilder = createSelectBuilder({ role_id: 7 });
        const headCheckBuilder = createSelectBuilder({ assignment_id: 'head-assignment' });
        const targetInstructorBuilder = createSelectBuilder({
            user_id: 'target-1',
            name: 'Assigned Instructor',
        });
        const existingAssignmentBuilder = createSelectBuilder(undefined);
        const listBuilder = createSelectBuilder([
            {
                user_id: 'head-1',
                name: 'Head Instructor',
                is_head: true,
                assigned_at: '2026-05-09T08:00:00.000Z',
                assigned_by_user_id: 'head-1',
                assigned_by_name: 'Head Instructor',
            },
            {
                user_id: 'target-1',
                name: 'Assigned Instructor',
                is_head: false,
                assigned_at: '2026-05-09T09:00:00.000Z',
                assigned_by_user_id: 'head-1',
                assigned_by_name: 'Head Instructor',
            },
        ]);

        let headCheckCalled = false;
        const dbClient = {
            selectFrom: vi.fn().mockImplementation((table) => {
                if (table === 'roles') return roleBuilder;
                if (table === 'classroom_instructor_assignments') {
                    if (!headCheckCalled) {
                        headCheckCalled = true;
                        return headCheckBuilder;
                    }
                    return existingAssignmentBuilder;
                }
                if (table === 'instructors' || table === 'instructors as ins')
                    return targetInstructorBuilder;
                if (table === 'system_settings')
                    return createSelectBuilder({ setting_value: 'WARN' });
                if (table === 'instructor_subjects') return createSelectBuilder(undefined);
                if (table === 'instructor_courses as ic') return createSelectBuilder(undefined);
                return listBuilder;
            }),
        } as any;

        const result = await assignInstructorToClassroom({
            dbClient,
            classGroupId: 'class-1',
            instructorUserId: 'target-1',
            actorUserId: 'head-1',
            institutionId: 'institution-1',
        });

        expect(result).toHaveLength(2);
        expect(result[1]).toMatchObject({
            user_id: 'target-1',
            is_head: false,
        });
        expect(executeTransaction).toHaveBeenCalled();
        expect(ClassroomNotificationService.notifyClassroomInstructorAssigned).toHaveBeenCalledWith(
            {
                dbClient,
                recipientUserId: 'target-1',
                actorUserId: 'head-1',
                institutionId: 'institution-1',
                classGroupId: 'class-1',
                classroomLabel: 'Physics 101 - BSCS 3A',
                assignerName: 'Head Instructor',
            },
        );
    });

    it('prevents removing the head instructor', async () => {
        vi.mocked(getAccessibleClassroomOrThrow).mockResolvedValue({
            class_group_id: 'class-1',
        } as any);

        const headCheckBuilder = createSelectBuilder({
            assignment_id: 'actor-head-assignment',
        });
        const roleBuilder = createSelectBuilder({ role_id: 7 });
        const existingAssignmentBuilder = createSelectBuilder({
            assignment_id: 'head-assignment',
            is_head: true,
        });
        const dbClient = {
            selectFrom: vi
                .fn()
                .mockReturnValueOnce(headCheckBuilder)
                .mockReturnValueOnce(roleBuilder)
                .mockReturnValueOnce(existingAssignmentBuilder),
        } as any;

        await expect(
            removeInstructorFromClassroom({
                dbClient,
                classGroupId: 'class-1',
                instructorUserId: 'head-1',
                actorUserId: 'head-1',
                institutionId: 'institution-1',
            }),
        ).rejects.toMatchObject<Partial<HTTPException>>({
            status: 409,
            message: 'The head instructor cannot be removed from the classroom.',
        });
    });

    it('rejects removal attempts from non-head instructors', async () => {
        vi.mocked(getAccessibleClassroomOrThrow).mockResolvedValue({
            class_group_id: 'class-1',
        } as any);

        const headCheckBuilder = createSelectBuilder(undefined);
        const dbClient = {
            selectFrom: vi.fn().mockReturnValueOnce(headCheckBuilder),
        } as any;

        await expect(
            removeInstructorFromClassroom({
                dbClient,
                classGroupId: 'class-1',
                instructorUserId: 'assistant-1',
                actorUserId: 'assistant-2',
                institutionId: 'institution-1',
            }),
        ).rejects.toMatchObject<Partial<HTTPException>>({
            status: 403,
            message: 'Only the head instructor can manage classroom instructors.',
        });

        expect(getAccessibleClassroomOrThrow).toHaveBeenCalledWith(dbClient, {
            classGroupId: 'class-1',
            userId: 'assistant-2',
            institutionId: 'institution-1',
            userRole: undefined,
        });
        expect(executeTransaction).not.toHaveBeenCalled();
    });

    it('allows removing an assigned instructor by the head instructor', async () => {
        vi.mocked(getAccessibleClassroomOrThrow).mockResolvedValue({
            class_group_id: 'class-1',
        } as any);
        vi.mocked(executeTransaction).mockImplementation(async (callback: any) => {
            const trx = {
                deleteFrom: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnThis(),
                    execute: vi.fn().mockResolvedValue(undefined),
                }),
            } as any;
            return await callback(trx);
        });

        const headCheckBuilder = createSelectBuilder({
            assignment_id: 'head-assignment',
        });
        const roleBuilder = createSelectBuilder({ role_id: 7 });
        const existingAssignmentBuilder = createSelectBuilder({
            assignment_id: 'assistant-assignment',
            is_head: false,
        });
        const dbClient = {
            selectFrom: vi
                .fn()
                .mockReturnValueOnce(headCheckBuilder)
                .mockReturnValueOnce(roleBuilder)
                .mockReturnValueOnce(existingAssignmentBuilder),
        } as any;

        await removeInstructorFromClassroom({
            dbClient,
            classGroupId: 'class-1',
            instructorUserId: 'assistant-1',
            actorUserId: 'head-1',
            institutionId: 'institution-1',
        });

        expect(executeTransaction).toHaveBeenCalled();
    });
});
