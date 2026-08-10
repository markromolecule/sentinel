import { type DbClient } from '@sentinel/db';
import { getAccessibleClassroomOrThrow } from './classroom-access-query.service';
import { sql } from 'kysely';

export type ClassroomInstructorRecord = {
    user_id: string;
    name: string;
    is_head: boolean;
    status: 'ACTIVE' | 'PENDING_ACK' | 'ACKNOWLEDGED' | 'FLAGGED' | 'REMOVED';
    responded_at: string | Date | null;
    justification: string | null;
    flag_reason: string | null;
    assigned_at: string | Date | null;
    assigned_by_user_id: string | null;
    assigned_by_name: string | null;
};

/**
 * Builds a consistent and user-friendly classroom notification label.
 */
export function buildClassroomNotificationLabel(classroom: {
    class_name?: string | null;
    subject_title?: string | null;
    section_name?: string | null;
}) {
    if (classroom.class_name) {
        return classroom.class_name;
    }

    return (
        [classroom.subject_title, classroom.section_name].filter(Boolean).join(' - ') || 'Classroom'
    );
}

/**
 * Lists all instructors assigned to a classroom.
 */
export async function listClassroomInstructors(args: {
    dbClient: DbClient;
    classGroupId: string;
    userId: string;
    institutionId: string;
    userRole?: string;
}) {
    const { dbClient, classGroupId, userId, institutionId, userRole } = args;

    await getAccessibleClassroomOrThrow(dbClient, {
        classGroupId,
        userId,
        institutionId,
        userRole,
    });

    const instructors = await dbClient
        .selectFrom('classroom_instructor_assignments as cia')
        .innerJoin('user_profiles as up', 'up.user_id', 'cia.instructor_user_id')
        .leftJoin(
            'user_profiles as assigner_profile',
            'assigner_profile.user_id',
            'cia.assigned_by_user_id',
        )
        .select([
            'cia.instructor_user_id as user_id',
            sql<string>`trim(concat(up.first_name, ' ', up.last_name))`.as('name'),
            'cia.is_head',
            'cia.status',
            'cia.responded_at',
            'cia.justification',
            'cia.flag_reason',
            'cia.created_at as assigned_at',
            'cia.assigned_by_user_id',
            sql<
                string | null
            >`nullif(trim(concat(assigner_profile.first_name, ' ', assigner_profile.last_name)), '')`.as(
                'assigned_by_name',
            ),
        ])
        .where('cia.class_group_id', '=', classGroupId)
        .orderBy('cia.is_head', 'desc')
        .orderBy('name', 'asc')
        .execute();

    return instructors.map((instructor: ClassroomInstructorRecord) => ({
        ...instructor,
        assigned_at: instructor.assigned_at ? new Date(instructor.assigned_at).toISOString() : null,
        responded_at: instructor.responded_at
            ? new Date(instructor.responded_at).toISOString()
            : null,
    }));
}
