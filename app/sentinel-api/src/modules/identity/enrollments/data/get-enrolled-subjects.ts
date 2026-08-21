import { type DbClient } from '@sentinel/db';
import { sql } from 'kysely';
import { type PaginatedResult } from '../../../../lib/pagination';

export type GetEnrolledSubjectsDataArgs = {
    dbClient: DbClient;
    userId: string;
    search?: string;
    page?: number;
    pageSize?: number;
    limit?: number;
};

export type EnrolledSubjectRecord = {
    subject_offering_id: string;
    subject_id: string;
    code: string;
    title: string;
    term_id: string;
    term_academic_year: string;
    term_semester: string;
    department_ids: string[];
    department_codes: string[];
    department_code: string | null;
    course_ids: string[];
    course_codes: string[];
    course_code: string | null;
    year_levels: number[];
    sections: any;
    requested_at: string;
    approved_at: string;
    approved_by_name: string | null;
};

export const getEnrolledSubjectsData = async ({
    dbClient,
    userId,
    search,
    page,
    pageSize,
    limit,
}: GetEnrolledSubjectsDataArgs): Promise<
    EnrolledSubjectRecord[] | PaginatedResult<EnrolledSubjectRecord>
> => {
    const isPaginated = page !== undefined || pageSize !== undefined || limit !== undefined;
    const resolvedPage = page ?? 1;
    const resolvedPageSize = limit ?? pageSize ?? 20;
    const offset = (resolvedPage - 1) * resolvedPageSize;

    let query = dbClient
        .selectFrom('class_roles')
        .innerJoin('class_groups', 'class_groups.class_group_id', 'class_roles.class_group_id')
        .innerJoin(
            'subject_offerings',
            'subject_offerings.subject_offering_id',
            'class_groups.subject_offering_id',
        )
        .innerJoin('subjects', 'subjects.subject_id', 'subject_offerings.subject_id')
        .innerJoin('terms', 'terms.term_id', 'subject_offerings.term_id')
        .leftJoin('sections', 'sections.section_id', 'class_groups.section_id')
        .leftJoin(
            'departments as section_department_records',
            'section_department_records.department_id',
            'sections.department_id',
        )
        .leftJoin(
            'courses as section_course_records',
            'section_course_records.course_id',
            'sections.course_id',
        )
        .leftJoin('enrollment_requests', (join) =>
            join
                .onRef('enrollment_requests.class_group_id', '=', 'class_roles.class_group_id')
                .onRef('enrollment_requests.user_id', '=', 'class_roles.user_id')
                .on('enrollment_requests.status', '=', 'APPROVED'),
        )
        .leftJoin('user_profiles as approver_profiles', (join) =>
            join.onRef('approver_profiles.user_id', '=', 'enrollment_requests.approved_by'),
        )
        .select([
            'subject_offerings.subject_offering_id',
            'subjects.subject_id',
            'subjects.subject_code as code',
            'subjects.subject_title as title',
            'terms.term_id',
            'terms.academic_year as term_academic_year',
            'terms.semester as term_semester',
            sql<
                string[]
            >`COALESCE(array_remove(array_agg(DISTINCT section_department_records.department_id), NULL), ARRAY[]::uuid[])`.as(
                'department_ids',
            ),
            sql<
                string[]
            >`COALESCE(array_remove(array_agg(DISTINCT section_department_records.department_code), NULL), ARRAY[]::text[])`.as(
                'department_codes',
            ),
            sql<string | null>`MIN(section_department_records.department_code)`.as(
                'department_code',
            ),
            sql<
                string[]
            >`COALESCE(array_remove(array_agg(DISTINCT section_course_records.course_id), NULL), ARRAY[]::uuid[])`.as(
                'course_ids',
            ),
            sql<
                string[]
            >`COALESCE(array_remove(array_agg(DISTINCT section_course_records.code), NULL), ARRAY[]::text[])`.as(
                'course_codes',
            ),
            sql<string | null>`MIN(section_course_records.code)`.as('course_code'),
            sql<
                number[]
            >`COALESCE(array_remove(array_agg(DISTINCT sections.year_level), NULL), ARRAY[]::int[])`.as(
                'year_levels',
            ),
            sql<any>`COALESCE(
                jsonb_agg(
                    DISTINCT jsonb_build_object(
                        'id',
                        class_groups.class_group_id,
                        'section_id',
                        sections.section_id,
                        'name',
                        coalesce(sections.section_name, 'Unknown'),
                        'year_level',
                        sections.year_level
                    )
                ) FILTER (WHERE class_groups.class_group_id IS NOT NULL),
                '[]'::jsonb
            )`.as('sections'),
            sql<string>`MAX(enrollment_requests.created_at)`.as('requested_at'),
            sql<string>`MAX(enrollment_requests.updated_at)`.as('approved_at'),
            sql<
                string | null
            >`MAX(NULLIF(TRIM(concat_ws(' ', approver_profiles.first_name, approver_profiles.last_name)), ''))`.as(
                'approved_by_name',
            ),
        ])
        .where('class_roles.user_id', '=', userId)
        .innerJoin('roles', 'roles.role_id', 'class_roles.role_id')
        .where('roles.role_name', '=', 'instructor');

    if (search) {
        query = query.where((eb) =>
            eb.or([
                eb('subjects.subject_code', 'ilike', `%${search}%`),
                eb('subjects.subject_title', 'ilike', `%${search}%`),
                eb('terms.academic_year', 'ilike', `%${search}%`),
                eb('terms.semester', 'ilike', `%${search}%`),
            ]),
        );
    }

    query = query
        .groupBy([
            'subject_offerings.subject_offering_id',
            'subjects.subject_id',
            'subjects.subject_code',
            'subjects.subject_title',
            'terms.term_id',
            'terms.academic_year',
            'terms.semester',
            'terms.start_date',
        ])
        .orderBy('terms.start_date', 'desc')
        .orderBy('subjects.subject_code', 'asc');

    if (!isPaginated) {
        return (await query.execute()) as EnrolledSubjectRecord[];
    }

    let countQuery = dbClient
        .selectFrom('class_roles')
        .innerJoin('class_groups', 'class_groups.class_group_id', 'class_roles.class_group_id')
        .innerJoin(
            'subject_offerings',
            'subject_offerings.subject_offering_id',
            'class_groups.subject_offering_id',
        )
        .innerJoin('subjects', 'subjects.subject_id', 'subject_offerings.subject_id')
        .innerJoin('terms', 'terms.term_id', 'subject_offerings.term_id')
        .innerJoin('roles', 'roles.role_id', 'class_roles.role_id')
        .where('class_roles.user_id', '=', userId)
        .where('roles.role_name', '=', 'instructor')
        .select(sql<number>`count(distinct subject_offerings.subject_offering_id)::int`.as('count'));

    if (search) {
        countQuery = countQuery.where((eb) =>
            eb.or([
                eb('subjects.subject_code', 'ilike', `%${search}%`),
                eb('subjects.subject_title', 'ilike', `%${search}%`),
                eb('terms.academic_year', 'ilike', `%${search}%`),
                eb('terms.semester', 'ilike', `%${search}%`),
            ]),
        );
    }

    const [items, countResult] = await Promise.all([
        query.limit(resolvedPageSize).offset(offset).execute(),
        countQuery.executeTakeFirst(),
    ]);

    const total = countResult?.count ?? 0;
    const totalPages = Math.ceil(total / resolvedPageSize) || 1;

    return {
        items: items as EnrolledSubjectRecord[],
        pagination: {
            page: resolvedPage,
            pageSize: resolvedPageSize,
            total,
            totalPages,
            hasMore: offset + items.length < total,
        },
    };
};
