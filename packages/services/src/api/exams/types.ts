import {
    ExamAttemptLifecycleEvent,
    ExamAttemptLifecycleState,
    ExamAttemptScoreState,
    ExamAttemptAnswers,
    ExamQuestion,
    ExamStatus,
    ExamRuntimeAccess,
    ExamRuntimeAccessState,
    StudentExamAccessOverride,
    StudentExamAccessOverrideType,
    InternalExamStatus,
    ProctorExam,
    StudentExamStatus,
    Flag,
    StudentSession,
    ExamReport,
} from '@sentinel/shared/types';

export interface ApiExamResponse<T> {
    message: string;
    data: T;
}

export interface ApiExamSection {
    id: string;
    title: string;
    description?: string | null;
    orderIndex: number;
}

export interface ApiExamQuestion {
    id: string;
    examId: string;
    sectionId?: string | null;
    sourceQuestionBankQuestionId?: string | null;
    sourceCollectionId?: string | null;
    sourceOrigin?: ExamQuestion['sourceOrigin'];
    sourceFileName?: string | null;
    sourcePageNumber?: number | null;
    sourceEvidence?: string | null;
    passageContent?: string | null;
    passageType?: 'plain' | 'html' | null;
    type: ExamQuestion['type'];
    points: number;
    orderIndex: number;
    content: ExamQuestion['content'];
    tags?: string[];
}

export interface ApiExamSummary {
    id: string;
    title: string;
    description: string | null;
    durationMinutes: number;
    passingScore: number;
    status: ExamStatus;
    classroomId: string | null;
    classroomIds?: string[] | null;
    classroomName: string | null;
    classroomNames?: string[] | null;
    subjectId: string | null;
    subjectTitle: string | null;
    sectionId: string | null;
    sectionName: string | null;
    roomId: string | null;
    roomName: string | null;
    scheduledDate: string | null;
    endDateTime: string | null;
    publishedAt: string | null;
    questionCount: number;
    createdAt: string | null;
    updatedAt: string | null;
    sectionIds?: string[] | null;
    assigned_section_ids?: string[] | null;
    attemptId?: string | null;
    completedAt?: string | null;
    score?: number | null;
    totalScore?: number | null;
    percentage?: number | null;
    timeSpentMinutes?: number | null;
    cheated?: boolean;
    cheatingType?: string | null;
    incidentCount?: number;
    studentsCount?: number;
    runtimeAccess?: ExamRuntimeAccess;
    mediaPipeSandbox?: ProctorExam['mediaPipeSandbox'];
    isPublic?: boolean;
    createdBy?: string | null;
    assignedRoomNames?: string[];
    assignedInstructorNames?: string[];
    assignedInstructorIds?: string[];
    sectionNames?: string[];
}

export interface ApiExamDetail extends ApiExamSummary {
    settings: NonNullable<ProctorExam['settings']>;
    configuration: NonNullable<ProctorExam['configuration']>;
    questionSections: ApiExamSection[];
    questions: ApiExamQuestion[];
}

export interface ApiMonitoringExam {
    id: string;
    title: string;
    subject: string;
    scheduledDate: string | null;
    endDateTime: string | null;
    maxReconnectAttempts: number;
    runtimeAccess?: ExamRuntimeAccess;
    remediationContext?: {
        remediationId: string;
        remediationType: 'RETAKE' | 'MAKEUP';
        sourceExamId: string;
        sourceExamTitle: string;
        sourceAttemptId: string | null;
    } | null;
}

export interface ApiMonitoringStats {
    total: number;
    active: number;
    flagged: number;
    submitted: number;
    disconnected: number;
}

export interface ApiMonitoringStudentSummary {
    id: string;
    studentRecordId: string;
    attemptId: string;
    studentNo: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
    status: StudentSession['status'];
    progress: number;
    incidentCount: number;
    openIncidentCount: number;
    latestIncidentType: Flag['type'] | null;
    lastActivityAt: string | null;
    startedAt: string | null;
    completedAt: string | null;
    timeSpentMinutes: number | null;
    reconnectCount: number;
    score?: number | null;
    totalScore?: number | null;
    lifecycleState?: ExamAttemptLifecycleState | null;
    scoreState?: ExamAttemptScoreState | null;
    closedReason?: string | null;
    reopenedUntil?: string | null;
    finalizedAt?: string | null;
}

