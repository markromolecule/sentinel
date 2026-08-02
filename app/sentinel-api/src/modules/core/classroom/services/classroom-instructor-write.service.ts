import { type DbClient, executeTransaction } from '@sentinel/db';
import { HTTPException } from 'hono/http-exception';
import { getAccessibleClassroomOrThrow } from './classroom-access-query.service';
import { ClassroomNotificationService } from '../../../general/notification/services/classroom-notification.service';
import {
    checkInstructorQualification,
    getQualificationMode,
} from './classroom-instructor-qualification.service';
import {
    buildClassroomNotificationLabel,
    listClassroomInstructors,
} from './classroom-instructor-query.service';
import {
    getInstructorRoleId,
    getClassroomInstructorAssignment,
    getAssignableInstructor,
    assertHeadInstructorClassroomAccess,
} from './classroom-instructor-write-helper.service';

/**
 * Assigns an instructor to a classroom.
 */
export async function assignInstructorToClassroom(args: {
    dbClient: DbClient;
    classGroupId: string;
    instructorUserId: string;
    actorUserId: string;
    institutionId: string;
    userRole?: string;
}) {
    const { dbClient, classGroupId, instructorUserId, actorUserId, institutionId, userRole } = args;
    const instructorRoleId = await getInstructorRoleId(dbClient);

    await assertHeadInstructorClassroomAccess({
        dbClient,
        classGroupId,
        userId: actorUserId,
        institutionId,
        userRole,
    });

    const classroom = await getAccessibleClassroomOrThrow(dbClient, {
        classGroupId,
        userId: actorUserId,
        institutionId,
        userRole,
    });

    const instructor = await getAssignableInstructor({
        dbClient,
        instructorUserId,
        institutionId,
    });

    if (!instructor) {
        throw new HTTPException(404, {
            message: 'Instructor not found in the same institution.',
        });
    }

    const existingAssignment = await getClassroomInstructorAssignment({
        dbClient,
        classGroupId,
        instructorUserId,
    });

    if (existingAssignment) {
        throw new HTTPException(409, {
            message: 'Instructor is already assigned to this classroom.',
        });
    }

    const qualificationMode = await getQualificationMode(dbClient);
    const qualCheck = await checkInstructorQualification({
        dbClient,
        instructorUserId,
        subjectId: classroom.subject_id as string,
    });

    let statusToSet: 'ACTIVE' | 'PENDING_ACK' | 'FLAGGED' = 'PENDING_ACK';
    let flagReason: string | null = null;

    if (!qualCheck.isQualified) {
        if (qualificationMode === 'BLOCK') {
            throw new HTTPException(422, {
                message: `Instructor is not qualified for subject ${classroom.subject_code || ''} (Mode: BLOCK)`,
            });
        } else if (qualificationMode === 'WARN') {
            statusToSet = 'FLAGGED';
            flagReason = `Instructor is not qualified for subject: ${classroom.subject_code || 'Unknown'}`;
        }
    } else if (instructorUserId === actorUserId) {
        statusToSet = 'ACTIVE';
    }

    await executeTransaction(async (trx) => {
        const existingRole = await trx
            .selectFrom('class_roles')
            .select('class_group_id')
            .where('class_group_id', '=', classGroupId)
            .where('user_id', '=', instructorUserId)
            .where('role_id', '=', instructorRoleId)
            .executeTakeFirst();

        if (!existingRole) {
            await trx
                .insertInto('class_roles')
                .values({
                    class_group_id: classGroupId,
                    user_id: instructorUserId,
                    role_id: instructorRoleId,
                    assigned_at: new Date(),
                })
                .execute();
        }

        await trx
            .insertInto('classroom_instructor_assignments')
            .values({
                class_group_id: classGroupId,
                instructor_user_id: instructorUserId,
                assigned_by_user_id: actorUserId,
                is_head: false,
                status: statusToSet,
                flag_reason: flagReason,
                updated_at: new Date(),
            })
            .execute();
    });

    await ClassroomNotificationService.notifyClassroomInstructorAssigned({
        dbClient,
        recipientUserId: instructor.user_id as string,
        actorUserId,
        institutionId,
        classGroupId,
        classroomLabel: buildClassroomNotificationLabel(classroom),
        assignerName: classroom.updated_by_name ?? 'Head Instructor',
    });

    return await listClassroomInstructors({
        dbClient,
        classGroupId,
        userId: actorUserId,
        institutionId,
        userRole,
    });
}

/**
 * Removes an instructor from a classroom.
 */
export async function removeInstructorFromClassroom(args: {
    dbClient: DbClient;
    classGroupId: string;
    instructorUserId: string;
    actorUserId: string;
    institutionId: string;
    userRole?: string;
}) {
    const { dbClient, classGroupId, instructorUserId, actorUserId, institutionId, userRole } = args;

    await assertHeadInstructorClassroomAccess({
        dbClient,
        classGroupId,
        userId: actorUserId,
        institutionId,
        userRole,
    });

    const instructorRoleId = await getInstructorRoleId(dbClient);

    const existingAssignment = await getClassroomInstructorAssignment({
        dbClient,
        classGroupId,
        instructorUserId,
    });

    if (!existingAssignment) {
        throw new HTTPException(404, {
            message: 'Instructor assignment not found for this classroom.',
        });
    }

    if (existingAssignment.is_head) {
        throw new HTTPException(409, {
            message: 'The head instructor cannot be removed from the classroom.',
        });
    }

    await executeTransaction(async (trx) => {
        await trx
            .deleteFrom('classroom_instructor_assignments')
            .where('class_group_id', '=', classGroupId)
            .where('instructor_user_id', '=', instructorUserId)
            .execute();

        await trx
            .deleteFrom('class_roles')
            .where('class_group_id', '=', classGroupId)
            .where('user_id', '=', instructorUserId)
            .where('role_id', '=', instructorRoleId)
            .execute();
    });
}
