import { type DbClient } from '@sentinel/db';
import { sql } from 'kysely';
import { applyMonitoringAttemptOrdering } from './attempt-selection.helper';
import type {
    MonitoringIncidentEvidenceSummaryRow,
    MonitoringLifecycleEventRow,
    MonitoringStudentRow,
} from './monitoring-data.types';

export async function getStudentLatestAttemptRow(
    dbClient: DbClient,
    examId: string,
    studentId: string,
): Promise<MonitoringStudentRow | undefined> {
    const latestAttemptQuery = dbClient
        .selectFrom('exam_attempts as ea')
        .distinctOn('ea.student_id')
        .innerJoin('students as st', 'st.student_id', 'ea.student_id')
        .leftJoin('user_profiles as up', 'up.user_id', 'st.user_id')
        .select([
            'st.user_id as student_user_id',
            'st.student_id as student_record_id',
            'st.student_number',
            'up.first_name',
            'up.last_name',
            'up.last_seen_at',
            'ea.attempt_id',
            sql<string | null>`ea.status::text`.as('attempt_status'),
            sql<string | null>`ea.lifecycle_state::text`.as('lifecycle_state'),
            sql<string | null>`ea.score_state::text`.as('score_state'),
            'ea.started_at',
            'ea.completed_at',
            'ea.time_spent_minutes',
            'ea.answered_question_count',
            'ea.score',
            'ea.total_score',
            'ea.closed_reason',
            'ea.reopened_until',
            'ea.finalized_at',
            sql<number>`coalesce((
                select count(*)::int
                from flagged_incidents as fi
                inner join exam_attempts as incident_attempts
                    on incident_attempts.attempt_id = fi.attempt_id
                where fi.attempt_id = ea.attempt_id
                  and incident_attempts.exam_id = ea.exam_id
            ), 0)`.as('incident_count'),
            sql<number>`coalesce((
                select count(*)::int
                from flagged_incidents as fi
                inner join exam_attempts as incident_attempts
                    on incident_attempts.attempt_id = fi.attempt_id
                where fi.attempt_id = ea.attempt_id
                  and incident_attempts.exam_id = ea.exam_id
                  and coalesce(fi.status, 'PENDING') = 'PENDING'
            ), 0)`.as('open_incident_count'),
            sql<boolean>`coalesce((
                select bool_or(coalesce(fi.severity::text, 'MEDIUM') = 'HIGH')
                from flagged_incidents as fi
                inner join exam_attempts as incident_attempts
                    on incident_attempts.attempt_id = fi.attempt_id
                where fi.attempt_id = ea.attempt_id
                  and incident_attempts.exam_id = ea.exam_id
            ), false)`.as('has_high_severity'),
            sql<string | null>`(
                select fi.incident_type::text
                from flagged_incidents as fi
                inner join exam_attempts as incident_attempts
                    on incident_attempts.attempt_id = fi.attempt_id
                where fi.attempt_id = ea.attempt_id
                  and incident_attempts.exam_id = ea.exam_id
                order by fi.timestamp desc nulls last
                limit 1
            )`.as('latest_incident_type'),
            sql<Date | null>`(
                select max(fi.timestamp)
                from flagged_incidents as fi
                inner join exam_attempts as incident_attempts
                    on incident_attempts.attempt_id = fi.attempt_id
                where fi.attempt_id = ea.attempt_id
                  and incident_attempts.exam_id = ea.exam_id
            )`.as('latest_incident_at'),
        ])
        .where('ea.exam_id', '=', examId)
        .where(sql<boolean>`(st.user_id = ${studentId} or st.student_id = ${studentId})`);

    return (await applyMonitoringAttemptOrdering(
        latestAttemptQuery,
    ).executeTakeFirst()) as MonitoringStudentRow | undefined;
}

export async function getIncidentEvidenceSummaryRows(
    dbClient: DbClient,
    incidentIds: string[],
): Promise<MonitoringIncidentEvidenceSummaryRow[]> {
    if (incidentIds.length === 0) {
        return [];
    }

    const rows = await dbClient
        .selectFrom('telemetry_incident_evidence')
        .select([
            'incident_id',
            sql<string>`state::text`.as('state'),
            sql<number>`count(*)::int`.as('count'),
        ])
        .where('incident_id', 'in', incidentIds)
        .groupBy(['incident_id', 'state'])
        .execute();

    return rows as MonitoringIncidentEvidenceSummaryRow[];
}

export async function getAttemptLifecycleEvents(
    dbClient: DbClient,
    attemptId: string,
): Promise<MonitoringLifecycleEventRow[]> {
    const rows = await dbClient
        .selectFrom('exam_attempt_lifecycle_events')
        .select([
            'event_id',
            'attempt_id',
            'exam_id',
            'student_id',
            'event_type',
            'previous_state',
            'next_state',
            'actor_user_id',
            'reason_code',
            'notes',
            'related_incident_ids',
            'related_override_id',
            'metadata',
            'created_at',
        ])
        .where('attempt_id', '=', attemptId)
        .orderBy('created_at', 'desc')
        .execute();

    return rows as MonitoringLifecycleEventRow[];
}