export interface ApiMonitoringIncident {
    id: string;
    type: Flag['type'];
    rawEventType?: Flag['rawEventType'];
    timestamp: string;
    description: string;
    severity: Flag['severity'];
    snapshotUrl?: string | null;
    evidenceUrl?: string | null;
    evidenceCount?: number;
    evidenceStates?: Flag['evidenceStates'];
    status?: Flag['status'];
    occurrenceCount?: number;
    severityReason?: Flag['severityReason'];
    persistenceTrigger?: Flag['persistenceTrigger'];
    matchingWindowSeconds?: Flag['matchingWindowSeconds'];
    wasSeverityForced?: boolean;
    anomalyType?: Flag['anomalyType'];
    confidenceScore?: Flag['confidenceScore'];
}

export interface ApiMonitoringStudentDetail extends ApiMonitoringStudentSummary {
    flags: ApiMonitoringIncident[];
    lifecycleEvents?: ExamAttemptLifecycleEvent[];
}

export type LockExamAttemptLifecyclePayload = {
    id: string;
    attemptId: string;
    reasonCode: string;
    notes?: string | null;
};

export type ReopenExamAttemptLifecyclePayload = {
    id: string;
    attemptId: string;
    reopenedUntil: string;
    reasonCode?: string | null;
    notes?: string | null;
};

export type ResetExamAttemptLifecyclePayload = {
    id: string;
    attemptId: string;
    reasonCode?: string | null;
    notes?: string | null;
    createReplacementAttempt?: boolean;
};

export type CloseExamAttemptLifecyclePayload = {
    id: string;
    attemptId: string;
    reasonCode: string;
    notes?: string | null;
};

export type GrantMakeupExamWindowPayload = {
    id: string;
    studentId: string;
    availableFrom: string;
    availableUntil: string;
    allowedAttempts?: number;
    notes?: string | null;
};

export type GrantRetakeExamWindowPayload = {
    id: string;
    studentId: string;
    attemptId: string;
    availableFrom: string;
    availableUntil: string;
    allowedAttempts?: number;
    notes?: string | null;
};

export interface ApiMonitoringOverview {
    exam: ApiMonitoringExam;
    stats: ApiMonitoringStats;
    lobbyAdmissions: {
        waiting: number;
        approved: number;
        inAttempt: number;
    };
    students: ApiMonitoringStudentSummary[];
}

export interface ApiExamReportExam {
    id: string;
    title: string;
    subject: string;
    scheduledDate: string | null;
    endDateTime: string | null;
    durationMinutes: number;
    passingScore: number;
}

export interface ApiExamReportSectionOption {
    id: string;
    name: string;
}

export interface ApiExamReportIncidentOutcomeSummary {
    pending: number;
    reviewed: number;
    confirmed: number;
    dismissed: number;
}

export interface ApiExamReportIncidentTypeBreakdown {
    type: Flag['type'];
    count: number;
}

export interface ApiExamReportIncidentSeverityBreakdown {
    severity: Flag['severity'];
    count: number;
}

export interface ApiExamReportActionItem {
    id: string;
    studentId: string;
    attemptId: string | null;
    studentNo: string;
    firstName: string;
    lastName: string;
    reason: string;
    remediations?: Array<{
        remediationId: string;
        remediationExamId: string;
        remediationType: 'RETAKE' | 'MAKEUP';
        scheduledDate: string | null;
        endDateTime: string | null;
        title: string;
        status: string;
    }>;
}

export interface ApiExamReportStudentSummary {
    id: string;
    studentId: string;
    attemptId: string | null;
    studentNo: string;
    firstName: string;
    lastName: string;
    sectionId: string | null;
    sectionName: string | null;
    status: ExamReport['students'][number]['status'];
    startedAt: string | null;
    completedAt: string | null;
    score: number | null;
    totalScore: number | null;
    percentage: number | null;
    timeSpentMinutes: number | null;
    incidentCount: number;
    openIncidentCount: number;
    primaryIncidentType: Flag['type'] | null;
    highestIncidentSeverity: Flag['severity'] | null;
    incidentOutcomes: ApiExamReportIncidentOutcomeSummary;
    submissionType: ExamReport['students'][number]['submissionType'];
    attemptKind: ExamReport['students'][number]['attemptKind'];
    attemptCount: number;
    isFlagged: boolean;
    needsReview: boolean;
    needsMakeup: boolean;
    needsRetake: boolean;
    lifecycleState?: ExamAttemptLifecycleState | null;
    scoreState?: ExamAttemptScoreState | null;
    closedReason?: string | null;
    reopenedUntil?: string | null;
    isFinalized?: boolean;
    finalizedAt?: string | null;
    supersededByAttemptId?: string | null;
    supersededAt?: string | null;
    supersededBy?: string | null;
    finalizedBy?: string | null;
    remediations?: Array<{
        remediationId: string;
        remediationExamId: string;
        remediationType: 'RETAKE' | 'MAKEUP';
        scheduledDate: string | null;
        endDateTime: string | null;
        title: string;
        status: string;
    }>;
}

