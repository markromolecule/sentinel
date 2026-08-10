import { type DbClient } from '@sentinel/db';
import { sql } from 'kysely';
import { HTTPException } from 'hono/http-exception';
import {
    getClassGroupColumnSupport,
    getClassroomExamColumnSupport,
} from '../helper/classroom-schema-compat';
import {
    type ClassroomAccessScope,
    type ClassroomScope,
    type RawClassroomRecord,
} from '../helper/classroom.types';

export async function buildAccessibleClassroomsQuery(
    dbClient: DbClient,
    { userId, institutionId }: ClassroomScope,
    role: 'instructor' | 'student' | 'any' = 'instructor',
    options: { status?: 'active' | 'archived' | 'all' } = {},
) {
    const [examColumnSupport, classGroupColumnSupport] = await Promise.all([
        getClassroomExamColumnSupport(dbClient),
        getClassGroupColumnSupport(dbClient),
    ]);

    const examCountSelect = examColumnSupport.hasClassGroupId
        ? sql<number>`(
              select count(*)::int
              from exams as ex
              where ex.class_group_id = cg.class_group_id
          )`
        : examColumnSupport.hasSectionId
            ? sql<number>`(
                select count(*)::int
                from exams as ex
                where ex.subject_id = cg.subject_id
                  and ex.section_id is not distinct from cg.section_id
                  and ex.institution_id is not distinct from cg.institution_id
            )`
            : sql<number>`0`;

    const studentCountSelect = sql<number>`(
        select count(*)::int
        from enrollments as e
        where e.class_group_id = cg.class_group_id
    )`;

    let query = dbClient
        .selectFrom('class_groups as cg')
        .leftJoin('class_roles as cr', (join) =>
            join.onRef('cr.class_group_id', '=', 'cg.class_group_id').on('cr.user_id', '=', userId),
        )
        .leftJoin('roles as r', 'r.role_id', 'cr.role_id')
        .leftJoin('subjects as s', 's.subject_id', 'cg.subject_id')
        .leftJoin('sections as sec', 'sec.section_id', 'cg.section_id')
        .leftJoin('terms as t', 't.term_id', 'cg.term_id')
        .leftJoin('departments as dep', 'dep.department_id', 'sec.department_id')
        .leftJoin('courses as course', 'course.course_id', 'sec.course_id')
        .leftJoin('enrollments as access_enr', 'access_enr.class_group_id', 'cg.class_group_id')
        .leftJoin('students as access_st', (join) =>
            join
                .onRef('access_st.student_id', '=', 'access_enr.student_id')
                .on('access_st.user_id', '=', userId),
        )
        .$if(classGroupColumnSupport.hasUpdatedBy, (qb) =>
            qb.leftJoin(
                'user_profiles as updater_profile',
                'updater_profile.user_id',
                'cg.updated_by',
            ),
        )
        .where('cg.institution_id', '=', institutionId);

    const canManageSelect =
        role === ('admin' as any)
            ? sql<boolean>`true`
            : sql<boolean>`exists (
                  select 1
                  from classroom_instructor_assignments cia_manage
                  where cia_manage.class_group_id = cg.class_group_id
                    and cia_manage.instructor_user_id = ${userId}
                    and cia_manage.is_head = true
              )`;

    const status = options.status ?? 'active';
    if (status === 'active') {
        query = query.where('cg.archived_at', 'is', null);
    } else if (status === 'archived') {
        query = query.where('cg.archived_at', 'is not', null);
    }

    // Apply role-based access filtering
    if (role !== ('admin' as any)) {
        query = query.where((eb) => {
            const isInstructor = eb.or([
                // If classroom is not configured, check class_roles
                eb.and([
                    eb('cg.class_name', 'is', null),
                    eb('cr.user_id', '=', userId),
                    eb('r.role_name', '=', 'instructor'),
                ]),
                // If classroom is configured, check classroom_instructor_assignments
                eb.exists(
                    eb
                        .selectFrom('classroom_instructor_assignments as cia_access')
                        .select('cia_access.assignment_id')
                        .whereRef('cia_access.class_group_id', '=', 'cg.class_group_id')
                        .where('cia_access.instructor_user_id', '=', userId)
                        .where('cia_access.status', '!=', 'REMOVED'),
                ),
            ]);

            const isStudent = eb('access_st.user_id', '=', userId);

            if (role === 'instructor') return isInstructor;
            if (role === 'student') return isStudent;
            return eb.or([isInstructor, isStudent]);
        });
    }

    query = query.select([
        'cg.class_group_id',
        classGroupColumnSupport.hasClassName
            ? 'cg.class_name'
            : sql<string | null>`null`.as('class_name'),
        'cg.subject_offering_id',
        'cg.subject_id',
        's.subject_code',
        's.subject_title',
        'cg.section_id',
        'sec.section_name',
        'cg.term_id',
        'cg.archived_at',
        't.academic_year as term_academic_year',
        't.semester as term_semester',
        'sec.department_id',
        'dep.department_code as department_code',
        'dep.department_name as department_name',
        'sec.course_id',
        'course.code as course_code',
        'course.title as course_title',
        'sec.year_level',
        'cg.institution_id',
        'cg.created_at',
        classGroupColumnSupport.hasUpdatedAt
            ? 'cg.updated_at'
            : sql<string | Date | null>`null`.as('updated_at'),
        classGroupColumnSupport.hasUpdatedBy
            ? 'cg.updated_by'
            : sql<string | null>`null`.as('updated_by'),
        studentCountSelect.as('student_count'),
        examCountSelect.as('exam_count'),
        classGroupColumnSupport.hasUpdatedBy
            ? sql<
                string | null
            >`MAX(NULLIF(TRIM(CONCAT_WS(' ', updater_profile.first_name, updater_profile.last_name)), ''))`.as(
                'updated_by_name',
            )
            : sql<string | null>`null`.as('updated_by_name'),
        canManageSelect.as('can_manage'),
        sql<any>`(
            select coalesce(json_agg(distinct nullif(trim(concat_ws(' ', up.first_name, up.last_name)), '')), '[]'::json)
            from classroom_instructor_assignments as cia_inst
            join user_profiles up on up.user_id = cia_inst.instructor_user_id
            where cia_inst.class_group_id = cg.class_group_id
        )`.as('instructors'),
    ]);

    query = query.groupBy([
        'cg.class_group_id',
        'cg.subject_offering_id',
        'cg.subject_id',
        's.subject_code',
        's.subject_title',
        'cg.section_id',
        'sec.section_name',
        'cg.term_id',
        'cg.archived_at',
        't.academic_year',
        't.semester',
        'sec.department_id',
        'dep.department_code',
        'dep.department_name',
        'sec.course_id',
        'course.code',
        'course.title',
        'sec.year_level',
        'cg.institution_id',
        'cg.created_at',
    ]);

    if (classGroupColumnSupport.hasClassName) {
        query = query.groupBy('cg.class_name');
    }

    if (classGroupColumnSupport.hasUpdatedAt) {
        query = query.groupBy('cg.updated_at');
    }

    if (classGroupColumnSupport.hasUpdatedBy) {
        query = query.groupBy('cg.updated_by');
    }

    return query;
}

export async function getAccessibleClassroomOrThrow(
    dbClient: DbClient,
    { classGroupId, userId, institutionId, userRole }: ClassroomAccessScope,
): Promise<RawClassroomRecord> {
    const isCoreAdmin = userRole ? ['support', 'superadmin', 'admin'].includes(userRole) : false;
    const query = (
        await buildAccessibleClassroomsQuery(
            dbClient,
            { userId, institutionId },
            isCoreAdmin ? ('admin' as any) : 'any',
        )
    ).where('cg.class_group_id', '=', classGroupId);

    const classroom = (await query.executeTakeFirst()) as RawClassroomRecord | undefined;

    if (!classroom) {
        throw new HTTPException(404, { message: 'Classroom not found.' });
    }

    return classroom;
}
