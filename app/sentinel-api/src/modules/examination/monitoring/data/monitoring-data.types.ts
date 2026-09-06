import type {
    ExamAttemptLifecycleEvent,
    ExamAttemptLifecycleState,
    ExamAttemptScoreState,
    TelemetryIncidentType,
} from '@sentinel/shared';
import type { MonitoringIncident } from '../monitoring.dto';

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
