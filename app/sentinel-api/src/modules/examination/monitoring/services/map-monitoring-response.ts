import {
    TELEMETRY_INCIDENT_LABELS,
    type ExamAttemptLifecycleEvent,
    type ExamAttemptLifecycleState,
    type ExamAttemptScoreState,
    type TelemetryIncidentRecord,
    type TelemetryIncidentType,
} from '@sentinel/shared';
import type {
    MonitoringExam,
    MonitoringIncident,
    MonitoringOverview,
    MonitoringStudentDetail,
    MonitoringStudentSummary,
    MonitoringStudentStatus,
} from '../monitoring.dto';

const DISCONNECTED_WINDOW_MS = 5 * 60 * 1000;

export type MonitoringStudentRow = {
    student_user_id: string | null;
    student_record_id: string;
    student_number: string;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
    last_seen_at: Date | string | null;
    attempt_id: string;
    attempt_status: string | null;
    lifecycle_state: ExamAttemptLifecycleState | null;
    score_state: ExamAttemptScoreState | null;
    started_at: Date | string | null;
    completed_at: Date | string | null;
    time_spent_minutes: number | null;
    reconnect_attempt_count?: number | null;
    answered_question_count?: number | null;
    score: number | null;
    total_score: number | null;
    incident_count: number | string | null;
    open_incident_count: number | string | null;
    has_high_severity: boolean | null;
    latest_incident_type: TelemetryIncidentType | null;
    latest_incident_at: Date | string | null;
    closed_reason: string | null;
    reopened_until: Date | string | null;
    finalized_at: Date | string | null;
};

export type MonitoringLifecycleEventRow = {
    event_id: string;
    attempt_id: string;
    exam_id: string;
    student_id: string;
    event_type: ExamAttemptLifecycleEvent['eventType'];
    previous_state: ExamAttemptLifecycleState | null;
    next_state: ExamAttemptLifecycleState | null;
    actor_user_id: string | null;
    reason_code: string | null;
    notes: string | null;
    related_incident_ids: unknown | null;
    related_override_id: string | null;
    metadata: unknown | null;
    created_at: Date | string | null;
};

export type MonitoringIncidentEvidenceSummaryRow = {
    incident_id: string | null;
    state: NonNullable<MonitoringIncident['evidenceStates']>[number];
    count: number | string | null;
};

