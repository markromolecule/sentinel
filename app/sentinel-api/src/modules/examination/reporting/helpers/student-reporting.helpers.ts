import type { ExamReportStudentSummary } from '../reporting.dto';
import type { ReportStudentRow } from '../services/reporting-response.types';
import {
    getPercentage,
    needsRetake,
    needsReview,
    normalizeIncidentSeverity,
    resolveAttemptKind,
    resolveStudentNames,
    isSubmitted,
} from '../services/reporting-response.shared';
import { toIsoDate, toNumber } from '../services/reporting-response.types';

export {
    getPercentage,
    needsRetake,
    needsReview,
    normalizeIncidentSeverity,
    resolveAttemptKind,
    resolveStudentNames,
    isSubmitted,
} from '../services/reporting-response.shared';

export function buildActionItemSource(student: ExamReportStudentSummary): ReportStudentRow {
    return {
        student_user_id: student.id,
        student_record_id: student.studentId,
        student_number: student.studentNo,
        first_name: student.firstName,
        last_name: student.lastName,
        section_id: student.sectionId,
        section_name: student.sectionName,
        attempt_id: student.attemptId,
        attempt_status: student.status,
        started_at: student.startedAt,
        completed_at: student.completedAt,
        time_spent_minutes: student.timeSpentMinutes,
        score: student.score,
        total_score: student.totalScore,
        percentage: student.percentage,
        attempt_count: student.attemptCount,
        incident_count: student.incidentCount,
        open_incident_count: student.openIncidentCount,
        pending_incident_count: student.incidentOutcomes.pending,
        reviewed_incident_count: student.incidentOutcomes.reviewed,
        confirmed_incident_count: student.incidentOutcomes.confirmed,
        dismissed_incident_count: student.incidentOutcomes.dismissed,
        highest_incident_type: student.primaryIncidentType,
        highest_incident_severity: student.highestIncidentSeverity?.toUpperCase() ?? null,
        attempt_kind: student.attemptKind,
        attempt_finalized_at: student.finalizedAt ?? null,
    };
}

export function buildActionItem(
    row: ReportStudentRow,
    reason: string,
    remediations?: import('../reporting.dto').ExamReportStudentSummary['remediations'],
): import('../reporting.dto').ExamReportActionItem {
    const { firstName, lastName } = resolveStudentNames(row);

    return {
        id: row.student_user_id ?? row.student_record_id,
        studentId: row.student_record_id,
        attemptId: row.attempt_id ?? null,
        studentNo: row.student_number,
        firstName,
        lastName,
        reason,
        sectionId: row.section_id ?? null,
        sectionName: row.section_name ?? null,
        remediations: remediations ?? [],
    };
}

export function resolveStudentStatus(
    row: ReportStudentRow,
    passingScore: number,
): ExamReportStudentSummary['status'] {
    if (!row.attempt_id) {
        return 'absent';
    }

    if (row.lifecycle_state === 'SUPERSEDED') {
        return 'submitted';
    }

    if (needsReview(row)) {
        return 'flagged';
    }

    if (isSubmitted(row) || needsRetake(row, passingScore)) {
        return 'submitted';
    }

    return 'in_progress';
}

export function resolveSubmissionType(
    row: ReportStudentRow,
): ExamReportStudentSummary['submissionType'] {
    if (!row.attempt_id) {
        return 'absent';
    }

    if (row.lifecycle_state === 'CLOSED') {
        return 'force_close';
    }

    if (resolveAttemptKind(row) === 'retake' && isSubmitted(row)) {
        return 'retake';
    }

    if (isSubmitted(row)) {
        return 'manual_submit';
    }

    return null;
}

export function mapStudentSummary(
    row: ReportStudentRow,
    passingScore: number,
    options?: {
        remediations?: ExamReportStudentSummary['remediations'];
    },
): ExamReportStudentSummary {
    const percentage = getPercentage(row);
    const openIncidentCount = toNumber(row.open_incident_count);
    const incidentCount = toNumber(row.incident_count);
    const highestIncidentSeverity = normalizeIncidentSeverity(row.highest_incident_severity);
    const reviewRequired = needsReview(row);
    const makeupRequired = !row.attempt_id;
    const retakeRequired = needsRetake(row, passingScore);
    const { firstName, lastName } = resolveStudentNames(row);

    return {
        id: row.student_user_id ?? row.student_record_id,
        studentId: row.student_record_id,
        attemptId: row.attempt_id ?? null,
        studentNo: row.student_number,
        firstName,
        lastName,
        sectionId: row.section_id ?? null,
        sectionName: row.section_name ?? null,
        status: resolveStudentStatus(row, passingScore),
        startedAt: toIsoDate(row.started_at),
        completedAt: toIsoDate(row.completed_at),
        score: row.score ?? null,
        totalScore: row.total_score ?? null,
        percentage,
        timeSpentMinutes: row.time_spent_minutes ?? null,
        incidentCount,
        openIncidentCount,
        primaryIncidentType: row.highest_incident_type ?? null,
        highestIncidentSeverity,
        incidentOutcomes: {
            pending: toNumber(row.pending_incident_count),
            reviewed: toNumber(row.reviewed_incident_count),
            confirmed: toNumber(row.confirmed_incident_count),
            dismissed: toNumber(row.dismissed_incident_count),
        },
        submissionType: resolveSubmissionType(row),
        attemptKind: resolveAttemptKind(row),
        attemptCount: toNumber(row.attempt_count),
        isFlagged: reviewRequired,
        needsReview: reviewRequired,
        needsMakeup: makeupRequired && row.active_override_type !== 'MAKEUP',
        needsRetake: retakeRequired,
        isFinalized: row.attempt_finalized_at != null || row.score_state === 'FINALIZED',
        finalizedAt: toIsoDate(row.attempt_finalized_at ?? row.finalized_at),
        lifecycleState: row.lifecycle_state ?? null,
        scoreState: row.score_state ?? null,
        closedReason: row.closed_reason ?? null,
        reopenedUntil: toIsoDate(row.reopened_until),
        supersededByAttemptId: row.superseded_by_attempt_id ?? null,
        supersededAt: toIsoDate(row.superseded_at),
        supersededBy: row.superseded_by ?? null,
        finalizedBy: row.finalized_by ?? null,
        remediations: options?.remediations ?? [],
    };
}
