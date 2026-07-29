import type { ExamReport, ExamReportStudentSummary } from '../reporting.dto';
import type { TelemetryIncidentType } from '@sentinel/shared';

export type ReportRemediationRow = {
    student_id: string;
    remediation_id: string;
    remediation_exam_id: string;
    remediation_type: 'RETAKE' | 'MAKEUP';
    scheduled_date: Date | string | null;
    end_date_time: Date | string | null;
    remediation_exam_title: string;
    remediation_exam_status: string | null;
};

export type ReportStudentRow = {
    student_user_id: string | null;
    student_record_id: string;
    student_number: string;
    first_name: string | null;
    last_name: string | null;
    section_id?: string | null;
    section_name?: string | null;
    attempt_id: string | null;
    attempt_status: string | null;
    started_at: Date | string | null;
    completed_at: Date | string | null;
    time_spent_minutes: number | null;
    score: number | null;
    total_score: number | null;
    percentage?: number | null;
    attempt_count: number | string | null;
    incident_count: number | string | null;
    open_incident_count: number | string | null;
    pending_incident_count: number | string | null;
    reviewed_incident_count: number | string | null;
    confirmed_incident_count: number | string | null;
    dismissed_incident_count: number | string | null;
    highest_incident_type: TelemetryIncidentType | null;
    highest_incident_severity: string | null;
    attempt_kind?: 'primary' | 'makeup' | 'retake' | null;
    active_override_type?: 'MAKEUP' | 'RETAKE' | 'REOPEN' | null;
    attempt_finalized_at?: Date | string | null;
    lifecycle_state?: string | null;
    score_state?: string | null;
    closed_reason?: string | null;
    reopened_until?: Date | string | null;
    superseded_by_attempt_id?: string | null;
    superseded_at?: Date | string | null;
    superseded_by?: string | null;
    finalized_at?: Date | string | null;
    finalized_by?: string | null;
};

export type ReportIncidentTypeBreakdownRow = {
    type: TelemetryIncidentType;
    count: number | string;
};

export type ReportIncidentSeverityBreakdownRow = {
    severity: string;
    count: number | string;
};

export type ExamReportCore = Omit<ExamReport, 'sections' | 'studentsPagination'>;

const SUBMITTED_STATUSES: ReadonlyArray<NonNullable<ExamReportStudentSummary['submissionType']>> = [
    'manual_submit',
    'auto_submit',
    'force_close',
    'retake',
];

export function toIsoDate(value: Date | string | null | undefined) {
    if (!value) {
        return null;
    }

    const date = value instanceof Date ? value : new Date(value);

    return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function toNumber(value: number | string | null | undefined) {
    return Number(value ?? 0);
}

export function isSubmittedSubmissionType(
    submissionType: ExamReportStudentSummary['submissionType'],
): boolean {
    return submissionType !== null && SUBMITTED_STATUSES.includes(submissionType);
}

export function roundPercentage(value: number) {
    return Math.round(value * 10) / 10;
}
