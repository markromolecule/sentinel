import { type DbClient } from '@sentinel/db';
import { HTTPException } from 'hono/http-exception';
import { sql } from 'kysely';
import type { AssessmentAllowedRole } from '../../assessment/assessment-access';
import { TelemetryStorageService } from '../../../telemetry/storage/storage.service';
import type { MonitoringStudentDetail } from '../monitoring.dto';
import { getMonitoringExamContext } from './get-monitoring-exam-context';
import {
    mapMonitoringStudentDetail,
    type MonitoringLifecycleEventRow,
    type MonitoringStudentRow,
    type MonitoringIncidentEvidenceSummaryRow,
} from './map-monitoring-response';

import { applyMonitoringAttemptOrdering } from './attempt-selection.helper';

type GetExamMonitoringStudentDetailArgs = {
    dbClient: DbClient;
    examId: string;
    studentId: string;
    institutionId?: string;
    viewerRole: AssessmentAllowedRole;
    userId?: string | null;
};

export async function getExamMonitoringStudentDetail({
    dbClient,
    examId,
    studentId,
    institutionId,
    viewerRole,
    userId,
}: GetExamMonitoringStudentDetailArgs): Promise<MonitoringStudentDetail> {
    const exam = await getMonitoringExamContext({
        dbClient,
        examId,
        institutionId,
        viewerRole,
        userId,
    });

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

    const latestAttempt = (await applyMonitoringAttemptOrdering(latestAttemptQuery)
        .executeTakeFirst()) as MonitoringStudentRow | undefined;

    if (!latestAttempt) {
        throw new HTTPException(404, {
            message: 'Monitoring student record not found.',
        });
    }

    const incidents = await TelemetryStorageService.getIncidents(
        dbClient,
        {
            attemptId: latestAttempt.attempt_id,
            limit: 200,
        },
        institutionId,
    );

    const incidentIds = incidents.map((incident) => incident.incidentId).filter(Boolean);
    const evidenceSummaryRows =
        incidentIds.length > 0
            ? await dbClient
                  .selectFrom('telemetry_incident_evidence')
                  .select([
                      'incident_id',
                      sql<string>`state::text`.as('state'),
                      sql<number>`count(*)::int`.as('count'),
                  ])
                  .where('incident_id', 'in', incidentIds)
                  .groupBy(['incident_id', 'state'])
                  .execute()
            : [];

    const lifecycleEvents = await dbClient
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
        .where('attempt_id', '=', latestAttempt.attempt_id)
        .orderBy('created_at', 'desc')
        .execute();

    return mapMonitoringStudentDetail(
        latestAttempt,
        exam.durationMinutes,
        exam.questionCount,
        incidents,
        evidenceSummaryRows as MonitoringIncidentEvidenceSummaryRow[],
        lifecycleEvents as MonitoringLifecycleEventRow[],
    );
}
