import { resolveExamStatus, resolveStudentExamStatus } from '@sentinel/shared';
import type {
    ExamAttemptLifecycleEvent,
    ExamRuntimeAccess,
    Flag,
    StudentSession,
    ExamReport,
    ProctorExam,
} from '@sentinel/shared/types';
import type {
    ApiMonitoringIncident,
    ApiMonitoringStudentSummary,
    ApiMonitoringStudentDetail,
    ApiExamReportActionItem,
    ApiExamReportStudentSummary,
    ApiExamSummary,
    ApiExamDetail,
} from './types';

export function normalizeDateTime(value?: string | null) {
    return value ?? undefined;
}

export function formatRelativeTime(value?: string | null) {
    if (!value) {
        return 'No recent activity';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return 'No recent activity';
    }

    const diffMs = Date.now() - date.getTime();
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

export function mapMonitoringFlag(flag: ApiMonitoringIncident): Flag {
    return {
        id: flag.id,
        type: flag.type,
        rawEventType: flag.rawEventType ?? null,
        timestamp: flag.timestamp,
        description: flag.description,
        severity: flag.severity,
        snapshotUrl: flag.snapshotUrl ?? undefined,
        evidenceUrl: flag.evidenceUrl ?? null,
        evidenceCount: flag.evidenceCount ?? 0,
        evidenceStates: flag.evidenceStates ?? [],
        status: flag.status ?? null,
        occurrenceCount: flag.occurrenceCount,
        severityReason: flag.severityReason ?? null,
        persistenceTrigger: flag.persistenceTrigger ?? null,
        matchingWindowSeconds: flag.matchingWindowSeconds ?? null,
        wasSeverityForced: flag.wasSeverityForced ?? false,
        anomalyType: flag.anomalyType ?? null,
        confidenceScore: flag.confidenceScore ?? null,
    };
}

export function mapExamRuntimeAccess(
    runtimeAccess?: ExamRuntimeAccess | null,
): ExamRuntimeAccess | undefined {
    if (!runtimeAccess) {
        return undefined;
    }

    const normalizeRuntimeDate = (value?: string | Date | null) =>
        typeof value === 'string' ? (normalizeDateTime(value) ?? null) : (value ?? null);

    return {
        ...runtimeAccess,
        startsAt: normalizeRuntimeDate(runtimeAccess.startsAt),
        endsAt: normalizeRuntimeDate(runtimeAccess.endsAt),
        reopenedUntil: normalizeRuntimeDate(runtimeAccess.reopenedUntil),
    };
}

export function mapMonitoringStudent(
    student: ApiMonitoringStudentSummary | ApiMonitoringStudentDetail,
): StudentSession {
    return {
        id: student.id,
        studentRecordId: student.studentRecordId,
        attemptId: student.attemptId,
        studentNo: student.studentNo,
        firstName: student.firstName,
        lastName: student.lastName,
        avatarUrl: student.avatarUrl ?? null,
        status: student.status,
        progress: student.progress,
        flags: 'flags' in student ? student.flags.map(mapMonitoringFlag) : [],
        incidentCount: student.incidentCount,
        openIncidentCount: student.openIncidentCount,
        latestIncidentType: student.latestIncidentType ?? null,
        lastActivity: formatRelativeTime(student.lastActivityAt),
        lastActivityAt: student.lastActivityAt ?? null,
        startedAt: student.startedAt ?? null,
        completedAt: student.completedAt ?? null,
        timeSpentMinutes: student.timeSpentMinutes ?? null,
        reconnectCount: student.reconnectCount ?? 0,
        score: student.score ?? null,
        totalScore: student.totalScore ?? null,
        lifecycleState: student.lifecycleState ?? null,
        scoreState: student.scoreState ?? null,
        closedReason: student.closedReason ?? null,
        reopenedUntil: student.reopenedUntil ?? null,
        finalizedAt: student.finalizedAt ?? null,
        lifecycleEvents:
            'lifecycleEvents' in student
                ? ((student.lifecycleEvents ?? []) as ExamAttemptLifecycleEvent[])
                : [],
    };
}

export function mapExamReportActionItem(
    item: ApiExamReportActionItem,
): ExamReport['actionItems']['review'][number] {
    return {
        id: item.id,
        studentId: item.studentId,
        attemptId: item.attemptId ?? null,
        studentNo: item.studentNo,
        firstName: item.firstName,
        lastName: item.lastName,
        reason: item.reason,
    };
}

export function mapExamReportStudent(
    student: ApiExamReportStudentSummary,
): ExamReport['students'][number] {
    return {
        id: student.id,
        studentId: student.studentId,
        attemptId: student.attemptId ?? null,
        studentNo: student.studentNo,
        firstName: student.firstName,
        lastName: student.lastName,
        sectionId: student.sectionId ?? null,
        sectionName: student.sectionName ?? null,
        status: student.status,
        startedAt: student.startedAt ?? null,
        completedAt: student.completedAt ?? null,
        score: student.score ?? null,
        totalScore: student.totalScore ?? null,
        percentage: student.percentage ?? null,
        timeSpentMinutes: student.timeSpentMinutes ?? null,
        incidentCount: student.incidentCount,
        openIncidentCount: student.openIncidentCount,
        primaryIncidentType: student.primaryIncidentType ?? null,
        highestIncidentSeverity: student.highestIncidentSeverity ?? null,
        incidentOutcomes: student.incidentOutcomes,
        submissionType: (student as any).submissionType ?? null,
        attemptKind: student.attemptKind ?? null,
        attemptCount: student.attemptCount,
        isFlagged: student.isFlagged,
        needsReview: student.needsReview,
        needsMakeup: student.needsMakeup,
        needsRetake: student.needsRetake,
        isFinalized: student.isFinalized ?? false,
        finalizedAt: student.finalizedAt ?? null,
        lifecycleState: student.lifecycleState ?? null,
        scoreState: student.scoreState ?? null,
        closedReason: student.closedReason ?? null,
        reopenedUntil: student.reopenedUntil ?? null,
        supersededByAttemptId: student.supersededByAttemptId ?? null,
        supersededAt: student.supersededAt ?? null,
        supersededBy: student.supersededBy ?? null,
        finalizedBy: student.finalizedBy ?? null,
    };
}

/**
 * Maps exam API responses into the shared proctor exam model used by the web app.
 */
export function mapExam(apiExam: ApiExamSummary | ApiExamDetail): ProctorExam {
    const status = apiExam.completedAt
        ? resolveStudentExamStatus({
              status: apiExam.status,
              scheduledDate: apiExam.scheduledDate,
              endDateTime: apiExam.endDateTime,
              durationMinutes: apiExam.durationMinutes,
              attemptCompletedAt: apiExam.completedAt,
          })
        : resolveExamStatus({
              status: apiExam.status,
              scheduledDate: apiExam.scheduledDate,
              endDateTime: apiExam.endDateTime,
              durationMinutes: apiExam.durationMinutes,
          });

    return {
        id: apiExam.id,
        title: apiExam.title,
        description: apiExam.description ?? '',
        duration: apiExam.durationMinutes,
        passingScore: apiExam.passingScore,
        status,
        settings: 'settings' in apiExam ? apiExam.settings : undefined,
        configuration: 'configuration' in apiExam ? apiExam.configuration : undefined,
        questions:
            'questions' in apiExam
                ? apiExam.questions.map((question) => ({
                      id: question.id,
                      examId: question.examId,
                      sectionId: question.sectionId ?? undefined,
                      sourceQuestionBankQuestionId:
                          question.sourceQuestionBankQuestionId ?? undefined,
                      sourceCollectionId: question.sourceCollectionId ?? undefined,
                      sourceOrigin: question.sourceOrigin ?? undefined,
                      sourceFileName: question.sourceFileName ?? null,
                      sourcePageNumber: question.sourcePageNumber ?? null,
                      sourceEvidence: question.sourceEvidence ?? null,
                      passageContent: question.passageContent ?? null,
                      passageType: question.passageType ?? null,
                      type: question.type,
                      points: question.points,
                      orderIndex: question.orderIndex,
                      content: question.content,
                      tags: question.tags ?? [],
                  }))
                : undefined,
        questionSections:
            'questionSections' in apiExam
                ? apiExam.questionSections.map((section) => ({
                      id: section.id,
                      questionType: (section.questionType as any) ?? null,
                      title: section.title,
                      description: section.description ?? null,
                      orderIndex: section.orderIndex,
                      isCollapsed: false,
                  }))
                : undefined,
        createdAt: normalizeDateTime(apiExam.createdAt) ?? new Date().toISOString(),
        updatedAt: normalizeDateTime(apiExam.updatedAt) ?? new Date().toISOString(),
        publishedAt: normalizeDateTime(apiExam.publishedAt),
        classroomId: apiExam.classroomId ?? undefined,
        classroomIds: apiExam.classroomIds ?? [],
        classroomName: apiExam.classroomName ?? undefined,
        classroomNames: apiExam.classroomNames ?? [],
        subject: apiExam.subjectTitle ?? 'Untitled Subject',
        subjectId: apiExam.subjectId ?? undefined,
        section: apiExam.sectionName ?? undefined,
        sectionIds: apiExam.sectionIds ?? apiExam.assigned_section_ids ?? [],
        room: apiExam.roomName ?? undefined,
        roomId: apiExam.roomId ?? undefined,
        scheduledDate: normalizeDateTime(apiExam.scheduledDate),
        endDateTime: normalizeDateTime(apiExam.endDateTime),
        questionCount: apiExam.questionCount,
        studentsCount: apiExam.studentsCount ?? 0,
        attemptId: apiExam.attemptId ?? null,
        completedAt: apiExam.completedAt ?? null,
        score: apiExam.score != null ? Number(apiExam.score) : null,
        totalScore: apiExam.totalScore != null ? Number(apiExam.totalScore) : null,
        percentage: apiExam.percentage != null ? Number(apiExam.percentage) : null,
        timeSpentMinutes: apiExam.timeSpentMinutes ?? null,
        cheated: apiExam.cheated ?? false,
        cheatingType: (apiExam.cheatingType as any) ?? null,
        incidentCount: apiExam.incidentCount ?? 0,
        runtimeAccess: mapExamRuntimeAccess(apiExam.runtimeAccess),
        mediaPipeSandbox: 'mediaPipeSandbox' in apiExam ? apiExam.mediaPipeSandbox : undefined,
        isPublic: apiExam.isPublic ?? false,
        createdBy: apiExam.createdBy ?? undefined,
        assignedRoomNames: apiExam.assignedRoomNames ?? [],
        assignedInstructorNames: apiExam.assignedInstructorNames ?? [],
        assignedInstructorIds: apiExam.assignedInstructorIds ?? [],
        sectionNames: apiExam.sectionNames ?? [],
    };
}
