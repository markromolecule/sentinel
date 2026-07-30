import type { ExamReportStudentSummary } from '../reporting.dto';
import type { ReportStudentRow } from './reporting-response.types';
import { roundPercentage, toNumber } from './reporting-response.types';

export { roundPercentage, toNumber } from './reporting-response.types';

const SUBMITTED_STATUSES: ReadonlyArray<NonNullable<ExamReportStudentSummary['submissionType']>> = [
    'manual_submit',
    'auto_submit',
    'force_close',
    'retake',
];

export function resolveStudentNames(row: ReportStudentRow) {
    return {
        firstName: row.first_name?.trim() || 'Unknown',
        lastName: row.last_name?.trim() || 'Student',
    };
}

export function normalizeIncidentSeverity(
    severity: string | null | undefined,
): ExamReportStudentSummary['highestIncidentSeverity'] {
    switch (severity?.toUpperCase()) {
        case 'HIGH':
            return 'high';
        case 'LOW':
            return 'low';
        case 'MEDIUM':
            return 'medium';
        default:
            return null;
    }
}

export function isSubmitted(row: ReportStudentRow) {
    if (row.lifecycle_state) {
        return (
            row.lifecycle_state === 'SUBMITTED' ||
            row.lifecycle_state === 'CLOSED' ||
            row.lifecycle_state === 'SUPERSEDED'
        );
    }
    return Boolean(row.completed_at) || row.attempt_status?.toUpperCase() === 'COMPLETED';
}

export function getPercentage(row: ReportStudentRow) {
    if (typeof row.percentage === 'number') {
        return roundPercentage(row.percentage);
    }

    const score = row.score ?? null;
    const totalScore = row.total_score ?? null;

    if (score === null || totalScore === null || totalScore <= 0) {
        return null;
    }

    return roundPercentage((score / totalScore) * 100);
}

export function needsReview(row: ReportStudentRow) {
    if (row.lifecycle_state === 'LOCKED') {
        return true;
    }
    return (
        toNumber(row.open_incident_count) > 0 ||
        normalizeIncidentSeverity(row.highest_incident_severity) === 'high'
    );
}

export function needsRetake(row: ReportStudentRow, passingScore: number) {
    const percentage = getPercentage(row);

    if (!isSubmitted(row) || percentage === null) {
        return false;
    }

    if (row.lifecycle_state === 'SUPERSEDED') {
        return false;
    }

    if (row.active_override_type === 'RETAKE') {
        return false;
    }

    return percentage < passingScore;
}

export function resolveAttemptKind(row: ReportStudentRow): ExamReportStudentSummary['attemptKind'] {
    if (!row.attempt_id) {
        return null;
    }

    if (row.attempt_kind) {
        return row.attempt_kind;
    }

    if (row.lifecycle_state === 'SUPERSEDED') {
        return 'primary';
    }

    if (toNumber(row.attempt_count) > 1 && isSubmitted(row)) {
        return 'retake';
    }

    return 'primary';
}

export function isSubmittedSubmissionType(
    submissionType: ExamReportStudentSummary['submissionType'],
): boolean {
    return submissionType !== null && SUBMITTED_STATUSES.includes(submissionType);
}
