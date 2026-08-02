import { type DbClient } from '@sentinel/db';
import { HTTPException } from 'hono/http-exception';
import {
    type ClassroomAccessScope,
    type ClassroomStudentAccessScope,
} from '../helper/classroom.types';
import { getClassGroupColumnSupport } from '../helper/classroom-schema-compat';
import { getAccessibleClassroomOrThrow } from './classroom-access-query.service';
import { ActivityNotificationService } from '../../../general/notification/services/activity-notification.service';
import { deleteExamForCleanup } from '../../../examination/exams/services/delete-exam.service';
import { assertHeadInstructorClassroomAccess } from './classroom-instructor-write-helper.service';

export async function saveClassroomConfiguration(args: {
    dbClient: DbClient;
    classGroupId: string;
    className: string;
    updatedBy: string;
}) {
    const { dbClient, classGroupId, className, updatedBy } = args;
    const classGroupColumnSupport = await getClassGroupColumnSupport(dbClient);

    if (!classGroupColumnSupport.hasClassName) {
        throw new HTTPException(503, {
            message:
                'Classroom storage is not available yet. Run the 20260419100000_add_classroom_foundation migration first.',
        });
    }

    const classroom = await dbClient
        .selectFrom('class_groups')
        .select(['institution_id', 'class_name'])
        .where('class_group_id', '=', classGroupId)
        .executeTakeFirst();

    await dbClient
        .updateTable('class_groups')
        .set({
            class_name: className.trim(),
            ...(classGroupColumnSupport.hasUpdatedAt
                ? { updated_at: new Date().toISOString() }
                : {}),
            ...(classGroupColumnSupport.hasUpdatedBy ? { updated_by: updatedBy } : {}),
        })
        .where('class_group_id', '=', classGroupId)
        .execute();

    if (classroom?.institution_id) {
        try {
            await ActivityNotificationService.notifyInstitutionActivityUpdated({
                dbClient,
                actorUserId: updatedBy,
                institutionId: classroom.institution_id,
                targetType: 'CLASSROOM',
                targetId: classGroupId,
                targetLabel: className.trim(),
                title: 'Classroom settings updated',
                message: `Classroom settings for "${classroom.class_name || 'Classroom'}" updated to "${className.trim()}".`,
                sourceModule: 'classrooms',
                sourceAction: 'configure',
            });
        } catch (notifErr) {
            console.error('Failed to notify saveClassroomConfiguration:', notifErr);
        }
    }
}

/**
 * Deletes a classroom after first removing directly owned exams and any
 * remaining classroom-scoped exam assignment links tied to that classroom.
 */
export async function deleteClassroom(
    dbClient: DbClient,
    { classGroupId, userId, institutionId, userRole }: ClassroomAccessScope,
) {
    await assertHeadInstructorClassroomAccess({
        dbClient,
        classGroupId,
        userId,
        institutionId,
        userRole,
    });

    const isCoreAdmin = userRole ? ['support', 'superadmin', 'admin'].includes(userRole) : false;

    let query = dbClient
        .selectFrom('class_groups as cg')
        .select(['cg.class_group_id', 'cg.class_name'])
        .where('cg.class_group_id', '=', classGroupId)
        .where('cg.institution_id', '=', institutionId);

    if (!isCoreAdmin) {
        query = query
            .innerJoin('class_roles as cr', 'cr.class_group_id', 'cg.class_group_id')
            .innerJoin('roles as r', 'r.role_id', 'cr.role_id')
            .where('cr.user_id', '=', userId)
            .where('r.role_name', '=', 'instructor');
    }

    const classroom = await query.executeTakeFirst();

    if (!classroom) {
        throw new HTTPException(404, { message: 'Classroom not found.' });
    }

    const ownedExams = await dbClient
        .selectFrom('exams')
        .select(['exam_id'])
        .where('class_group_id', '=', classGroupId)
        .where('institution_id', '=', institutionId)
        .execute();

    for (const exam of ownedExams) {
        await deleteExamForCleanup(dbClient, exam.exam_id, institutionId);
    }

    await dbClient
        .deleteFrom('exam_section_assignments' as any)
        .where('class_group_id', '=', classGroupId)
        .execute();

    await dbClient.deleteFrom('class_groups').where('class_group_id', '=', classGroupId).execute();

    try {
        await ActivityNotificationService.notifyInstitutionActivityDeleted({
            dbClient,
            actorUserId: userId,
            institutionId,
            targetType: 'CLASSROOM',
            targetId: classGroupId,
            targetLabel: classroom.class_name || 'Classroom',
            title: 'Classroom deleted',
            message: `Classroom "${classroom.class_name || 'Classroom'}" has been deleted.`,
            sourceModule: 'classrooms',
            sourceAction: 'delete',
        });
    } catch (notifErr) {
        console.error('Failed to notify deleteClassroom:', notifErr);
    }
}

