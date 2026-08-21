import { type DbClient } from '@sentinel/db';
import { sql } from 'kysely';
import { buildClassroomStudentResponse } from '../helper/classroom-mappers';
import {
    type ClassroomAccessScope,
    type RawClassroomStudentRecord,
} from '../helper/classroom.types';

export async function getClassroomStudents(
    dbClient: DbClient,
    { classGroupId, institutionId }: Pick<ClassroomAccessScope, 'classGroupId' | 'institutionId'>,
) {
    const students = await dbClient
        .selectFrom('enrollments as enr')
        .innerJoin('students as st', 'st.student_id', 'enr.student_id')
        .leftJoin('user_profiles as up', 'up.user_id', 'st.user_id')
        .leftJoin('student_whitelist as sw', (join) =>
            join
                .onRef('sw.institution_id', '=', 'st.institution_id')
                .onRef('sw.student_number', '=', 'st.student_number'),
        )
        .leftJoin('departments as dep', 'dep.department_id', 'st.department_id')
        .leftJoin('courses as course', 'course.course_id', 'st.course_id')
        .select([
            'st.student_id',
            'st.user_id',
            'st.student_number',
            sql<string | null>`COALESCE(up.first_name, sw.first_name)`.as('first_name'),
            sql<string | null>`COALESCE(up.last_name, sw.last_name)`.as('last_name'),
            sql<
                string | null
            >`NULLIF(TRIM(CONCAT_WS(' ', COALESCE(up.first_name, sw.first_name), COALESCE(up.last_name, sw.last_name))), '')`.as(
                'full_name',
            ),
            'st.department_id',
            'dep.department_code as department_code',
            'dep.department_name as department_name',
            'st.course_id',
            'course.code as course_code',
            'course.title as course_title',
            'enr.enrolled_at',
            'up.avatar_url as avatar_url',
            sql<boolean>`(st.user_id IS NOT NULL)`.as('is_claimed'),
            sql<
                'CLAIMED' | 'UNCLAIMED'
            >`CASE WHEN st.user_id IS NOT NULL THEN 'CLAIMED' ELSE 'UNCLAIMED' END`.as(
                'claim_status',
            ),
        ])
        .where('enr.class_group_id', '=', classGroupId)
        .where('st.institution_id', '=', institutionId)
        .orderBy(sql`COALESCE(up.last_name, sw.last_name, st.student_number)`, 'asc')
        .orderBy(sql`COALESCE(up.first_name, sw.first_name)`, 'asc')
        .orderBy('st.student_number', 'asc')
        .execute();

    return students.map((student) =>
        buildClassroomStudentResponse(student as RawClassroomStudentRecord),
    );
}
