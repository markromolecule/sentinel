import { z } from '@hono/zod-openapi';
import { Schema } from '@sentinel/shared';
import { subjectClassificationSummarySchemaOpenApi } from '../subject-classification/subject-classification.dto';

const {
    classificationSubjectOfferingFormSchema: classificationSubjectOfferingBodySchema,
    subjectOfferingFormSchema: subjectOfferingBodySchema,
    subjectOfferingUpdateFormSchema: subjectOfferingUpdateBodySchema,
} = Schema;

const subjectOfferingDepartmentSchemaOpenApi = z.object({
    id: z.string().uuid(),
    code: z.string().nullable().optional(),
    name: z.string(),
});

const subjectOfferingCourseSchemaOpenApi = z.object({
    id: z.string().uuid(),
    code: z.string().nullable().optional(),
    title: z.string(),
});

const subjectOfferingSectionSchemaOpenApi = z.object({
    id: z.string().uuid(),
    name: z.string(),
    department_id: z.string().uuid().nullable().optional(),
    course_id: z.string().uuid().nullable().optional(),
    year_level: z.number().int().nullable().optional(),
});

const subjectOfferingInstructorSchemaOpenApi = z.object({
    id: z.string().uuid(),
    firstName: z.string().nullable().optional(),
    lastName: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
});

export const subjectOfferingSchemaOpenApi = z
    .object({
        subject_offering_id: z.string().uuid(),
        subject_id: z.string().uuid(),
        subject_code: z.string().max(50).openapi({ example: 'INF231' }),
        subject_title: z.string().max(255).openapi({ example: 'Introduction to Computing' }),
        term_id: z.string().uuid(),
        term_academic_year: z.string().openapi({ example: '2026-2027' }),
        term_semester: z.string().openapi({ example: '1st Semester' }),
        term_start_date: z.union([z.coerce.date(), z.string()]).nullable(),
        term_end_date: z.union([z.coerce.date(), z.string()]).nullable(),
        status: z.enum(['DRAFT', 'OPEN', 'CLOSED', 'ARCHIVED']),
        department_ids: z.array(z.string().uuid()),
        course_ids: z.array(z.string().uuid()),
        section_ids: z.array(z.string().uuid()),
        year_levels: z.array(z.number().int()),
        departments: z.array(subjectOfferingDepartmentSchemaOpenApi),
        courses: z.array(subjectOfferingCourseSchemaOpenApi),
        sections: z.array(subjectOfferingSectionSchemaOpenApi),
        classifications: z.array(subjectClassificationSummarySchemaOpenApi),
        is_multi_department: z.boolean().optional(),
        created_at: z.union([z.coerce.date(), z.string()]).nullable(),
        updated_at: z.union([z.coerce.date(), z.string()]).nullable(),
        created_by: z.string().nullable(),
        updated_by: z.string().nullable(),
        source_record_id: z.string().uuid().nullable().optional(),
        inheritance_status: z.string().optional(),
        origin_institution_id: z.string().uuid().nullable().optional(),
        effective_institution_id: z.string().uuid().nullable().optional(),
        is_local: z.boolean().optional(),
        is_inherited: z.boolean().optional(),
        is_overridden: z.boolean().optional(),
        is_hidden: z.boolean().optional(),
        instructors: z.array(subjectOfferingInstructorSchemaOpenApi).optional(),
    })
    .openapi('SubjectOffering');

export const getSubjectOfferingsSchema = {
    request: {
        query: z.object({
            search: z.string().optional().openapi({ description: 'Search term' }),
            subject_id: z.string().uuid().optional(),
            term_id: z.string().uuid().optional(),
            institutionId: z.string().uuid().optional(),
            visibility: z.enum(['default', 'requestable']).optional(),
            page: z.coerce.number().int().min(1).optional().openapi({
                description: 'Page index to fetch.',
                example: 1,
            }),
            limit: z.coerce.number().int().min(1).max(100).optional().openapi({
                description: 'Number of items per page.',
                example: 10,
            }),
        }),
    },
    response: z.object({
        message: z.string(),
        data: z.array(subjectOfferingSchemaOpenApi),
        pagination: z
            .object({
                page: z.number().int(),
                limit: z.number().int(),
                total: z.number().int(),
                hasMore: z.boolean(),
            })
            .optional(),
    }),
};

export const createSubjectOfferingSchema = {
    body: subjectOfferingBodySchema,
    response: z.object({
        message: z.string(),
        data: subjectOfferingSchemaOpenApi,
    }),
};

const skippedSubjectOfferingSchemaOpenApi = z.object({
    subject_id: z.string().uuid(),
    subject_code: z.string().max(50),
    subject_title: z.string().max(255),
    existing_subject_offering_id: z.string().uuid(),
    reason: z.enum(['already_offered']),
});

export const createSubjectOfferingsFromClassificationSchema = {
    body: classificationSubjectOfferingBodySchema,
    response: z.object({
        message: z.string(),
        data: z.object({
            classification_id: z.string().uuid(),
            classification_name: z.string(),
            term_id: z.string().uuid(),
            created_count: z.number().int().min(0),
            skipped_count: z.number().int().min(0),
            total_subject_count: z.number().int().min(0),
            duplicate_strategy: z.enum(['skip_existing', 'fail_existing']),
            created: z.array(subjectOfferingSchemaOpenApi),
            skipped: z.array(skippedSubjectOfferingSchemaOpenApi),
        }),
    }),
};

export const updateSubjectOfferingSchema = {
    params: z.object({
        id: z.string().uuid('Invalid subject offering ID format'),
    }),
    body: subjectOfferingUpdateBodySchema,
    response: z.object({
        message: z.string(),
        data: subjectOfferingSchemaOpenApi,
    }),
};

export const deleteSubjectOfferingSchema = {
    params: z.object({
        id: z.string().uuid('Invalid subject offering ID format'),
    }),
    response: z.object({
        message: z.string(),
        data: z.null(),
    }),
};

// Bulk Delete Subject Offerings Operation
export const deleteSubjectOfferingsSchema = {
    body: z.object({
        ids: z.array(z.string().uuid()).min(1),
        institutionId: z.string().uuid().optional(),
    }),
    response: z.object({
        message: z.string(),
        data: z.null(),
    }),
};

export const getSubjectOfferingByIdSchema = {
    params: z.object({
        id: z.string().uuid('Invalid subject offering ID format'),
    }),
    response: z.object({
        message: z.string(),
        data: subjectOfferingSchemaOpenApi,
    }),
};

export type DeleteSubjectOfferingsBody = z.infer<typeof deleteSubjectOfferingsSchema.body>;
export type DeleteSubjectOfferingsResponse = z.infer<typeof deleteSubjectOfferingsSchema.response>;
