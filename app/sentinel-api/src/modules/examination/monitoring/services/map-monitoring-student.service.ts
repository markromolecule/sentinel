import type { TelemetryIncidentRecord } from '@sentinel/shared';
import type {
    MonitoringStudentDetail,
    MonitoringStudentStatus,
    MonitoringStudentSummary,
} from '../monitoring.dto';
import type {
    MonitoringIncidentEvidenceSummaryRow,
    MonitoringLifecycleEventRow,
    MonitoringStudentRow,
} from '../data/monitoring-data.types';
import { DISCONNECTED_WINDOW_MS, toDate, toIsoDate } from './monitoring-time.service';
import { mapMonitoringIncidentWithEvidenceSummary } from './map-monitoring-incident.service';
import { mapMonitoringLifecycleEvent } from './map-monitoring-lifecycle.service';

export function getLatestActivityAt(row: MonitoringStudentRow): Date | null {
    const candidates = [
        toDate(row.last_seen_at),
        toDate(row.latest_incident_at),
        toDate(row.completed_at),
        toDate(row.started_at),
    ].filter((value): value is Date => value instanceof Date);

    if (candidates.length === 0) {
        return null;
    }

    return new Date(Math.max(...candidates.map((candidate) => candidate.getTime())));
}

export function resolveMonitoringStatus(args: {
    attemptStatus: string | null;
    lifecycleState?: string | null;
    lastActivityAt: Date | null;
    openIncidentCount: number;
    hasHighSeverity: boolean;
}): MonitoringStudentStatus {
    const attemptStatus = args.attemptStatus?.toUpperCase();
    const lifecycleState = args.lifecycleState?.toUpperCase();
    const isFlagged = args.openIncidentCount > 0 || args.hasHighSeverity;

    if (isFlagged) {
        return 'flagged';
    }

    if (
        attemptStatus === 'COMPLETED' ||
        attemptStatus === 'SUBMITTED' ||
        lifecycleState === 'SUBMITTED'
    ) {
        return 'submitted';
    }

    if (
        attemptStatus === 'IN_PROGRESS' &&
        args.lastActivityAt &&
        Date.now() - args.lastActivityAt.getTime() > DISCONNECTED_WINDOW_MS
    ) {
        return 'disconnected';
    }

    return 'active';
}

export function resolveProgress(
    row: MonitoringStudentRow,
    durationMinutes: number,
    questionCount = 0,
): number {
    // Only a fully submitted attempt earns 100%. Closed-unsubmitted attempts
    // (LOCKED, CLOSED, SUPERSEDED) retain their last-persisted percentage so
    // the monitoring view does not falsely imply complete submission.
    const isSubmitted =
        (row.completed_at || row.attempt_status?.toUpperCase() === 'COMPLETED') &&
        (row.lifecycle_state === 'SUBMITTED' || row.attempt_status?.toUpperCase() === 'COMPLETED');

    if (isSubmitted) {
        return 100;
    }

    if (questionCount > 0 && typeof row.answered_question_count === 'number') {
        const calculatedProgress = Math.round((row.answered_question_count / questionCount) * 100);
        return Math.max(0, Math.min(calculatedProgress, 99));
    }

    const recordedTimeSpentMinutes = Number(row.time_spent_minutes ?? 0);
    const startedAt = toDate(row.started_at);
    const liveElapsedMinutes = startedAt
        ? Math.max(0, Math.ceil((Date.now() - startedAt.getTime()) / 60000))
        : 0;
    const timeSpentMinutes =
        recordedTimeSpentMinutes > 0 ? recordedTimeSpentMinutes : liveElapsedMinutes;

    if (durationMinutes <= 0 || timeSpentMinutes <= 0) {
        return 0;
    }

    const calculatedProgress = Math.round((timeSpentMinutes / durationMinutes) * 100);
    return Math.max(0, Math.min(calculatedProgress, 99));
}

export function resolveStudentNames(row: MonitoringStudentRow): {
    firstName: string;
    lastName: string;
} {
    const firstName = row.first_name?.trim() || 'Unknown';
    const lastName = row.last_name?.trim() || 'Student';

    return {
        firstName,
        lastName,
    };
}

export function mapMonitoringStudentSummary(
    row: MonitoringStudentRow,
    durationMinutes: number,
    questionCount = 0,
): MonitoringStudentSummary {
    const lastActivityAt = getLatestActivityAt(row);
    const incidentCount = Number(row.incident_count ?? 0);
    const openIncidentCount = Number(row.open_incident_count ?? 0);
    const hasHighSeverity = Boolean(row.has_high_severity);
    const status = resolveMonitoringStatus({
        attemptStatus: row.attempt_status,
        lifecycleState: row.lifecycle_state,
        lastActivityAt,
        openIncidentCount,
        hasHighSeverity,
    });
    const { firstName, lastName } = resolveStudentNames(row);

    return {
        id: row.student_user_id ?? row.student_record_id,
        studentRecordId: row.student_record_id,
        attemptId: row.attempt_id,
        studentNo: row.student_number,
        firstName,
        lastName,
        avatarUrl: row.avatar_url ?? null,
        status,
        progress: resolveProgress(row, durationMinutes, questionCount),
        incidentCount,
        openIncidentCount,
        latestIncidentType: row.latest_incident_type ?? null,
        lastActivityAt: toIsoDate(lastActivityAt),
        startedAt: toIsoDate(row.started_at),
        completedAt: toIsoDate(row.completed_at),
        timeSpentMinutes: row.time_spent_minutes ?? null,
        reconnectCount: Number(row.reconnect_attempt_count ?? 0),
        score: row.score ?? null,
        totalScore: row.total_score ?? null,
        lifecycleState: row.lifecycle_state ?? null,
        scoreState: row.score_state ?? null,
        closedReason: row.closed_reason ?? null,
        reopenedUntil: toIsoDate(row.reopened_until),
        finalizedAt: toIsoDate(row.finalized_at),
    };
}

export function mapMonitoringStudentDetail(
    row: MonitoringStudentRow,
    durationMinutes: number,
    questionCount: number,
    incidents: TelemetryIncidentRecord[],
    evidenceSummaryRows: MonitoringIncidentEvidenceSummaryRow[] = [],
    lifecycleEvents: MonitoringLifecycleEventRow[] = [],
): MonitoringStudentDetail {
    const evidenceSummaryByIncident = new Map<string, MonitoringIncidentEvidenceSummaryRow[]>();

    for (const item of evidenceSummaryRows) {
        if (!item.incident_id) {
            continue;
        }

        const items = evidenceSummaryByIncident.get(item.incident_id) ?? [];
        items.push(item);
        evidenceSummaryByIncident.set(item.incident_id, items);
    }

    return {
        ...mapMonitoringStudentSummary(row, durationMinutes, questionCount),
        flags: incidents.map((incident) =>
            mapMonitoringIncidentWithEvidenceSummary(
                incident,
                evidenceSummaryByIncident.get(incident.incidentId) ?? [],
            ),
        ),
        lifecycleEvents: lifecycleEvents.map(mapMonitoringLifecycleEvent),
    };
}