export interface ApiExamReportSummary {
    totalAssignedStudents: number;
    totalStarted: number;
    totalSubmitted: number;
    totalAbsent: number;
    flaggedStudentsCount: number;
    averageScore: number | null;
    passRate: number | null;
    incidentBreakdownByType: ApiExamReportIncidentTypeBreakdown[];
    incidentBreakdownBySeverity: ApiExamReportIncidentSeverityBreakdown[];
    needsReviewCount: number;
    needsMakeupCount: number;
    needsRetakeCount: number;
}

export interface ApiExamReportActionItems {
    review: ApiExamReportActionItem[];
    makeup: ApiExamReportActionItem[];
    retake: ApiExamReportActionItem[];
}

export interface ApiExamReportStudentsPagination {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
}

export interface ApiExamReport {
    exam: ApiExamReportExam;
    summary: ApiExamReportSummary;
    sections: ApiExamReportSectionOption[];
    students: ApiExamReportStudentSummary[];
    studentsPagination: ApiExamReportStudentsPagination;
    actionItems: ApiExamReportActionItems;
}

export type GetExamsParams = {
    search?: string;
    status?: ExamStatus;
    subjectId?: string;
    classroomId?: string;
    institutionId?: string;
    viewer?: 'student' | 'staff';
};

export type GetExamParams = {
    viewer?: 'student' | 'staff';
};

export type GetExamReportParams = {
    search?: string;
    sectionId?: string;
    page?: number;
    pageSize?: number;
};

export type GetExamReportsParams = {
    page?: number;
    limit?: number;
    search?: string;
};

export type CreateExamPayload = {
    title: string;
    description: string;
    classroomId?: string;
    classroomIds?: string[];
    classroomName?: string;
    subjectId?: string;
    section?: string;
    sectionId?: string;
    sectionIds?: string[];
    roomId?: string;
    instructorId?: string | null;
    instructorIds?: string[];
    startDateTime: string;
    endDateTime: string;
    durationMinutes: number;
    passingScore?: number;
    shuffleQuestions?: boolean;
    showCorrectAnswers?: boolean;
    allowReview?: boolean;
    randomizeChoices?: boolean;
    settings?: ProctorExam['settings'];
    configuration?: ProctorExam['configuration'];
    isPublic?: boolean;
};

export type UpdateExamQuestionSectionPayload = {
    id?: string;
    title: string;
    description?: string | null;
    orderIndex: number;
};

export type UpdateExamQuestionPayload = {
    id?: string;
    sectionId?: string | null;
    sourceQuestionBankQuestionId?: string | null;
    sourceCollectionId?: string | null;
    sourceOrigin?: ExamQuestion['sourceOrigin'];
    sourceFileName?: string | null;
    sourcePageNumber?: number | null;
    sourceEvidence?: string | null;
    passageContent?: string | null;
    passageType?: 'plain' | 'html' | null;
    type: ExamQuestion['type'];
    points: number;
    orderIndex: number;
    content: ExamQuestion['content'];
};

export type UpdateExamPayload = Omit<
    Partial<CreateExamPayload>,
    | 'subjectId'
    | 'section'
    | 'sectionId'
    | 'roomId'
    | 'classroomId'
    | 'classroomIds'
    | 'classroomName'
    | 'sectionIds'
    | 'instructorId'
    | 'instructorIds'
    | 'settings'
    | 'configuration'
> & {
    classroomId?: string | null;
    classroomIds?: string[] | null;
    classroomName?: string | null;
    subjectId?: string | null;
    section?: string | null;
    sectionId?: string | null;
    sectionIds?: string[] | null;
    roomId?: string | null;
    instructorId?: string | null;
    instructorIds?: string[] | null;
    settings?: ProctorExam['settings'];
    configuration?: ProctorExam['configuration'];
    questionSections?: UpdateExamQuestionSectionPayload[];
    questions?: UpdateExamQuestionPayload[];
    status?: InternalExamStatus | StudentExamStatus;
};