function toIsoDate(value: Date | string | null | undefined) {
    if (!value) {
        return null;
    }

    const date = value instanceof Date ? value : new Date(value);

    return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toDate(value: Date | string | null | undefined) {
    if (!value) {
        return null;
    }

    const date = value instanceof Date ? value : new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
}

function getLatestActivityAt(row: MonitoringStudentRow) {
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

function resolveMonitoringStatus(args: {
    attemptStatus: string | null;
    lastActivityAt: Date | null;
    openIncidentCount: number;
    hasHighSeverity: boolean;
}): MonitoringStudentStatus {
    const attemptStatus = args.attemptStatus?.toUpperCase();
    const isFlagged = args.openIncidentCount > 0 || args.hasHighSeverity;

    if (isFlagged) {
        return 'flagged';
    }

    if (attemptStatus === 'COMPLETED') {
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

function resolveProgress(row: MonitoringStudentRow, durationMinutes: number, questionCount = 0) {
    // Only a fully submitted attempt earns 100%.  Closed-unsubmitted attempts
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

function getRelativeTimeLabel(value: Date | null) {
    if (!value) {
        return 'No recent activity';
    }

    const diffMs = Date.now() - value.getTime();
    const diffMinutes = Math.max(0, Math.round(diffMs / 60000));

    if (diffMinutes <= 0) {
        return 'Just now';
    }

    if (diffMinutes === 1) {
        return '1 min ago';
    }

    if (diffMinutes < 60) {
        return `${diffMinutes} min ago`;
    }

    const diffHours = Math.round(diffMinutes / 60);

    if (diffHours === 1) {
        return '1 hour ago';
    }

    if (diffHours < 24) {
        return `${diffHours} hours ago`;
    }

    const diffDays = Math.round(diffHours / 24);
    return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
}

function normalizeIncidentSeverity(
    severity: string | null | undefined,
): MonitoringIncident['severity'] {
    switch (severity?.toUpperCase()) {
        case 'HIGH':
            return 'high';
        case 'LOW':
            return 'low';
        default:
            return 'medium';
    }
}

function resolveStudentNames(row: MonitoringStudentRow) {
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

export function mapMonitoringLifecycleEvent(
    event: MonitoringLifecycleEventRow,
): ExamAttemptLifecycleEvent {
    return {
        eventId: event.event_id,
        attemptId: event.attempt_id,
        examId: event.exam_id,
        studentId: event.student_id,
        eventType: event.event_type,
        previousState: event.previous_state,
        nextState: event.next_state,
        actorUserId: event.actor_user_id,
        reasonCode: event.reason_code,
        notes: event.notes,
        relatedIncidentIds: Array.isArray(event.related_incident_ids)
            ? (event.related_incident_ids as string[])
            : null,
        relatedOverrideId: event.related_override_id,
        metadata:
            event.metadata && typeof event.metadata === 'object'
                ? (event.metadata as Record<string, unknown>)
                : null,
        createdAt: toIsoDate(event.created_at),
    };
}

export function mapMonitoringIncident(incident: TelemetryIncidentRecord): MonitoringIncident {
    return mapMonitoringIncidentWithEvidenceSummary(incident, []);
}

export function mapMonitoringIncidentWithEvidenceSummary(
    incident: TelemetryIncidentRecord,
    evidenceSummary: MonitoringIncidentEvidenceSummaryRow[] = [],
): MonitoringIncident {
    const details = incident.details as any;
    const rawEventType = details?.lastEvent?.eventType ?? details?.eventType ?? null;
    const lastEventMetadata = details?.lastEvent?.metadata;
    const incidentMetadata = details?.metadata;
    const metadata = lastEventMetadata ?? incidentMetadata ?? null;
    const evidenceCount = evidenceSummary.reduce(
        (total, item) => total + Number(item.count ?? 0),
        0,
    );

    return {
        id: incident.incidentId,
        type: incident.incidentType,
        rawEventType,
        timestamp: toIsoDate(incident.timestamp) ?? new Date().toISOString(),
        description: metadata?.description || TELEMETRY_INCIDENT_LABELS[incident.incidentType],
        severity: normalizeIncidentSeverity(incident.severity),
        snapshotUrl: incident.evidenceUrl ?? null,
        evidenceUrl: incident.evidenceUrl ?? null,
        evidenceCount,
        evidenceStates: evidenceSummary.map((item) => item.state),
        status: incident.status ?? null,
        occurrenceCount: details?.occurrenceCount ?? 1,
        severityReason: details?.severityReason ?? null,
        persistenceTrigger: metadata?.aggregation?.trigger ?? null,
        matchingWindowSeconds: details?.severityInputs?.matchingWindowSeconds ?? null,
        wasSeverityForced: Boolean(details?.severityInputs?.overrideSeverity),
        anomalyType: metadata?.anomalyType ?? null,
        confidenceScore: metadata?.confidenceScore ?? null,
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

    for (const row of evidenceSummaryRows) {
        if (!row.incident_id) {
            continue;
        }

        const items = evidenceSummaryByIncident.get(row.incident_id) ?? [];
        items.push(row);
        evidenceSummaryByIncident.set(row.incident_id, items);
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

export function buildMonitoringOverview(args: {
    exam: MonitoringExam;
    lobbyAdmissions: MonitoringOverview['lobbyAdmissions'];
    students: MonitoringStudentSummary[];
}): MonitoringOverview {
    const stats = args.students.reduce(
        (summary, student) => {
            summary.total += 1;
            summary[student.status] += 1;
            return summary;
        },
        {
            total: 0,
            active: 0,
            flagged: 0,
            submitted: 0,
            disconnected: 0,
        },
    );

    return {
        exam: args.exam,
        stats,
        lobbyAdmissions: args.lobbyAdmissions,
        students: args.students.sort((left, right) => {
            const lastNameCompare = left.lastName.localeCompare(right.lastName);

            if (lastNameCompare !== 0) {
                return lastNameCompare;
            }

            return left.firstName.localeCompare(right.firstName);
        }),
    };
}

export function mapMonitoringExam(args: {
    examId: string;
    title: string;
    subject: string;
    scheduledDate: string | null;
    endDateTime: string | null;
    maxReconnectAttempts: number;
    runtimeAccess?: MonitoringExam['runtimeAccess'];
    remediationContext?: MonitoringExam['remediationContext'];
}): MonitoringExam {
    return {
        id: args.examId,
        title: args.title,
        subject: args.subject,
        scheduledDate: args.scheduledDate,
        endDateTime: args.endDateTime,
        maxReconnectAttempts: args.maxReconnectAttempts,
        runtimeAccess: args.runtimeAccess,
        remediationContext: args.remediationContext ?? null,
    };
}

export function formatMonitoringLastActivity(value: string | null | undefined) {
    return getRelativeTimeLabel(toDate(value));
}
