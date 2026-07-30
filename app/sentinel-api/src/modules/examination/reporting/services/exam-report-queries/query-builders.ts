import { type DbClient } from '@sentinel/db';
import { sql } from 'kysely';
import type { ExamContextForReporting } from './types';

/**
 * Builds a query to fetch all students assigned to an exam based on class groups and sections.
 *
 * @param dbClient - The Kysely database client instance.
 * @param exam - The exam context containing assignment rules (subjectId, classGroupId, etc).
 * @returns A select query builder for assigned students.
 */
export function buildAssignedStudentsQuery(dbClient: DbClient, exam: ExamContextForReporting) {
    const classGroupId = exam.classGroupId;
    const sectionId = exam.sectionId;
    const assignedSectionIds = exam.assignedSectionIds;

    let assignedStudents = dbClient
        .selectFrom('students as st')
        .innerJoin('enrollments as enr', 'enr.student_id', 'st.student_id')
        .innerJoin('class_groups as cg', 'cg.class_group_id', 'enr.class_group_id')
        .leftJoin('subject_offerings as so', 'so.subject_offering_id', 'cg.subject_offering_id')
        .leftJoin('sections as sec', 'sec.section_id', 'cg.section_id')
        .leftJoin('user_profiles as up', 'up.user_id', 'st.user_id')
        .distinctOn('st.student_id')
        .select([
            'st.user_id as student_user_id',
            'st.student_id as student_record_id',
            'st.student_number',
            'up.first_name',
            'up.last_name',
            'cg.section_id',
            'sec.section_name',
        ]);

    if (classGroupId && assignedSectionIds.length === 0) {
        assignedStudents = assignedStudents.where('enr.class_group_id', '=', classGroupId);
        return assignedStudents;
    }

    assignedStudents = assignedStudents.where(
        sql<boolean>`coalesce(cg.subject_id, so.subject_id) = ${exam.subjectId}`,
    );

    if (classGroupId && assignedSectionIds.length > 0) {
        assignedStudents = assignedStudents.where((eb) =>
            eb.or([
                eb('enr.class_group_id', '=', classGroupId),
                eb('cg.section_id', 'in', assignedSectionIds),
            ]),
        );
    } else if (sectionId) {
        assignedStudents = assignedStudents.where('cg.section_id', '=', sectionId);
    } else if (assignedSectionIds.length > 0) {
        assignedStudents = assignedStudents.where('cg.section_id', 'in', assignedSectionIds);
    }

    return assignedStudents;
}

/**
 * Builds a query to fetch the latest attempt for each student on a given exam.
 *
 * @param dbClient - The Kysely database client instance.
 * @param examId - The UUID of the exam.
 * @returns A select query builder for the latest exam attempts.
 */
export function buildLatestAttemptsQuery(dbClient: DbClient, examId: string) {
    return dbClient
        .selectFrom('exam_attempts as ea')
        .distinctOn('ea.student_id')
        .select([
            'ea.attempt_id',
            'ea.student_id',
            sql<string | null>`ea.status::text`.as('attempt_status'),
            'ea.started_at',
            'ea.completed_at',
            'ea.time_spent_minutes',
            sql<number | null>`coalesce(
                (ea.score_snapshot->>'score')::numeric,
                ea.score::numeric,
                ea.initial_score::numeric
            )`.as('score'),
            sql<number | null>`coalesce(
                (ea.score_snapshot->>'totalScore')::numeric,
                ea.total_score::numeric
            )`.as('total_score'),
            sql<number | null>`coalesce(
                (ea.score_snapshot->>'percentage')::numeric,
                case
                    when ea.total_score is not null and ea.total_score > 0
                    then (
                        coalesce(ea.score::numeric, ea.initial_score::numeric, 0::numeric)
                        / nullif(ea.total_score::numeric, 0::numeric)
                    ) * 100
                    else null
                end
            )`.as('percentage'),
            'ea.created_at',
            'ea.answer_snapshot',
            sql<string | null>`ea.lifecycle_state::text`.as('lifecycle_state'),
            sql<string | null>`ea.score_state::text`.as('score_state'),
            'ea.closed_reason',
            'ea.reopened_until',
            'ea.finalized_at',
            'ea.finalized_by',
            'ea.superseded_by_attempt_id',
            'ea.superseded_at',
            'ea.superseded_by',
        ])
        .where('ea.exam_id', '=', examId)
        .where('ea.student_id', 'is not', null)
        .orderBy('ea.student_id')
        .orderBy('ea.created_at', 'desc');
}

/**
 * Builds a query to fetch the total number of attempts per student for a given exam.
 *
 * @param dbClient - The Kysely database client instance.
 * @param examId - The UUID of the exam.
 * @returns A select query builder aggregating attempt counts.
 */
export function buildAttemptCountsQuery(dbClient: DbClient, examId: string) {
    return dbClient
        .selectFrom('exam_attempts as ea')
        .select(['ea.student_id', sql<number>`count(*)::int`.as('attempt_count')])
        .where('ea.exam_id', '=', examId)
        .where('ea.student_id', 'is not', null)
        .groupBy('ea.student_id');
}

/**
 * Builds a query summarizing the flagged incidents for exam attempts.
 *
 * @param dbClient - The Kysely database client instance.
 * @returns A select query builder summarizing incidents grouped by attempt.
 */
export function buildIncidentSummaryQuery(dbClient: DbClient) {
    return dbClient
        .selectFrom('flagged_incidents as fi')
        .select([
            'fi.attempt_id',
            sql<number>`count(*)::int`.as('incident_count'),
            sql<number>`count(*) filter (
                where coalesce(fi.status, 'PENDING') = 'PENDING'
            )::int`.as('open_incident_count'),
            sql<number>`count(*) filter (
                where coalesce(fi.status, 'PENDING') = 'PENDING'
            )::int`.as('pending_incident_count'),
            sql<number>`count(*) filter (
                where fi.status = 'REVIEWED'
            )::int`.as('reviewed_incident_count'),
            sql<number>`count(*) filter (
                where fi.status = 'CONFIRMED'
            )::int`.as('confirmed_incident_count'),
            sql<number>`count(*) filter (
                where fi.status = 'DISMISSED'
            )::int`.as('dismissed_incident_count'),
            sql<string | null>`(
                array_agg(
                    fi.incident_type::text
                    order by
                        case coalesce(fi.severity::text, 'MEDIUM')
                            when 'HIGH' then 3
                            when 'MEDIUM' then 2
                            else 1
                        end desc,
                        fi.timestamp desc nulls last
                )
            )[1]`.as('highest_incident_type'),
            sql<string | null>`(
                array_agg(
                    coalesce(fi.severity::text, 'MEDIUM')
                    order by
                        case coalesce(fi.severity::text, 'MEDIUM')
                            when 'HIGH' then 3
                            when 'MEDIUM' then 2
                            else 1
                        end desc,
                        fi.timestamp desc nulls last
                )
            )[1]`.as('highest_incident_severity'),
        ])
        .groupBy('fi.attempt_id');
}
