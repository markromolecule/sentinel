import { z } from '@hono/zod-openapi';
import { Schema } from '@sentinel/shared';

export const essayRubricDefinitionSchema = z
    .object(Schema.essayRubricDefinitionSchema.shape)
    .openapi('EssayRubricDefinition');
export const essayRubricSourceSchema = Schema.essayRubricSourceSchema;

export const resolvedEssayRubricSchema = z
    .object({
        rubricVersionId: z.string().uuid().nullable(),
        versionNumber: z.number().int().positive().nullable(),
        source: essayRubricSourceSchema,
        definition: essayRubricDefinitionSchema,
        canOverride: z.boolean().optional(),
    })
    .openapi('ResolvedEssayRubric');

export const getEffectiveEssayRubricSchema = {
    params: z.object({
        examId: z.string().uuid(),
    }),
    response: z.object({
        message: z.string(),
        data: resolvedEssayRubricSchema,
    }),
};

export const updateExamEssayRubricSchema = {
    params: z.object({
        examId: z.string().uuid(),
    }),
    body: Schema.updateExamEssayRubricSchema,
    response: z.object({
        message: z.string(),
        data: z.object({
            rubricVersionId: z.string().uuid(),
            versionNumber: z.number().int().positive(),
            scope: z.string(),
            definition: essayRubricDefinitionSchema,
        }),
    }),
};

export const resetExamEssayRubricSchema = {
    params: z.object({
        examId: z.string().uuid(),
    }),
    response: z.object({
        message: z.string(),
        data: resolvedEssayRubricSchema,
    }),
};

export const getBaselineEssayRubricSchema = {
    response: z.object({
        message: z.string(),
        data: resolvedEssayRubricSchema,
    }),
};

export const updateBaselineEssayRubricSchema = {
    body: Schema.updateExamEssayRubricSchema,
    response: z.object({
        message: z.string(),
        data: z.object({
            rubricVersionId: z.string().uuid(),
            versionNumber: z.number().int().positive(),
            scope: z.string(),
            definition: essayRubricDefinitionSchema,
        }),
    }),
};

export type ResolvedEssayRubric = z.infer<typeof resolvedEssayRubricSchema>;
export type UpdateExamEssayRubricBody = z.infer<typeof updateExamEssayRubricSchema.body>;
export type UpdateExamEssayRubricParams = z.infer<typeof updateExamEssayRubricSchema.params>;
