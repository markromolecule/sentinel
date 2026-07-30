import * as z from 'zod';
import { questionContentSchema, questionTypeSchema } from './assessment-schema';

export const questionTypeDefinitionSchema = z.object({
    value: questionTypeSchema,
    label: z.string(),
    description: z.string(),
    instruction: z.string(),
    defaultContent: questionContentSchema,
});

export const questionTypeParamsSchema = z.object({
    type: questionTypeSchema,
});

export const validateQuestionTypeContentBodySchema = z.object({
    content: questionContentSchema,
});

export const questionTypeValidationResultSchema = z.object({
    type: questionTypeSchema,
    content: questionContentSchema,
});
