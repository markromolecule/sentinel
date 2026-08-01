import type { ExamReportExportSource } from '../data/exam-reports/get-exam-report-export-source';

export interface StudentAttemptRow {
    studentId: string;
    studentNo: string;
    firstName: string;
    lastName: string;
    sectionName: string;
    score: number | null;
    status: string;
    attemptKind: 'makeup' | 'retake' | null;
    activeOverrideType: string | null;
    incidentsPending: number;
    incidentsReviewed: number;
    incidentsConfirmed: number;
    incidentsDismissed: number;
}

export interface SectionSummary {
    sectionName: string;
    totalStudents: number;
    averageScore: number;
    passRate: number;
}

export interface IncidentTypeDistribution {
    type: string;
    count: number;
    percentage: number;
}

export interface ExamResultsReportViewModel {
    generatedAt: string;
    generatedBy: string;
    institutionName: string;
    examId: string;
    examTitle: string;
    subjectCode: string;
    subjectName: string;
    durationMinutes: number;
    passingScore: number;
    scheduledDate: string;
    endDateTime: string;
    summary: {
        totalStudents: number;
        averageScore: number;
        passRate: number;
        totalCompletions: number;
        totalIncidents: number;
        totalAbsent: number;
        totalInProgress: number;
    };
    students: StudentAttemptRow[];
    sections: SectionSummary[];
    incidentTypes: IncidentTypeDistribution[];
    actionQueueCount: number;
}

function sanitizeRoundedNumber(
    value: number | undefined | null,
    decimals = 1,
    fallback = 0,
): number {
    if (value === undefined || value === null || Number.isNaN(value)) {
        return fallback;
    }
    const rounded = Number(value.toFixed(decimals));
    return Object.is(rounded, -0) ? 0 : rounded;
}

/**
 * Maps and normalizes the raw database snapshot into the structured
 * view model for the Examination Results Report PDF rendering.
 *
 * @param source - Raw loaded export source data
 * @returns Normalized and structured view model
 */
export function mapSourceToViewModel(
    source: ExamReportExportSource,
): ExamResultsReportViewModel {
    const report = source.report;
    const studentsList: any[] = report.students || [];

    // 1. Map student attempts
    const students: StudentAttemptRow[] = studentsList.map((s) => ({
        studentId: s.studentId || s.id || '',
        studentNo: s.studentNo || s.student_number || 'N/A',
        firstName: s.firstName || s.first_name || 'Unknown',
        lastName: s.lastName || s.last_name || 'Student',
        sectionName: s.sectionName || s.section_name || 'Unassigned',
        score: s.score ?? null,
        status: (s.status || 'ABSENT').toUpperCase(),
        attemptKind: s.attemptKind || s.attempt_kind || null,
        activeOverrideType: s.activeOverrideType || s.active_override_type || null,
        incidentsPending: s.incidentOutcomes?.pending || s.incident_outcomes?.pending || 0,
        incidentsReviewed: s.incidentOutcomes?.reviewed || s.incident_outcomes?.reviewed || 0,
        incidentsConfirmed: s.incidentOutcomes?.confirmed || s.incident_outcomes?.confirmed || 0,
        incidentsDismissed: s.incidentOutcomes?.dismissed || s.incident_outcomes?.dismissed || 0,
    }));

    // 2. Map section summaries
    const sectionMap = new Map<string, { total: number; sumScore: number; completionCount: number; passCount: number }>();
    students.forEach((s) => {
        const key = s.sectionName;
        if (!sectionMap.has(key)) {
            sectionMap.set(key, { total: 0, sumScore: 0, completionCount: 0, passCount: 0 });
        }
        const stats = sectionMap.get(key)!;
        stats.total++;
        if (s.score !== null) {
            stats.sumScore += s.score;
            stats.completionCount++;
            if (s.score >= source.passingScore) {
                stats.passCount++;
            }
        }
    });

    const sections: SectionSummary[] = Array.from(sectionMap.entries()).map(([sectionName, stats]) => ({
        sectionName,
        totalStudents: stats.total,
        averageScore: sanitizeRoundedNumber(stats.completionCount > 0 ? stats.sumScore / stats.completionCount : 0),
        passRate: sanitizeRoundedNumber(stats.total > 0 ? (stats.passCount / stats.total) * 100 : 0),
    })).sort((a, b) => a.sectionName.localeCompare(b.sectionName));

    // 3. Map incident type distributions
    const totalIncidentCount = students.reduce((acc, s) =>
        acc + s.incidentsPending + s.incidentsReviewed + s.incidentsConfirmed + s.incidentsDismissed, 0
    );

    const rawIncidents: any[] = report.summary?.incidentBreakdownByType || [];
    const incidentTypes: IncidentTypeDistribution[] = rawIncidents.map((inc) => ({
        type: inc.type || 'Other',
        count: inc.count || 0,
        percentage: sanitizeRoundedNumber(totalIncidentCount > 0 ? (inc.count / totalIncidentCount) * 100 : 0),
    })).sort((a, b) => b.count - a.count);

    // 4. Calculate total unique students in action items
    // Any student who is flagged, needs review, needs makeup, or needs retake is in the action queue
    const actionQueueCount = studentsList.filter((s) =>
        s.needsReview || s.needsMakeup || s.needsRetake || s.isFlagged
    ).length;

    // In-progress count
    const totalInProgress = studentsList.filter((s) => s.status === 'in_progress').length;

    return {
        generatedAt: new Date().toISOString(),
        generatedBy: source.generatedBy,
        institutionName: source.institutionName,
        examId: source.examId,
        examTitle: source.examTitle,
        subjectCode: source.subjectCode,
        subjectName: source.subjectName,
        durationMinutes: source.durationMinutes,
        passingScore: source.passingScore,
        scheduledDate: source.scheduledDate,
        endDateTime: source.endDateTime,
        summary: {
            totalStudents: report.summary?.totalAssignedStudents || students.length,
            averageScore: sanitizeRoundedNumber(report.summary?.averageScore),
            passRate: sanitizeRoundedNumber(report.summary?.passRate),
            totalCompletions: report.summary?.totalSubmitted || 0,
            totalIncidents: totalIncidentCount,
            totalAbsent: report.summary?.totalAbsent || 0,
            totalInProgress,
        },
        students,
        sections,
        incidentTypes,
        actionQueueCount,
    };
}
