import type {
    AttemptAssessmentSnapshot,
    AttemptGradingDetailType,
    AttemptScoreSnapshot,
    ExamAttemptQuestionReport,
    ExamQuestion,
    GradingQuestionType,
} from '@sentinel/shared';

export type GradingAttemptSnapshotMetadata = {
    answers: Record<string, any>;
    evaluations: Record<string, any>;
    overallFeedback: string | null;
    itemOverrides: Record<string, any>;
    grading: Record<string, any>;
};

export type GradingAttemptDetailRow = {
    attemptId: string;
    examId: string;
    studentId: string;
    studentNumber: string;
    completedAt: Date | null;
    score: number | null;
    totalScore: number | null;
    initialScore: number | null;
    status: string;
    answerSnapshot: Record<string, any> | null;
    assessmentSnapshot: unknown;
    scoreSnapshot: unknown;
    examTitle: string;
    subjectTitle: string | null;
    studentName: string | null;
    lifecycleState: string | null;
    scoreState: string | null;
    finalizedAt: Date | null;
    finalizedBy: string | null;
};

export type GradingQuestionRow = {
    id: string;
    examId: string;
    type: string;
    sourceFileName: string | null;
    sourcePageNumber: number | null;
    sourceEvidence: string | null;
    passageContent: string | null;
    passageType: 'plain' | 'html' | null;
    content: unknown;
    points: number;
    orderIndex: number;
};

export type ParsedAttemptSnapshots = {
    assessmentSnapshot: AttemptAssessmentSnapshot | null;
    scoreSnapshot: AttemptScoreSnapshot | null;
};

export type BuildGradingAttemptDetailArgs = {
    attemptRow: GradingAttemptDetailRow;
    questions: ExamQuestion[];
    questionReports: ExamAttemptQuestionReport[];
    snapshotMetadata: GradingAttemptSnapshotMetadata;
};

export type GradingAttemptDetailResponse = {
    attempt: AttemptGradingDetailType;
    questions: GradingQuestionType[];
};
