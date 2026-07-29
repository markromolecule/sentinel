import { z } from 'zod';

export const examAttemptPrimitiveAnswerSchema = z.union([z.string(), z.number(), z.boolean()]);

export const examAttemptChoiceAnswerSchema = z.union([
    z.array(z.string()),
    z.array(z.number()),
]);

export const examAttemptMatchingAnswerSchema = z.record(z.string(), z.string());

export const examAttemptAnswerValueSchema = z.union([
    examAttemptPrimitiveAnswerSchema,
    examAttemptChoiceAnswerSchema,
    examAttemptMatchingAnswerSchema,
    z.null(),
]);

export const examAttemptAnswersSchema = z.record(z.string(), examAttemptAnswerValueSchema);

export type ExamAttemptAnswerValueInput = z.infer<typeof examAttemptAnswerValueSchema>;
export type ExamAttemptAnswersInput = z.infer<typeof examAttemptAnswersSchema>;