/**
 * Deletes multiple classrooms in bulk and logs the activity for each deletion.
 *
 * @param dbClient - The database client instance.
 * @param args - The arguments containing classroom IDs and user scope.
 */
export async function bulkDeleteClassrooms(
    dbClient: DbClient,
    {
        classGroupIds,
        userId,
        institutionId,
        userRole,
    }: {
        classGroupIds: string[];
        userId: string;
        institutionId: string;
        userRole?: string;
    },
) {
    if (classGroupIds.length === 0) return;

    const isCoreAdmin = userRole ? ['support', 'superadmin', 'admin'].includes(userRole) : false;

    if (!isCoreAdmin) {
        for (const classGroupId of classGroupIds) {
            await assertHeadInstructorClassroomAccess({
                dbClient,
                classGroupId,
                userId,
                institutionId,
                userRole,
            });
        }
    }

    let query = dbClient
        .selectFrom('class_groups as cg')
        .select(['cg.class_group_id', 'cg.class_name'])
        .where('cg.class_group_id', 'in', classGroupIds)
        .where('cg.institution_id', '=', institutionId);

    if (!isCoreAdmin) {
        query = query
            .innerJoin('class_roles as cr', 'cr.class_group_id', 'cg.class_group_id')
            .innerJoin('roles as r', 'r.role_id', 'cr.role_id')
            .where('cr.user_id', '=', userId)
            .where('r.role_name', '=', 'instructor');
    }

    const classrooms = await query.execute();

    if (classrooms.length === 0) {
        throw new HTTPException(404, { message: 'Classrooms not found.' });
    }

    const foundIds = classrooms.map((c) => c.class_group_id);

    await dbClient.deleteFrom('class_groups').where('class_group_id', 'in', foundIds).execute();

    for (const classroom of classrooms) {
        try {
            await ActivityNotificationService.notifyInstitutionActivityDeleted({
                dbClient,
                actorUserId: userId,
                institutionId,
                targetType: 'CLASSROOM',
                targetId: classroom.class_group_id,
                targetLabel: classroom.class_name || 'Classroom',
                title: 'Classroom deleted',
                message: `Classroom "${classroom.class_name || 'Classroom'}" has been deleted.`,
                sourceModule: 'classrooms',
                sourceAction: 'delete',
            });
        } catch (notifErr) {
            console.error('Failed to notify bulkDeleteClassrooms:', notifErr);
        }
    }
}