export type UpdateExamStatusPayload = {
    id: string;
    status: ExamStatus;
};

export type UpdateExamRuntimeAccessPayload = {
    id: string;
    state: Exclude<ExamRuntimeAccessState, 'before_start' | 'lobby_approved' | 'lobby_waiting'>;
    reopenedUntil?: string | null;
};

export type CreateStudentExamAccessOverridePayload = {
    id: string;
    studentId: string;
    overrideType: StudentExamAccessOverrideType;
    availableFrom: string;
    availableUntil: string;
    allowedAttempts?: number;
    sourceAttemptId?: string | null;
    notes?: string | null;
};

export type OverrideReconnectLimitPayload = {
    id: string;
    studentId: string;
    reason?: string | null;
};

export type ApiStudentExamAccessOverride = StudentExamAccessOverride;

export type ExamConfigurationState = {
    settings: NonNullable<ProctorExam['settings']>;
    configuration: NonNullable<ProctorExam['configuration']>;
};

export type StartExamSessionPayload = {
    examId: string;
    resumeRequestId?: string;
};

export type StartExamSessionResult = {
    sessionId?: string;
    configSnapshot?: ExamConfigurationState;
    isResumed?: boolean;
    answers?: ExamAttemptAnswers;
    elapsedSeconds?: number;
    reconnectAttemptCount?: number;
    maxReconnectAttempts?: number;
    attemptId?: string;
    error?: string;
    errorCode?:
        'ATTEMPT_ALREADY_COMPLETED' | 'ATTEMPT_LOCKED' | 'ATTEMPT_CLOSED' | 'ATTEMPT_SUPERSEDED';
};

export type CompleteExamSessionPayload = {
    sessionId: string;
    answers: ExamAttemptAnswers;
    elapsedSeconds: number;
    preparationToken?: string;
};

export type CompleteExamSessionResult = import('@sentinel/shared/types').ExamAttemptScoreSummary & {
    attemptId: string;
    completedAt: string;
};

export type PrepareExamSessionPayload = {
    sessionId: string;
    answers: ExamAttemptAnswers;
    elapsedSeconds: number;
};

export type PrepareExamSessionResult = import('@sentinel/shared/types').ExamAttemptScoreSummary & {
    preparationToken: string;
};

export type SyncExamProgressPayload = {
    sessionId: string;
    answeredCount: number;
    elapsedSeconds: number;
    answers?: ExamAttemptAnswers;
};

export type SyncExamProgressResult = {
    message: string;
};

export type ApiIncidentLogItem = {
    incidentId: string;
    attemptId: string | null;
    examId: string | null;
    examTitle: string | null;
    institutionId: string | null;
    studentId: string | null;
    studentRecordId: string | null;
    studentName: string | null;
    platform: 'WEB' | 'MOBILE' | null;
    source: 'CLIENT' | 'SERVER' | 'AI' | null;
    ruleKey: string | null;
    incidentType: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | null;
    status: 'PENDING' | 'REVIEWED' | 'CONFIRMED' | 'DISMISSED' | null;
    timestamp: string | null;
    evidenceUrl: string | null;
    reviewedBy: string | null;
    reviewedAt: string | null;
    reviewNotes: string | null;
    configurationSnapshot: any;
    sessionContext: any;
    details: any;
    studentNo: string | null;
    sectionId: string | null;
    sectionName: string | null;
    elapsedSeconds: number;
};

export type ApiGetExamIncidentsQuery = {
    sectionId?: string;
    studentId?: string;
    severity?: 'LOW' | 'MEDIUM' | 'HIGH';
    type?: string;
    status?: 'PENDING' | 'CONFIRMED' | 'DISMISSED';
    page?: number;
    limit?: number;
};

export type ApiGetExamIncidentsResponse = {
    message: string;
    data: ApiIncidentLogItem[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
};

export type ApiReviewExamIncidentsPayload = {
    incidentIds: string[];
    status: 'CONFIRMED' | 'DISMISSED';
    reviewNotes?: string | null;
};

export type ApiReviewExamIncidentsResponse = {
    message: string;
    data: {
        updatedCount: number;
        updatedAt: string;
    };
};
