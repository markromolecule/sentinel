import { type DbClient } from '@sentinel/db';
import { sql } from 'kysely';
import { StudentOverridesService } from '../../../student-overrides/student-overrides.service';
import type { ExamContextForReporting } from './types';
import type {
    ReportIncidentSeverityBreakdownRow,
    ReportIncidentTypeBreakdownRow,
    ReportRemediationRow,
    ReportStudentRow,
} from '../reporting-response.types';
import {
    buildAssignedStudentsQuery,
    buildLatestAttemptsQuery,
    buildAttemptCountsQuery,
    buildIncidentSummaryQuery,
} from './query-builders';

/**
 * Loads and orchestrates all necessary source data for the exam report,
 * including student rows, incident breakdowns, and access overrides.
 *
 * @param args - The database client, exam ID, and reporting context.
 * @returns A promise resolving to the source data sets.
 */
export async function loadExamReportSourceData(args: {
    dbClient: DbClient;
    examId: string;
    exam: ExamContextForReporting;
}) {
    const assignedStudents = buildAssignedStudentsQuery(args.dbClient, args.exam).as(
        'assigned_students',
    );
    const latestAttempts = buildLatestAttemptsQuery(args.dbClient, args.examId).as(
        'latest_attempts',
    );
    const attemptCounts = buildAttemptCountsQuery(args.dbClient, args.examId).as('attempt_counts');
    const incidentSummary = buildIncidentSummaryQuery(args.dbClient).as('incident_summary');

    const [
        studentRows,
        incidentTypeBreakdown,
        incidentSeverityBreakdown,
        accessOverrides,
        remediationRows,
    ] = await Promise.all([
        args.dbClient
            .selectFrom(assignedStudents)
            .leftJoin(
                latestAttempts,
                'latest_attempts.student_id',
                'assigned_students.student_record_id',
            )
            .leftJoin(
                attemptCounts,
                'attempt_counts.student_id',
                'assigned_students.student_record_id',
            )
            .leftJoin(incidentSummary, 'incident_summary.attempt_id', 'latest_attempts.attempt_id')
            .select([
                'assigned_students.student_user_id',
                'assigned_students.student_record_id',
                'assigned_students.student_number',
                'assigned_students.first_name',
                'assigned_students.last_name',
                'assigned_students.section_id',
                'assigned_students.section_name',
                'latest_attempts.attempt_id',
                'latest_attempts.attempt_status',
                'latest_attempts.started_at',
                'latest_attempts.completed_at',
                'latest_attempts.time_spent_minutes',
                'latest_attempts.score',
                'latest_attempts.total_score',
                'latest_attempts.percentage',
                'latest_attempts.lifecycle_state',
                'latest_attempts.score_state',
                'latest_attempts.closed_reason',
                'latest_attempts.reopened_until',
                'latest_attempts.superseded_by_attempt_id',
                'latest_attempts.superseded_at',
                'latest_attempts.superseded_by',
                'latest_attempts.finalized_at',
                'latest_attempts.finalized_by',
                sql<number>`coalesce(attempt_counts.attempt_count, 0)`.as('attempt_count'),
                sql<number>`coalesce(incident_summary.incident_count, 0)`.as('incident_count'),
                sql<number>`coalesce(incident_summary.open_incident_count, 0)`.as(
                    'open_incident_count',
                ),
                sql<number>`coalesce(incident_summary.pending_incident_count, 0)`.as(
                    'pending_incident_count',
                ),
                sql<number>`coalesce(incident_summary.reviewed_incident_count, 0)`.as(
                    'reviewed_incident_count',
                ),
                sql<number>`coalesce(incident_summary.confirmed_incident_count, 0)`.as(
                    'confirmed_incident_count',
                ),
                sql<number>`coalesce(incident_summary.dismissed_incident_count, 0)`.as(
                    'dismissed_incident_count',
                ),
                'incident_summary.highest_incident_type',
                'incident_summary.highest_incident_severity',
                sql<
                    string | null
                >`coalesce(latest_attempts.finalized_at::text, (latest_attempts.answer_snapshot->'_grading'->>'finalizedAt')::text)`.as(
                    'attempt_finalized_at',
                ),
            ])
            .orderBy('assigned_students.last_name')
            .orderBy('assigned_students.first_name')
            .execute() as Promise<ReportStudentRow[]>,
        args.dbClient
            .selectFrom('flagged_incidents as fi')
            .innerJoin('exam_attempts as ea', 'ea.attempt_id', 'fi.attempt_id')
            .select([
                sql<string>`fi.incident_type::text`.as('type'),
                sql<number>`count(*)::int`.as('count'),
            ])
            .where('ea.exam_id', '=', args.examId)
            .groupBy('fi.incident_type')
            .orderBy(sql`count(*)`, 'desc')
            .execute() as Promise<ReportIncidentTypeBreakdownRow[]>,
        args.dbClient
            .selectFrom('flagged_incidents as fi')
            .innerJoin('exam_attempts as ea', 'ea.attempt_id', 'fi.attempt_id')
            .select([
                sql<string>`coalesce(fi.severity::text, 'MEDIUM')`.as('severity'),
                sql<number>`count(*)::int`.as('count'),
            ])
            .where('ea.exam_id', '=', args.examId)
            .groupBy(sql`coalesce(fi.severity::text, 'MEDIUM')`)
            .orderBy(sql`count(*)`, 'desc')
            .execute() as Promise<ReportIncidentSeverityBreakdownRow[]>,
        StudentOverridesService.listExamOverrides(args.dbClient, args.examId),
        args.dbClient
            .selectFrom('exam_remediation_schedules as ers')
            .innerJoin(
                'exams as remediation_exam',
                'remediation_exam.exam_id',
                'ers.remediation_exam_id',
            )
            .select([
                'ers.student_id',
                'ers.remediation_id',
                'ers.remediation_exam_id',
                'ers.remediation_type',
                'ers.scheduled_date',
                'ers.end_date_time',
                'remediation_exam.title as remediation_exam_title',
                sql<string>`coalesce(remediation_exam.status::text, 'PUBLISHED')`.as(
                    'remediation_exam_status',
                ),
            ])
            .where('ers.source_exam_id', '=', args.examId)
            .orderBy('ers.created_at', 'desc')
            .execute() as Promise<ReportRemediationRow[]>,
    ]);

    const remediationRowsByStudentId = remediationRows.reduce((accumulator, row) => {
        const existingRows = accumulator.get(row.student_id) ?? [];
        existingRows.push(row);
        accumulator.set(row.student_id, existingRows);
        return accumulator;
    }, new Map<string, ReportRemediationRow[]>());

    return {
        studentRows,
        incidentTypeBreakdown,
        incidentSeverityBreakdown,
        accessOverrides,
        remediationRowsByStudentId,
    };
}
