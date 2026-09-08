import { type DbClient, type question_type } from '@sentinel/db';
import { sql } from 'kysely';
import type { GetExamsQuery } from '../exam.dto';
import {
    buildStudentAttemptSelects,
    withStudentAttemptJoin,
} from '../../history/data/build-student-attempt-selects';
import { buildStaffExamVisibilityPredicates } from '../../assign/services/exam-access.service';
import { getExamColumnSupport } from '../helper/exam-schema-compat';
import type { RawExamRecord } from '../services/map-exam-response.service';
import {
    buildClassroomExamFilter,
    buildPublishedStudentExamPredicate,
    buildStudentExamVisibilityPredicate,
} from './build-student-exam-scope-predicates';

export type GetExamsDataArgs = {
    dbClient: DbClient;
    institutionId?: string;
    filters: GetExamsQuery;
    studentUserId?: string;
    instructorUserId?: string;
    departmentId?: string;
};

/**
 * Fetches exam records for the current caller with role-aware visibility filters.
 */
export async function getExamsData({
    dbClient,
    institutionId,
    filters,
    studentUserId,
    instructorUserId,
    departmentId,
}: GetExamsDataArgs) {
    const columnSupport = await getExamColumnSupport(dbClient);

    const limit = filters.limit ?? 50;
    const page = filters.page ?? 1;
    const offset = (page - 1) * limit;

    let query = dbClient
        .selectFrom('exams as e')
        .leftJoin('class_groups as cg', 'cg.class_group_id', 'e.class_group_id')
        .leftJoin('subjects as s', 's.subject_id', 'e.subject_id')
        .leftJoin('exam_configurations as ec', 'ec.exam_id', 'e.exam_id')
        .leftJoin('user_profiles as up_creator', 'up_creator.user_id', 'e.created_by')
        .leftJoin('user_profiles as up_publisher', 'up_publisher.user_id', 'e.published_by')
        .$if(columnSupport.hasRoomId, (qb) => qb.leftJoin('rooms as r', 'r.room_id', 'e.room_id'));

    query = withStudentAttemptJoin(query, studentUserId);

    query = query.select([
            'e.exam_id',
            'e.title',
            'e.description',
            'e.duration_minutes',
            'e.passing_score',
            'e.status',
            'e.class_group_id',
            'e.subject_id',
            'e.scheduled_date',
            'e.end_date_time',
            'e.published_at',
            'e.question_count',
            'e.created_at',
            'e.updated_at',
            'e.is_public',
            'e.created_by',
            sql<string | null>`trim(concat(up_creator.first_name, ' ', up_creator.last_name))`.as(
                'created_by_name',
            ),
            sql<
                string | null
            >`trim(concat(up_publisher.first_name, ' ', up_publisher.last_name))`.as(
                'published_by_name',
            ),
            'cg.class_name',
            's.subject_title',
            'ec.release_score_mode',
            (eb) =>
                eb
                    .selectFrom('exam_questions as q')
                    .select(sql<number>`count(*)::int`.as('count'))
                    .whereRef('q.exam_id', '=', 'e.exam_id')
                    .where('q.question_type', '=', sql<question_type>`'ESSAY'`)
                    .as('essay_question_count'),
            'e.exam_category',
            columnSupport.hasRoomId ? 'e.room_id' : sql<string | null>`null`.as('room_id'),
            columnSupport.hasRoomId
                ? sql<string | null>`r.room_name`.as('room_name')
                : sql<string | null>`null`.as('room_name'),
            columnSupport.hasSectionId ? 'e.section_id' : sql<string | null>`null`.as('section_id'),
            columnSupport.hasSectionName
                ? 'e.section_name'
                : sql<string | null>`null`.as('section_name'),
            (eb) =>
                eb
                    .selectFrom((qb) =>
                        qb
                            .selectFrom('exam_assigned_sections')
                            .select('section_id')
                            .whereRef('exam_id', '=', 'e.exam_id')
                            .union(
                                qb
                                    .selectFrom('exam_section_assignments')
                                    .select('section_id')
                                    .whereRef('exam_id', '=', 'e.exam_id'),
                            )
                            .as('combined_sections'),
                    )
                    .innerJoin(
                        'sections as s_inner',
                        's_inner.section_id',
                        'combined_sections.section_id',
                    )
                    .select(
                        sql<string[]>`coalesce(json_agg(s_inner.section_name), '[]'::json)`.as(
                            'section_names',
                        ),
                    )
                    .as('assigned_section_names'),
            (eb) =>
                eb
                    .selectFrom((qb) =>
                        qb
                            .selectFrom('exam_assigned_sections')
                            .select('section_id')
                            .whereRef('exam_id', '=', 'e.exam_id')
                            .union(
                                qb
                                    .selectFrom('exam_section_assignments')
                                    .select('section_id')
                                    .whereRef('exam_id', '=', 'e.exam_id'),
                            )
                            .as('combined_sections'),
                    )
                    .select(
                        sql<
                            string[]
                        >`coalesce(json_agg(combined_sections.section_id), '[]'::json)`.as(
                            'section_ids',
                        ),
                    )
                    .as('assigned_section_ids'),
            (eb) =>
                eb
                    .selectFrom('exam_section_assignments as esa_cg')
                    .select(
                        sql<string[]>`coalesce(
                            json_agg(distinct esa_cg.class_group_id)
                                filter (where esa_cg.class_group_id is not null),
                            '[]'::json
                        )`.as('class_group_ids'),
                    )
                    .whereRef('esa_cg.exam_id', '=', 'e.exam_id')
                    .as('assigned_class_group_ids'),
            (eb) =>
                eb
                    .selectFrom('exam_section_assignments as esa_cg_names')
                    .innerJoin(
                        'class_groups as cg_inner',
                        'cg_inner.class_group_id',
                        'esa_cg_names.class_group_id',
                    )
                    .select(
                        sql<string[]>`coalesce(
                            json_agg(distinct cg_inner.class_name)
                                filter (where cg_inner.class_name is not null),
                            '[]'::json
                        )`.as('class_group_names'),
                    )
                    .whereRef('esa_cg_names.exam_id', '=', 'e.exam_id')
                    .as('assigned_class_group_names'),
            (eb) =>
                eb
                    .selectFrom('exam_attempts as ea')
                    .select(sql<number>`count(distinct ea.student_id)::int`.as('count'))
                    .whereRef('ea.exam_id', '=', 'e.exam_id')
                    .as('students_count'),
            (eb) =>
                eb
                    .selectFrom('flagged_incidents as fi')
                    .innerJoin('exam_attempts as ea', 'ea.attempt_id', 'fi.attempt_id')
                    .select(sql<number>`count(*)::int`.as('count'))
                    .whereRef('ea.exam_id', '=', 'e.exam_id')
                    .as('incident_count'),
            // Rooms assigned via exam_section_assignments (supports multiple rooms per exam)
            (eb) =>
                eb
                    .selectFrom('exam_section_assignments as esa_r')
                    .innerJoin('rooms as r_inner', 'r_inner.room_id', 'esa_r.room_id')
                    .select(
                        sql<
                            string[]
                        >`coalesce(json_agg(distinct r_inner.room_name), '[]'::json)`.as(
                            'assigned_room_names',
                        ),
                    )
                    .whereRef('esa_r.exam_id', '=', 'e.exam_id')
                    .as('assigned_room_names'),
            // Instructors assigned via exam_section_assignments (supports multiple instructors per exam)
            (eb) =>
                eb
                    .selectFrom('exam_section_assignments as esa_i')
                    .innerJoin(
                        'user_profiles as up_inner',
                        'up_inner.user_id',
                        'esa_i.instructor_id',
                    )
                    .select(
                        sql<string[]>`coalesce(
                            json_agg(distinct trim(concat(up_inner.first_name, ' ', up_inner.last_name))),
                            '[]'::json
                        )`.as('assigned_instructor_names'),
                    )
                    .whereRef('esa_i.exam_id', '=', 'e.exam_id')
                    .as('assigned_instructor_names'),
            (eb) =>
                eb
                    .selectFrom('exam_section_assignments as esa_i_ids')
                    .select(
                        sql<
                            string[]
                        >`coalesce(json_agg(distinct esa_i_ids.instructor_id), '[]'::json)`.as(
                            'assigned_instructor_ids',
                        ),
                    )
                    .whereRef('esa_i_ids.exam_id', '=', 'e.exam_id')
                    .as('assigned_instructor_ids'),
            sql<string | null>`null`.as('linked_section_name'),
            ...buildStudentAttemptSelects(studentUserId),
        ]);

    if (institutionId) {
        query = query.where('e.institution_id', '=', institutionId);
    }

    if (filters.subjectId) {
        query = query.where('e.subject_id', '=', filters.subjectId);
    }

    if (filters.classroomId) {
        query = query.where(
            buildClassroomExamFilter({
                classroomId: filters.classroomId,
                hasSectionId: columnSupport.hasSectionId,
            }),
        );
    }

    if (filters.status) {
        query = query.where(sql<boolean>`lower(e.status::text) = ${filters.status}`);
    }

    if (filters.search) {
        query = query.where((eb) =>
            eb.or([
                eb('e.title', 'ilike', `%${filters.search}%`),
                eb('e.description', 'ilike', `%${filters.search}%`),
                eb('cg.class_name', 'ilike', `%${filters.search}%`),
                eb('s.subject_title', 'ilike', `%${filters.search}%`),
            ]),
        );
    }

    if (studentUserId) {
        query = query.where((eb) =>
            eb.and([
                buildPublishedStudentExamPredicate({ examAlias: 'e' }),
                buildStudentExamVisibilityPredicate({
                    studentUserId,
                    hasSectionId: columnSupport.hasSectionId,
                }),
            ]),
        );
    }

    if (instructorUserId) {
        if (!institutionId) {
            throw new Error('Institution context required for instructor exam visibility');
        }

        const visibilityPredicates = await buildStaffExamVisibilityPredicates({
            dbClient,
            userId: instructorUserId,
            institutionId,
            includePublicInstitutionExams: true,
        });

        query = query.where(sql<boolean>`(${sql.join(visibilityPredicates, sql` or `)})`);
    }

    if (departmentId) {
        query = query.where((eb) =>
            eb.or([
                eb.exists(
                    eb
                        .selectFrom('sections as sec')
                        .select('sec.section_id')
                        .whereRef('sec.section_id', '=', 'e.section_id')
                        .where('sec.department_id', '=', departmentId),
                ),
                eb.exists(
                    eb
                        .selectFrom('sections as sec_cg')
                        .select('sec_cg.section_id')
                        .whereRef('sec_cg.section_id', '=', 'cg.section_id')
                        .where('sec_cg.department_id', '=', departmentId),
                ),
                eb.exists(
                    eb
                        .selectFrom('subject_departments as sd')
                        .select('sd.subject_id')
                        .whereRef('sd.subject_id', '=', 'e.subject_id')
                        .where('sd.department_id', '=', departmentId),
                ),
            ]),
        );
    }

    return (await query
        .orderBy('e.updated_at', 'desc')
        .limit(limit)
        .offset(offset)
        .execute()) as RawExamRecord[];
}
