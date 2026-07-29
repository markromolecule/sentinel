import { z } from 'zod';
import { examConfigurationSchema, examSettingsSchema } from './assessment-schema';
import { examQuestionSchema } from './exam-schema';
import { essayQuestionEvaluationSchema } from './assessment-schema';
import { examAttemptAnswerValueSchema } from './attempt-answer-schema';

export const ATTEMPT_ASSESSMENT_SNAPSHOT_VERSION = 'attempt-assessment.v1' as const;
export const ATTEMPT_SCORE_SNAPSHOT_VERSION = 'attempt-score.v1' as const;

const attemptSnapshotQuestionSchema = examQuestionSchema.extend({
    id: z.string(),
    examId: z.string(),
});

export const attemptAssessmentSnapshotSchema = z.object({
    version: z.literal(ATTEMPT_ASSESSMENT_SNAPSHOT_VERSION),
    attemptId: z.string(),
    examId: z.string(),
    seed: z.string().min(1),
    settings: examSettingsSchema,
    configuration: examConfigurationSchema,
    questions: z.array(attemptSnapshotQuestionSchema),
    totalScore: z.number().int().min(0),
});

export const attemptItemOverrideSchema = z.object({
    awardedScore: z.number().min(0),
    reason: z.string().nullable().optional(),
    overriddenBy: z.string().nullable().optional(),
    overriddenAt: z.string().nullable().optional(),
});

export const attemptQuestionReportSnapshotSchema = z.object({
    questionId: z.string(),
    questionType: z.string(),
    prompt: z.string().optional(),
    submittedAnswer: examAttemptAnswerValueSchema.optional(),
    displayAnswer: examAttemptAnswerValueSchema.optional(),
    answer: examAttemptAnswerValueSchema.optional(),
    correctAnswer: examAttemptAnswerValueSchema.nullable(),
    isCorrect: z.boolean().nullable(),
    objectiveAwardedScore: z.number().nullable().optional(),
    awardedScore: z.number().nullable(),
    maxScore: z.number(),
    manualReviewState: z.enum(['NOT_REQUIRED', 'PENDING_REVIEW', 'REVIEWED']).optional(),
    scoringVersion: z.string().min(1).optional(),
    evaluation: essayQuestionEvaluationSchema.nullable(),
    override: attemptItemOverrideSchema.nullable(),
});

export const attemptScoreSnapshotSchema = z.object({
    version: z.literal(ATTEMPT_SCORE_SNAPSHOT_VERSION),
    scoringVersion: z.string().min(1),
    generatedAt: z.string(),
    answerChecksum: z.string().min(1).optional(),
    score: z.number().int().min(0),
    totalScore: z.number().int().min(0),
    percentage: z.number().int().min(0).max(100).nullable(),
    answeredCount: z.number().int().min(0),
    autoGradableQuestionCount: z.number().int().min(0),
    manualReviewQuestionCount: z.number().int().min(0),
    requiresManualReview: z.boolean(),
    questionReports: z.array(attemptQuestionReportSnapshotSchema),
});

export type AttemptAssessmentSnapshot = z.infer<typeof attemptAssessmentSnapshotSchema>;
export type AttemptItemOverrideSnapshot = z.infer<typeof attemptItemOverrideSchema>;
export type AttemptQuestionReportSnapshot = z.infer<typeof attemptQuestionReportSnapshotSchema>;
export type AttemptScoreSnapshot = z.infer<typeof attemptScoreSnapshotSchema>;
