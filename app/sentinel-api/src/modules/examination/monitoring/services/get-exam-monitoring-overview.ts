import { type DbClient } from '@sentinel/db';
import { sql } from 'kysely';
import type { AssessmentAllowedRole } from '../../assessment/assessment-access';
import type { MonitoringOverview } from '../monitoring.dto';
import { getMonitoringExamContext } from './get-monitoring-exam-context';
import {
    buildMonitoringOverview,
    mapMonitoringExam,
    mapMonitoringStudentSummary,
    type MonitoringStudentRow,
} from './map-monitoring-response';

import { applyMonitoringAttemptOrdering } from './attempt-selection.helper';

type GetExamMonitoringOverviewArgs = {
    dbClient: DbClient;
    examId: string;
    institutionId?: string;
    viewerRole: AssessmentAllowedRole;
    userId?: string | null;
};

export async function getExamMonitoringOverview({
    dbClient,
    examId,
    institutionId,
    viewerRole,
    userId,
}: GetExamMonitoringOverviewArgs): Promise<MonitoringOverview> {
    const exam = await getMonitoringExamContext({
        dbClient,
        examId,
        institutionId,
        viewerRole,
        userId,
    });

    const latestAttemptsQuery = dbClient
        .selectFrom('exam_attempts as ea')
        .distinctOn('ea.student_id')
        .select([
            'ea.attempt_id',
            'ea.student_id',
            sql<string | null>`ea.status::text`.as('attempt_status'),
            sql<string | null>`ea.lifecycle_state::text`.as('lifecycle_state'),
            sql<string | null>`ea.score_state::text`.as('score_state'),
            'ea.started_at',
            'ea.completed_at',
            'ea.time_spent_minutes',
            'ea.reconnect_attempt_count',
            'ea.answered_question_count',
            'ea.score',
            'ea.total_score',
            'ea.closed_reason',
            'ea.reopened_until',
            'ea.finalized_at',
            'ea.created_at',
        ])
        .where('ea.exam_id', '=', examId)
        .where('ea.student_id', 'is not', null);

    const latestAttempts =
        applyMonitoringAttemptOrdering(latestAttemptsQuery).as('latest_attempts');

    const incidentSummary = dbClient
        .selectFrom('flagged_incidents as fi')
        .innerJoin(
            'exam_attempts as incident_attempts',
            'incident_attempts.attempt_id',
            'fi.attempt_id',
        )
        .select([
            'fi.attempt_id',
            sql<number>`count(*)::int`.as('incident_count'),
            sql<number>`count(*) filter (
                where coalesce(fi.status, 'PENDING') = 'PENDING'
            )::int`.as('open_incident_count'),
            sql<boolean>`bool_or(coalesce(fi.severity::text, 'MEDIUM') = 'HIGH')`.as(
                'has_high_severity',
            ),
            sql<Date | null>`max(fi.timestamp)`.as('latest_incident_at'),
            sql<string | null>`(
                array_agg(fi.incident_type::text order by fi.timestamp desc nulls last)
            )[1]`.as('latest_incident_type'),
        ])
        .where('incident_attempts.exam_id', '=', examId)
        .groupBy('fi.attempt_id')
        .as('incident_summary');

    const rows = (await dbClient
        .selectFrom(latestAttempts)
        .innerJoin('students as st', 'st.student_id', 'latest_attempts.student_id')
        .leftJoin('user_profiles as up', 'up.user_id', 'st.user_id')
        .leftJoin(incidentSummary, 'incident_summary.attempt_id', 'latest_attempts.attempt_id')
        .select([
            'st.user_id as student_user_id',
            'st.student_id as student_record_id',
            'st.student_number',
            'up.first_name',
            'up.last_name',
            'up.avatar_url',
            'up.last_seen_at',
            'latest_attempts.attempt_id',
            'latest_attempts.attempt_status',
            'latest_attempts.lifecycle_state',
            'latest_attempts.score_state',
            'latest_attempts.started_at',
            'latest_attempts.completed_at',
            'latest_attempts.time_spent_minutes',
            'latest_attempts.reconnect_attempt_count',
            'latest_attempts.answered_question_count',
            'latest_attempts.score',
            'latest_attempts.total_score',
            'latest_attempts.closed_reason',
            'latest_attempts.reopened_until',
            'latest_attempts.finalized_at',
            sql<number>`coalesce(incident_summary.incident_count, 0)`.as('incident_count'),
            sql<number>`coalesce(incident_summary.open_incident_count, 0)`.as(
                'open_incident_count',
            ),
            sql<boolean>`coalesce(incident_summary.has_high_severity, false)`.as(
                'has_high_severity',
            ),
            'incident_summary.latest_incident_type',
            'incident_summary.latest_incident_at',
        ])
        .orderBy('up.last_name')
        .orderBy('up.first_name')
        .execute()) as MonitoringStudentRow[];

    const lobbyAdmissions = await dbClient
        .selectFrom('exam_lobby_admissions as ela')
        .leftJoin('exam_attempts as ea', (join) =>
            join
                .onRef('ea.exam_id', '=', 'ela.exam_id')
                .onRef('ea.student_id', '=', 'ela.student_id')
                .on('ea.status', '=', 'IN_PROGRESS'),
        )
        .select([
            sql<number>`count(*) filter (
                where ela.status = 'WAITING'
            )::int`.as('waiting'),
            sql<number>`count(*) filter (
                where ela.status = 'APPROVED' and ea.attempt_id is null
            )::int`.as('approved'),
            sql<number>`count(distinct ea.attempt_id) filter (
                where ea.attempt_id is not null and ela.status = 'APPROVED'
            )::int`.as('in_attempt'),
        ])
        .where('ela.exam_id', '=', examId)
        .executeTakeFirst();

    const students = rows.map((row) =>
        mapMonitoringStudentSummary(row, exam.durationMinutes, exam.questionCount),
    );

    return buildMonitoringOverview({
        exam: mapMonitoringExam(exam),
        lobbyAdmissions: {
            waiting: Number(lobbyAdmissions?.waiting ?? 0),
            approved: Number(lobbyAdmissions?.approved ?? 0),
            inAttempt: Number(lobbyAdmissions?.in_attempt ?? 0),
        },
        students,
    });
}
