import type { DbClient } from '@sentinel/db';
import type { CompleteSessionBody } from '../../flow.dto';
import type {
    AttemptAssessmentSnapshot,
    AttemptScoreSnapshot,
    ExamQuestion,
} from '@sentinel/shared';
import type { SessionRepository } from '../../data/session.repository';

export type CompleteSessionServiceArgs = {
    dbClient: DbClient;
    studentUserId: string;
    body: CompleteSessionBody;
};

export type OwnedSessionAttempt = NonNullable<
    Awaited<ReturnType<typeof SessionRepository.getOwnedSessionAttempt>>
>;

export type CompleteSessionAttemptContext = {
    attempt: OwnedSessionAttempt;
    examId: string;
    studentId: string;
};

export type CompleteSessionSummary = {
    score: number;
    totalScore: number;
    percentage: number | null;
    answeredCount: number;
    autoGradableQuestionCount: number;
    manualReviewQuestionCount: number;
    requiresManualReview: boolean;
};

export type CompleteSessionScoringContext = {
    assessmentSnapshot: AttemptAssessmentSnapshot;
    normalizedQuestions: ExamQuestion[];
    answerChecksum: string;
    scoreSnapshot: AttemptScoreSnapshot;
    summary: CompleteSessionSummary;
};

export type CompletedAttemptResult = {
    attempt_id: string;
    completed_at: Date | string;
    reusedExistingResult?: true;
};

export type PersistCompleteSessionArgs = {
    dbClient: DbClient;
    studentUserId: string;
    body: CompleteSessionBody;
    attemptContext: CompleteSessionAttemptContext;
    summary: CompleteSessionSummary;
    scoreSnapshot: AttemptScoreSnapshot;
    answerChecksum: string;
};

export type CompleteSessionNotificationArgs = {
    dbClient: DbClient;
    studentUserId: string;
    body: CompleteSessionBody;
    attemptContext: CompleteSessionAttemptContext;
    completedAttempt: CompletedAttemptResult;
    summary: CompleteSessionSummary;
};