export async function unenrollClassroomStudent(
    dbClient: DbClient,
    { classGroupId, studentId, userId, institutionId, userRole }: ClassroomStudentAccessScope,
) {
    await getAccessibleClassroomOrThrow(dbClient, {
        classGroupId,
        userId,
        institutionId,
        userRole,
    });

    const enrollment = await dbClient
        .selectFrom('class_groups as cg')
        .innerJoin('enrollments as enr', 'enr.class_group_id', 'cg.class_group_id')
        .innerJoin('students as st', 'st.student_id', 'enr.student_id')
        .select(['enr.enrollment_id'])
        .where('cg.class_group_id', '=', classGroupId)
        .where('cg.institution_id', '=', institutionId)
        .where('st.student_id', '=', studentId)
        .where('st.institution_id', '=', institutionId)
        .executeTakeFirst();

    if (!enrollment) {
        throw new HTTPException(404, { message: 'Student enrollment not found.' });
    }

    const details = await dbClient
        .selectFrom('students as st')
        .innerJoin('user_profiles as up', 'up.user_id', 'st.user_id')
        .select(['st.student_number', 'up.first_name', 'up.last_name'])
        .where('st.student_id', '=', studentId)
        .executeTakeFirst();

    const classroomNameRow = await dbClient
        .selectFrom('class_groups')
        .select(['class_name'])
        .where('class_group_id', '=', classGroupId)
        .executeTakeFirst();

    await dbClient
        .deleteFrom('enrollments')
        .where('enrollment_id', '=', enrollment.enrollment_id)
        .execute();

    if (details) {
        try {
            await ActivityNotificationService.notifyInstitutionActivityDeleted({
                dbClient,
                actorUserId: userId,
                institutionId,
                targetType: 'CLASSROOM_STUDENT',
                targetId: studentId,
                targetLabel: `${details.first_name || ''} ${details.last_name} (${details.student_number})`,
                title: 'Student removed from classroom',
                message: `Student "${details.first_name || ''} ${details.last_name}" (${details.student_number}) was removed from classroom "${classroomNameRow?.class_name || 'Classroom'}".`,
                sourceModule: 'classrooms',
                sourceAction: 'unenroll-student',
            });
        } catch (notifErr) {
            console.error('Failed to notify unenrollClassroomStudent:', notifErr);
        }
    }
}

export async function archiveClassroom(
    dbClient: DbClient,
    { classGroupId, userId, institutionId }: ClassroomAccessScope,
) {
    const classroom = await dbClient
        .selectFrom('class_groups as cg')
        .select(['cg.class_group_id', 'cg.class_name'])
        .where('cg.class_group_id', '=', classGroupId)
        .where('cg.institution_id', '=', institutionId)
        .executeTakeFirst();

    if (!classroom) {
        throw new HTTPException(404, { message: 'Classroom not found.' });
    }

    await dbClient
        .updateTable('class_groups')
        .set({
            archived_at: new Date().toISOString(),
        })
        .where('class_group_id', '=', classGroupId)
        .execute();

    try {
        await ActivityNotificationService.notifyInstitutionActivityUpdated({
            dbClient,
            actorUserId: userId,
            institutionId,
            targetType: 'CLASSROOM',
            targetId: classGroupId,
            targetLabel: classroom.class_name || 'Classroom',
            title: 'Classroom archived',
            message: `Classroom "${classroom.class_name || 'Classroom'}" has been archived.`,
            sourceModule: 'classrooms',
            sourceAction: 'archive',
        });
    } catch (notifErr) {
        console.error('Failed to notify archiveClassroom:', notifErr);
    }
}

export async function unarchiveClassroom(
    dbClient: DbClient,
    { classGroupId, userId, institutionId }: ClassroomAccessScope,
) {
    const classroom = await dbClient
        .selectFrom('class_groups as cg')
        .select(['cg.class_group_id', 'cg.class_name'])
        .where('cg.class_group_id', '=', classGroupId)
        .where('cg.institution_id', '=', institutionId)
        .executeTakeFirst();

    if (!classroom) {
        throw new HTTPException(404, { message: 'Classroom not found.' });
    }

    await dbClient
        .updateTable('class_groups')
        .set({
            archived_at: null,
        })
        .where('class_group_id', '=', classGroupId)
        .execute();

    try {
        await ActivityNotificationService.notifyInstitutionActivityUpdated({
            dbClient,
            actorUserId: userId,
            institutionId,
            targetType: 'CLASSROOM',
            targetId: classGroupId,
            targetLabel: classroom.class_name || 'Classroom',
            title: 'Classroom unarchived',
            message: `Classroom "${classroom.class_name || 'Classroom'}" has been unarchived.`,
            sourceModule: 'classrooms',
            sourceAction: 'unarchive',
        });
    } catch (notifErr) {
        console.error('Failed to notify unarchiveClassroom:', notifErr);
    }
}
