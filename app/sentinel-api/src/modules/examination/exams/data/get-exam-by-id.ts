import { type DbClient } from '@sentinel/db';
import { sql } from 'kysely';
import {
    buildStudentAttemptSelects,
    withStudentAttemptJoin,
} from '../../history/data/build-student-attempt-selects';
import { getExamColumnSupport } from '../helper/exam-schema-compat';
import type { RawExamRecord } from '../services/map-exam-response.service';
import { buildStaffExamVisibilityPredicates } from '../../assign/services/exam-access.service';
import {
    buildPublishedStudentExamPredicate,
    buildStudentExamVisibilityPredicate,
} from './build-student-exam-scope-predicates';

export type GetExamByIdDataArgs = {
    dbClient: DbClient;
    id: string;
    institutionId?: string;
    studentUserId?: string;
    staffUserId?: string;
    applyStaffVisibility?: boolean;
};

export async function getExamByIdData({
    dbClient,
    id,
    institutionId,
    studentUserId,
    staffUserId,
    applyStaffVisibility,
}: GetExamByIdDataArgs) {
    const columnSupport = await getExamColumnSupport(dbClient);

    let query = dbClient
        .selectFrom('exams as e')
        .leftJoin('class_groups as cg', 'cg.class_group_id', 'e.class_group_id')
        .leftJoin('subjects as s', 's.subject_id', 'e.subject_id')
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
        'e.institution_id',
        'e.created_by',
        'cg.class_name',
        's.subject_title',
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
                .selectFrom((qb) =>
                    qb
                        .selectFrom('exam_section_assignments')
                        .select('instructor_id')
                        .whereRef('exam_id', '=', 'e.exam_id')
                        .where('instructor_id', 'is not', null)
                        .union(
                            qb
                                .selectFrom('proctor_assignments')
                                .select('instructor_id')
                                .whereRef('exam_id', '=', 'e.exam_id')
                                .where('instructor_id', 'is not', null),
                        )
                        .as('combined_instructors'),
                )
                .select(
                    sql<
                        string[]
                    >`coalesce(json_agg(combined_instructors.instructor_id), '[]'::json)`.as(
                        'instructor_ids',
                    ),
                )
                .as('assigned_instructor_ids'),
        sql<string | null>`null`.as('linked_section_name'),
        ...buildStudentAttemptSelects(studentUserId),
    ])
        .where('e.exam_id', '=', id);

    if (institutionId) {
        query = query.where('e.institution_id', '=', institutionId);
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

    if (applyStaffVisibility && staffUserId) {
        const visibilityPredicates = await buildStaffExamVisibilityPredicates({
            dbClient,
            userId: staffUserId,
            institutionId,
            includePublicInstitutionExams: true,
        });

        query = query.where((eb) => eb.or(visibilityPredicates));
    }

    return (await query.executeTakeFirst()) as RawExamRecord | undefined;
}
