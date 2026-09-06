import { z } from 'zod';
import { examAttemptAnswersSchema, examAttemptAnswerValueSchema } from './attempt-answer-schema';
import { attemptEssayRubricSnapshotSchema } from './attempt-snapshot-schema';

export const gradingStatusSchema = z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED']);
export const submissionStatusSchema = z.enum(['NOT_SUBMITTED', 'SUBMITTED', 'GRADED']);

export const gradingExamSchema = z.object({
    id: z.string().uuid(),
    title: z.string(),
    subject: z.string(),
    scheduledDate: z.string().nullable(),
    totalStudents: z.number().int().min(0),
    submittedCount: z.number().int().min(0),
    gradedCount: z.number().int().min(0),
    status: gradingStatusSchema,
    sectionIds: z.array(z.string().uuid()),
    sectionNames: z.array(z.string()),
});

export const gradingStudentSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    studentId: z.string(),
    sectionId: z.string().uuid().nullable(),
    sectionName: z.string().nullable(),
    submissionDate: z.string().nullable(),
    score: z.number().int().nullable(),
    maxScore: z.number().int().min(0),
    status: submissionStatusSchema,
    attemptId: z.string().uuid().nullable().optional(),
    feedback: z.string().optional(),
});

export const gradingStudentSectionSchema = z.object({
    sectionId: z.string().uuid().nullable(),
    sectionName: z.string().nullable(),
    totalStudents: z.number().int().min(0),
    submittedCount: z.number().int().min(0),
    gradedCount: z.number().int().min(0),
    students: z.array(gradingStudentSchema),
});

export const gradingStudentListSchema = z.object({
    students: z.array(gradingStudentSchema),
    sections: z.array(gradingStudentSectionSchema),
});

export type GradingExamType = z.infer<typeof gradingExamSchema>;
export type GradingStudentType = z.infer<typeof gradingStudentSchema>;
export type GradingStudentSectionType = z.infer<typeof gradingStudentSectionSchema>;
export type GradingStudentListType = z.infer<typeof gradingStudentListSchema>;

export const attemptGradingDetailSchema = z.object({
    attemptId: z.string().uuid(),
    examId: z.string().uuid().nullable(),
    examTitle: z.string(),
    subjectTitle: z.string(),
    studentId: z.string().uuid().nullable(),
    studentName: z.string(),
    studentNumber: z.string(),
    completedAt: z.string().nullable(),
    score: z.number().nullable(),
    totalScore: z.number().nullable(),
    initialScore: z.number().nullable(),
    status: z.string().nullable(),
    answers: examAttemptAnswersSchema,
    evaluations: z.record(z.string(), z.any()),
    rubric: attemptEssayRubricSnapshotSchema,
    feedback: z.string().nullable(),
    itemOverrides: z.record(
        z.string(),
        z.object({
            awardedScore: z.number().min(0),
            reason: z.string().nullable().optional(),
            overriddenBy: z.string().uuid().nullable().optional(),
            overriddenAt: z.string().nullable().optional(),
        }),
    ),
    grading: z.object({
        finalizedAt: z.string().nullable().optional(),
        finalizedBy: z.string().uuid().nullable().optional(),
    }),
    lifecycleState: z.string().nullable().optional(),
    scoreState: z.string().nullable().optional(),
    questionReports: z.array(
        z.object({
            questionId: z.string().uuid(),
            questionType: z.string(),
            prompt: z.string(),
            answer: examAttemptAnswerValueSchema,
            correctAnswer: examAttemptAnswerValueSchema.nullable(),
            isCorrect: z.boolean().nullable(),
            awardedScore: z.number().nullable(),
            maxScore: z.number(),
            evaluation: z.record(z.string(), z.any()).nullable(),
            override: z
                .object({
                    awardedScore: z.number().min(0),
                    reason: z.string().nullable().optional(),
                    overriddenBy: z.string().uuid().nullable().optional(),
                    overriddenAt: z.string().nullable().optional(),
                })
                .nullable(),
        }),
    ),
});

export const gradingQuestionSchema = z.object({
    id: z.string().uuid(),
    examId: z.string().uuid(),
    type: z.string(),
    sourceFileName: z.string().nullable().optional(),
    sourcePageNumber: z.number().int().nullable().optional(),
    sourceEvidence: z.string().nullable().optional(),
    passageContent: z.string().nullable().optional(),
    passageType: z.enum(['plain', 'html']).nullable().optional(),
    content: z.record(z.string(), z.any()),
    points: z.number(),
    orderIndex: z.number(),
});
export const updateGradingAttemptBodySchema = z.object({
    evaluations: z
        .record(
            z.string().uuid(),
            z.object({
                scores: z.record(z.string(), z.number().int().min(0).max(4)),
                feedback: z.string().optional().nullable(),
            }),
        )
        .optional(),
    itemOverrides: z
        .record(
            z.string().uuid(),
            z.object({
                awardedScore: z.number().min(0),
                reason: z.string().optional().nullable(),
            }),
        )
        .optional(),
    feedback: z.string().optional().nullable(),
    finalize: z.boolean().optional(),
});

export type AttemptGradingDetailType = z.infer<typeof attemptGradingDetailSchema>;
export type GradingQuestionType = z.infer<typeof gradingQuestionSchema>;
export type UpdateGradingAttemptBodyType = z.infer<typeof updateGradingAttemptBodySchema>;

