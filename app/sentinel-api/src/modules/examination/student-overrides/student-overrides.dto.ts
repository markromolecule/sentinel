import { z } from '@hono/zod-openapi';
import { Schema } from '@sentinel/shared';

export const studentExamAccessOverrideSchema = z
    .object(Schema.studentExamAccessOverrideSchema.shape)
    .openapi('StudentExamAccessOverride');

export const createStudentExamAccessOverrideSchema = {
    params: Schema.examIdParamsSchema,
    body: Schema.createStudentExamAccessOverrideBodySchema,
    response: z.object({
        message: z.string(),
        data: studentExamAccessOverrideSchema,
    }),
};

export const batchCreateStudentExamAccessOverrideSchema = {
    params: Schema.examIdParamsSchema,
    body: Schema.batchCreateStudentExamAccessOverrideBodySchema,
    response: z.object({
        message: z.string(),
        data: z.array(studentExamAccessOverrideSchema),
    }),
};

export const overrideReconnectLimitSchema = {
    params: Schema.examIdParamsSchema.extend({
        studentId: z.string().uuid(),
    }),
    body: z.object({
        reason: z.string().trim().max(1000).optional(),
    }),
    response: z.object({
        message: z.string(),
        data: studentExamAccessOverrideSchema,
    }),
};

export const authorizeStudentReentrySchema = {
    params: Schema.examIdParamsSchema.extend({
        studentId: z.string().uuid(),
    }),
    body: z.object({
        reason: z.string().trim().max(1000).optional(),
    }),
    response: z.object({
        message: z.string(),
        data: z.object({
            attemptId: z.string().nullable(),
            status: z.string(),
            reconnectAttemptCount: z.number(),
            reopenedUntil: z.string(),
        }),
    }),
};

export type StudentExamAccessOverride = z.infer<typeof studentExamAccessOverrideSchema>;
export type CreateStudentExamAccessOverrideBody = z.infer<
    typeof createStudentExamAccessOverrideSchema.body
>;
export type BatchCreateStudentExamAccessOverrideBody = z.infer<
    typeof batchCreateStudentExamAccessOverrideSchema.body
>;
export type OverrideReconnectLimitBody = z.infer<typeof overrideReconnectLimitSchema.body>;
export type AuthorizeStudentReentryBody = z.infer<typeof authorizeStudentReentrySchema.body>;
export type AuthorizeStudentReentryResponse = z.infer<
    typeof authorizeStudentReentrySchema.response
>;
