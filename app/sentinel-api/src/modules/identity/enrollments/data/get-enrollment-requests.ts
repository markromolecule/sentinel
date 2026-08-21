import { type DbClient } from '@sentinel/db';
import { sql } from 'kysely';
import { type PaginatedResult } from '../../../../lib/pagination';

export type GetEnrollmentRequestsDataArgs = {
    dbClient: DbClient;
    status?: 'PENDING' | 'APPROVED' | 'REJECTED';
    userId?: string;
    institutionId?: string;
    departmentId?: string;
    courseId?: string;
    search?: string;
    page?: number;
    pageSize?: number;
    limit?: number;
};

export const getEnrollmentRequestsData = async ({
    dbClient,
    status,
    userId,
    institutionId,
    departmentId,
    courseId,
    search,
    page,
    pageSize,
    limit,
}: GetEnrollmentRequestsDataArgs) => {
    const isPaginated = page !== undefined || pageSize !== undefined || limit !== undefined;
    const resolvedPage = page ?? 1;
    const resolvedPageSize = limit ?? pageSize ?? 20;
    const offset = (resolvedPage - 1) * resolvedPageSize;

    let query = dbClient
        .selectFrom('enrollment_requests')
        .innerJoin(
            'class_groups',
            'class_groups.class_group_id',
            'enrollment_requests.class_group_id',
        )
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
        .innerJoin('auth.users as users', 'users.id', 'enrollment_requests.user_id')
        .leftJoin('user_profiles', 'user_profiles.user_id', 'users.id')
        .leftJoin(
            'user_profiles as approver_profiles',
            'approver_profiles.user_id',
            'enrollment_requests.approved_by',
        )
        .select([
            'enrollment_requests.user_id',
            'enrollment_requests.status',
            sql<string>`MAX(enrollment_requests.created_at)`.as('created_at'),
            'subject_offerings.subject_offering_id',
            'subjects.subject_id',
            'subjects.subject_code',
            'subjects.subject_title',
            'terms.term_id',
            'terms.academic_year as term_academic_year',
            'terms.semester as term_semester',
            sql<
                string[]
            >`COALESCE(array_remove(array_agg(DISTINCT section_department_records.department_id), NULL), ARRAY[]::uuid[])`.as(
                'target_department_ids',
            ),
            sql<
                string[]
            >`COALESCE(array_remove(array_agg(DISTINCT section_department_records.department_name), NULL), ARRAY[]::text[])`.as(
                'target_department_names',
            ),
            sql<
                string[]
            >`COALESCE(array_remove(array_agg(DISTINCT section_department_records.department_code), NULL), ARRAY[]::text[])`.as(
                'target_department_codes',
            ),
            sql<string | null>`MIN(section_department_records.department_name)`.as(
                'department_name',
            ),
            sql<string | null>`MIN(section_department_records.department_code)`.as(
                'department_code',
            ),
            sql<string | null>`MIN(section_department_records.department_id::text)::uuid`.as(
                'department_id',
            ),
            sql<
                string[]
            >`COALESCE(array_remove(array_agg(DISTINCT section_course_records.course_id), NULL), ARRAY[]::uuid[])`.as(
                'target_course_ids',
            ),
            sql<
                string[]
            >`COALESCE(array_remove(array_agg(DISTINCT section_course_records.title), NULL), ARRAY[]::text[])`.as(
                'target_course_titles',
            ),
            sql<
                string[]
            >`COALESCE(array_remove(array_agg(DISTINCT section_course_records.code), NULL), ARRAY[]::text[])`.as(
                'target_course_codes',
            ),
            sql<
                number[]
            >`COALESCE(array_remove(array_agg(DISTINCT sections.year_level), NULL), ARRAY[]::int[])`.as(
                'target_year_levels',
            ),
            sql<string | null>`MIN(section_course_records.title)`.as('course_title'),
            sql<string | null>`MIN(section_course_records.code)`.as('course_code'),
            sql<string | null>`MIN(section_course_records.course_id::text)::uuid`.as('course_id'),
            sql<number>`COUNT(DISTINCT class_groups.class_group_id)::int`.as(
                'resolved_section_count',
            ),
            sql<
                string | null
            >`MAX(CONCAT(user_profiles.first_name, ' ', user_profiles.last_name))`.as(
                'instructor_name',
            ),
            sql<
                string | null
            >`MAX(CONCAT(approver_profiles.first_name, ' ', approver_profiles.last_name))`.as(
                'approved_by_name',
            ),
            sql<any>`COALESCE(
                jsonb_agg(
                    DISTINCT jsonb_build_object(
                        'request_id',
                        enrollment_requests.request_id,
                        'class_group_id',
                        enrollment_requests.class_group_id,
                        'section_id',
                        sections.section_id,
                        'section_name',
                        sections.section_name
                    )
                ) FILTER (WHERE enrollment_requests.request_id IS NOT NULL),
                '[]'::jsonb
            )`.as('sections'),
        ])
        .groupBy([
            'enrollment_requests.user_id',
            'enrollment_requests.status',
            'subject_offerings.subject_offering_id',
            'subjects.subject_id',
            'subjects.subject_code',
            'subjects.subject_title',
            'terms.term_id',
            'terms.academic_year',
            'terms.semester',
        ]);

    let countQuery = dbClient
        .selectFrom('enrollment_requests')
        .innerJoin(
            'class_groups',
            'class_groups.class_group_id',
            'enrollment_requests.class_group_id',
        )
        .innerJoin(
            'subject_offerings',
            'subject_offerings.subject_offering_id',
            'class_groups.subject_offering_id',
        )
        .innerJoin('subjects', 'subjects.subject_id', 'subject_offerings.subject_id')
        .innerJoin('terms', 'terms.term_id', 'subject_offerings.term_id')
        .leftJoin('sections', 'sections.section_id', 'class_groups.section_id')
        .select(
            sql<number>`COUNT(DISTINCT CONCAT_WS(':', enrollment_requests.user_id, enrollment_requests.status, subject_offerings.subject_offering_id))::int`.as(
                'count',
            ),
        );

    if (status) {
        query = query.where('enrollment_requests.status', '=', status);
        countQuery = countQuery.where('enrollment_requests.status', '=', status);
    }

    if (userId) {
        query = query.where('enrollment_requests.user_id', '=', userId);
        countQuery = countQuery.where('enrollment_requests.user_id', '=', userId);
    }

    if (institutionId) {
        const scope = await dbClient
            .selectFrom('institutions')
            .select(['parent_institution_id'])
            .where('id', '=', institutionId)
            .executeTakeFirst();

        const allowedInstIds = [institutionId];
        if (scope?.parent_institution_id) {
            allowedInstIds.push(scope.parent_institution_id);
        }

        query = query.where((eb) =>
            eb.or([
                eb('subject_offerings.institution_id', 'in', allowedInstIds),
                eb('class_groups.institution_id', 'in', allowedInstIds),
            ]),
        );
        countQuery = countQuery.where((eb) =>
            eb.or([
                eb('subject_offerings.institution_id', 'in', allowedInstIds),
                eb('class_groups.institution_id', 'in', allowedInstIds),
            ]),
        );
    }

    if (departmentId) {
        const deptFilter = (eb: any) =>
            eb.or([
                eb('sections.department_id', '=', departmentId),
                eb.exists(
                    eb
                        .selectFrom('subject_offering_departments as sod_scope')
                        .whereRef(
                            'sod_scope.subject_offering_id',
                            '=',
                            'subject_offerings.subject_offering_id',
                        )
                        .where('sod_scope.department_id', '=', departmentId)
                        .select('sod_scope.subject_offering_id'),
                ),
            ]);
        query = query.where(deptFilter);
        countQuery = countQuery.where(deptFilter);
    }

    if (courseId) {
        const courseFilter = (eb: any) =>
            eb.or([
                eb('sections.course_id', '=', courseId),
                eb.exists(
                    eb
                        .selectFrom('subject_offering_courses as soc_scope')
                        .whereRef(
                            'soc_scope.subject_offering_id',
                            '=',
                            'subject_offerings.subject_offering_id',
                        )
                        .where('soc_scope.course_id', '=', courseId)
                        .select('soc_scope.subject_offering_id'),
                ),
            ]);
        query = query.where(courseFilter);
        countQuery = countQuery.where(courseFilter);
    }

    if (search) {
        const searchPattern = `%${search}%`;
        const searchFilter = (eb: any) =>
            eb.or([
                eb('subjects.subject_code', 'ilike', searchPattern),
                eb('subjects.subject_title', 'ilike', searchPattern),
            ]);
        query = query.where(searchFilter);
        countQuery = countQuery.where(searchFilter);
    }

    query = query.orderBy('created_at', 'desc');

    if (!isPaginated) {
        return await query.execute();
    }

    const [items, countResult] = await Promise.all([
        query.limit(resolvedPageSize).offset(offset).execute(),
        countQuery.executeTakeFirst(),
    ]);

    const total = countResult?.count ?? 0;
    const totalPages = Math.ceil(total / resolvedPageSize) || 1;

    return {
        items,
        pagination: {
            page: resolvedPage,
            pageSize: resolvedPageSize,
            total,
            totalPages,
            hasMore: offset + items.length < total,
        },
    };
};
