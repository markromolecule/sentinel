import { type DbClient } from '@sentinel/db';
import { sql } from 'kysely';

type GetInstructorStudentEnrollmentsArgs = {
    dbClient: DbClient;
    requesterUserId: string;
    institutionId?: string;
    search?: string;
};

type InstructorStudentEnrollmentRecord = {
    enrollment_ids: string | null;
    user_id: string | null;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    student_number: string | null;
    status: string | null;
    last_seen_at: Date | string | null;
    avatar_url: string | null;
    department_code: string | null;
    institution_id: string | null;
    institution_name: string | null;
    subject_name: string | null;
    section_name: string | null;
    term_name: string | null;
    year_level: number | null;
};

function formatYearLevel(yearLevel?: number | null) {
    if (!yearLevel) {
        return '—';
    }

    switch (yearLevel) {
        case 1:
            return '1st Year';
        case 2:
            return '2nd Year';
        case 3:
            return '3rd Year';
        default:
            return `${yearLevel}th Year`;
    }
}

function mapInstructorStudentEnrollment(record: InstructorStudentEnrollmentRecord) {
    const nowMs = Date.now();
    const isOnline = record.last_seen_at
        ? nowMs - new Date(record.last_seen_at).getTime() <= 5 * 60 * 1000
        : false;

    return {
        id: record.user_id ?? '',
        user_id: record.user_id,
        userId: record.user_id,
        firstName: record.first_name ?? '',
        lastName: record.last_name ?? '',
        email: record.email ?? '',
        role: 'student' as const,
        avatarUrl: record.avatar_url ?? null,
        department: record.department_code,
        departmentCode: record.department_code,
        institution: record.institution_name ?? record.institution_id ?? null,
        institution_id: record.institution_id ?? null,
        institutionId: record.institution_id ?? null,
        studentNo: record.student_number ?? '',
        subject: record.subject_name ?? '—',
        section: record.section_name ?? '—',
        term: record.term_name ?? '—',
        yearLevel: formatYearLevel(record.year_level),
        enrollmentIds: record.enrollment_ids ?? '',
        status: isOnline ? 'active' : 'offline',
        created_at: null,
        updated_at: null,
        created_by: null,
        updated_by: null,
    };
}

export async function getInstructorStudentEnrollmentsData({
    dbClient,
    requesterUserId,
    institutionId,
    search,
}: GetInstructorStudentEnrollmentsArgs) {
    let query = dbClient
        .selectFrom('enrollments as e')
        .innerJoin('class_groups as cg', 'cg.class_group_id', 'e.class_group_id')
        .innerJoin('class_roles as cr', 'cr.class_group_id', 'cg.class_group_id')
        .innerJoin('roles as role_scope', 'role_scope.role_id', 'cr.role_id')
        .innerJoin('students as s', 's.student_id', 'e.student_id')
        .innerJoin('user_profiles as up', 'up.user_id', 's.user_id')
        .innerJoin('auth.users as u', 'u.id', 'up.user_id')
        .leftJoin('subjects as sub', 'sub.subject_id', 'cg.subject_id')
        .leftJoin('sections as sec', 'sec.section_id', 'cg.section_id')
        .leftJoin('terms as t', 't.term_id', 'cg.term_id')
        .leftJoin('departments as dep', 'dep.department_id', 's.department_id')
        .leftJoin('institutions as i', 'i.id', 'up.institution_id')
        .select([
            sql<string | null>`STRING_AGG(DISTINCT e.enrollment_id::text, ', ')`.as(
                'enrollment_ids',
            ),
            'up.user_id',
            'up.first_name',
            'up.last_name',
            'up.avatar_url',
            'u.email',
            's.student_number',
            'up.status',
            'up.last_seen_at',
            'dep.department_code as department_code',
            'up.institution_id',
            'i.name as institution_name',
            sql<string | null>`STRING_AGG(DISTINCT sub.subject_title, ', ')`.as('subject_name'),
            sql<string | null>`STRING_AGG(DISTINCT sec.section_name, ', ')`.as('section_name'),
            sql<
                string | null
            >`STRING_AGG(DISTINCT CONCAT(t.academic_year, ' - ', t.semester), ', ')`.as(
                'term_name',
            ),
            sql<number | null>`MAX(sec.year_level)`.as('year_level'),
        ])
        .where('cr.user_id', '=', requesterUserId)
        .where('role_scope.role_name', '=', 'instructor')
        .where('cg.archived_at', 'is', null)
        .groupBy([
            'up.user_id',
            'up.first_name',
            'up.last_name',
            'up.avatar_url',
            'u.email',
            's.student_number',
            'up.status',
            'up.last_seen_at',
            'dep.department_code',
            'up.institution_id',
            'i.name',
        ]);

    if (institutionId) {
        query = query.where('up.institution_id', '=', institutionId);
    }

    if (search) {
        query = query.where((eb) =>
            eb.or([
                eb('up.first_name', 'ilike', `%${search}%`),
                eb('up.last_name', 'ilike', `%${search}%`),
                eb('u.email', 'ilike', `%${search}%`),
                eb('s.student_number', 'ilike', `%${search}%`),
                eb('sub.subject_title', 'ilike', `%${search}%`),
                eb('sec.section_name', 'ilike', `%${search}%`),
            ]),
        );
    }

    const records = (await query
        .orderBy('up.last_name', 'asc')
        .orderBy('up.first_name', 'asc')
        .execute()) as InstructorStudentEnrollmentRecord[];

    return records.map(mapInstructorStudentEnrollment);
}
