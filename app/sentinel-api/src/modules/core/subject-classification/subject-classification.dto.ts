import { z } from '@hono/zod-openapi';
import { Schema } from '@sentinel/shared';
import { inheritanceSchemaObject } from '../inheritance/inheritance.dto';
import { paginationQuerySchema, paginationMetadataSchema } from '../../../lib/pagination';

const { subjectClassificationFormSchema, subjectClassificationTypeSchema } = Schema;

export const subjectClassificationSubjectSchemaOpenApi = z
    .object({
        id: z.string().uuid(),
        code: z.string().max(50).openapi({ example: 'CS101' }),
        title: z.string().max(255).openapi({ example: 'Introduction to Computing' }),
    })
    .openapi('SubjectClassificationSubject');

export const subjectClassificationSummarySchemaOpenApi = z
    .object({
        id: z.string().uuid(),
        name: z.string().max(120).openapi({ example: 'General Subjects' }),
        type: subjectClassificationTypeSchema.openapi({ example: 'GENERAL' }),
    })
    .openapi('SubjectClassificationSummary');

export const subjectClassificationSchemaOpenApi = z
    .object({
        id: z.string().uuid(),
        name: z.string().max(120).openapi({ example: 'General Subjects' }),
        type: subjectClassificationTypeSchema.openapi({ example: 'GENERAL' }),
        description: z.string().nullable().openapi({
            example: 'Shared subjects for all departments and courses.',
        }),
        subject_count: z.number().int().min(0),
        subjects: z.array(subjectClassificationSubjectSchemaOpenApi),
        department_id: z.string().uuid().nullable(),
        course_ids: z.array(z.string().uuid()).default([]),
        year_levels: z.array(z.number().int().min(1).max(6)).default([]),
        institution_id: z.string().uuid().nullable(),
        created_at: z.union([z.coerce.date(), z.string()]).nullable(),
        updated_at: z.union([z.coerce.date(), z.string()]).nullable(),
        created_by: z.string().nullable(),
        updated_by: z.string().nullable(),
        ...inheritanceSchemaObject,
    })
    .openapi('SubjectClassification');

export const getSubjectClassificationsSchema = {
    request: {
        query: z
            .object({
                search: z.string().optional().openapi({ description: 'Search term' }),
                institutionId: z
                    .string()
                    .uuid()
                    .optional()
                    .openapi({ description: 'Institution ID' }),
            })
            .merge(paginationQuerySchema),
    },
    response: z.object({
        message: z.string(),
        data: z.array(subjectClassificationSchemaOpenApi),
        pagination: paginationMetadataSchema.optional(),
    }),
};

export const getSubjectClassificationSchema = {
    request: {
        query: z.object({
            institutionId: z
                .string()
                .uuid()
                .optional()
                .openapi({ description: 'Institution ID override for support scope' }),
        }),
        params: z.object({
            id: z.string().uuid('Invalid subject classification ID format'),
        }),
    },
    response: z.object({
        message: z.string(),
        data: subjectClassificationSchemaOpenApi,
    }),
};

export const createSubjectClassificationSchema = {
    body: subjectClassificationFormSchema,
    response: z.object({
        message: z.string(),
        data: subjectClassificationSchemaOpenApi,
    }),
};

export const updateSubjectClassificationSchema = {
    params: z.object({
        id: z.string().uuid('Invalid subject classification ID format'),
    }),
    body: subjectClassificationFormSchema,
    response: z.object({
        message: z.string(),
        data: subjectClassificationSchemaOpenApi,
    }),
};

export const deleteSubjectClassificationSchema = {
    params: z.object({
        id: z.string().uuid('Invalid subject classification ID format'),
    }),
    query: z.object({
        institutionId: z
            .string()
            .uuid()
            .optional()
            .openapi({ description: 'Institution ID override for support scope' }),
    }),
    response: z.object({
        message: z.string(),
        data: z.null(),
    }),
};
