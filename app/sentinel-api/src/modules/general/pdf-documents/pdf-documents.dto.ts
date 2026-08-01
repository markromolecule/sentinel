import { z } from '@hono/zod-openapi';

export const documentKindEnum = z.enum([
    'ANALYTICS_OVERALL',
    'EXAM_ANSWER_KEY',
    'EXAM_RESULTS_REPORT',
]);
export const templateStatusEnum = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']);

// --- Header/Footer config schemas using hono zod-openapi ---
export const headerConfigSchema = z
    .object({
        logo_visible: z.boolean().default(true),
        logo_placement: z.enum(['LEFT', 'RIGHT', 'CENTER']).default('LEFT'),
        logo_max_size_px: z.number().min(10).max(500).default(120),
        title_text: z.string().max(255).default(''),
        title_alignment: z.enum(['LEFT', 'RIGHT', 'CENTER']).default('LEFT'),
        subtitle_text: z.string().max(255).optional().nullable(),
        subtitle_alignment: z.enum(['LEFT', 'RIGHT', 'CENTER']).default('LEFT'),
        divider_visible: z.boolean().default(true),
        divider_color: z
            .string()
            .regex(/^#[0-9A-Fa-f]{6}$/)
            .default('#D1D5DB'),
        accent_color: z
            .string()
            .regex(/^#[0-9A-Fa-f]{6}$/)
            .default('#3B82F6'),
        sentinel_logo_visible: z.boolean().default(true),
    })
    .openapi('HeaderConfig');

export const footerConfigSchema = z
    .object({
        text: z.string().max(255).default(''),
        confidentiality_label: z.string().max(100).optional().nullable(),
        divider_visible: z.boolean().default(true),
        divider_color: z
            .string()
            .regex(/^#[0-9A-Fa-f]{6}$/)
            .default('#E5E7EB'),
        page_number_visible: z.boolean().default(true),
        page_number_format: z.enum(['PAGE_X_OF_Y', 'SIMPLE_X', 'BRACKET_X']).default('PAGE_X_OF_Y'),
    })
    .openapi('FooterConfig');

// --- PDF Template DTO schemas ---
export const pdfTemplateSchema = z
    .object({
        template_id: z.string().uuid(),
        institution_id: z.string().uuid().nullable(),
        document_kind: documentKindEnum,
        version: z.number().int().positive(),
        status: templateStatusEnum,
        header_config: headerConfigSchema,
        footer_config: footerConfigSchema,
        created_by: z.string().uuid().nullable(),
        updated_by: z.string().uuid().nullable(),
        published_by: z.string().uuid().nullable(),
        created_at: z.string(),
        updated_at: z.string(),
        published_at: z.string().nullable(),
    })
    .openapi('PdfTemplate');

export const getPdfTemplatesQuerySchema = z.object({
    institutionId: z.string().uuid().optional().nullable(),
    documentKind: documentKindEnum.optional(),
    status: templateStatusEnum.optional(),
});

export const upsertPdfTemplateDraftBodySchema = z.object({
    institution_id: z.string().uuid().optional().nullable(),
    document_kind: documentKindEnum,
    header_config: headerConfigSchema,
    footer_config: footerConfigSchema,
});

// --- Branding DTO schemas ---
export const institutionPdfBrandingSchema = z
    .object({
        institution_id: z.string().uuid(),
        logo_storage_bucket: z.string(),
        logo_storage_path: z.string(),
        logo_mime_type: z.string(),
        logo_size_bytes: z.number(),
        logo_hash_sha256: z.string(),
        logo_original_name: z.string(),
        updated_by: z.string().uuid().nullable(),
        created_at: z.string(),
        updated_at: z.string(),
    })
    .openapi('InstitutionPdfBranding');

export const deleteOverrideQuerySchema = z.object({
    institutionId: z.string().uuid(),
    documentKind: documentKindEnum,
});

export const previewPdfTemplateBodySchema = z
    .object({
        document_kind: documentKindEnum,
        header_config: headerConfigSchema,
        footer_config: footerConfigSchema,
        institution_id: z.string().uuid().optional().nullable(),
    })
    .openapi('PreviewPdfTemplateBody');

// --- Answer Key Export DTO schemas ---

export const createAnswerKeyExportBodySchema = z
    .object({
        exam_id: z
            .string()
            .uuid()
            .openapi({ description: 'UUID of the exam to generate an answer key for' }),
        institution_id: z
            .string()
            .uuid()
            .openapi({ description: 'Institution that owns the exam' }),
        title: z
            .string()
            .min(1)
            .max(255)
            .optional()
            .openapi({ description: 'Optional label for the export record' }),
    })
    .openapi('CreateAnswerKeyExportBody');

export const answerKeyExportStatusEnum = z.enum(['PENDING', 'GENERATING', 'READY', 'FAILED']);

export const answerKeyExportRecordSchema = z
    .object({
        exportId: z.string().uuid(),
        examId: z.string().uuid(),
        institutionId: z.string().uuid(),
        templateId: z.string().uuid().nullable(),
        status: answerKeyExportStatusEnum,
        failureCode: z.string().nullable(),
        failureMessage: z.string().nullable(),
        retryCount: z.number().int(),
        storageBucket: z.string().nullable(),
        storagePath: z.string().nullable(),
        createdBy: z.string().uuid().nullable(),
        createdAt: z.string(),
        updatedAt: z.string(),
        completedAt: z.string().nullable(),
    })
    .openapi('AnswerKeyExportRecord');

export const listAnswerKeyExportsQuerySchema = z.object({
    examId: z.string().uuid().optional().openapi({ description: 'Filter exports by exam UUID' }),
    institutionId: z
        .string()
        .uuid()
        .optional()
        .openapi({ description: 'Filter exports by institution UUID' }),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    page: z.coerce.number().int().min(1).optional(),
});

export const answerKeyExportListResponseSchema = z.object({
    success: z.boolean(),
    data: z.object({
        records: z.array(answerKeyExportRecordSchema),
        total_records: z.number().int().nonnegative(),
        limit: z.number().int().positive(),
        page: z.number().int().positive(),
    }),
});

export const createAnswerKeyExportResponseSchema = z.object({
    success: z.boolean(),
    message: z.string(),
    data: answerKeyExportRecordSchema,
});

export type CreateAnswerKeyExportBody = z.infer<typeof createAnswerKeyExportBodySchema>;
export type AnswerKeyExportRecord = z.infer<typeof answerKeyExportRecordSchema>;

// --- Exam Results Report Export DTO schemas ---

export const createExamResultsReportExportBodySchema = z
    .object({
        exam_id: z
            .string()
            .uuid()
            .openapi({ description: 'UUID of the exam to generate a results report for' }),
        title: z
            .string()
            .min(1)
            .max(255)
            .optional()
            .openapi({ description: 'Optional label for the export record' }),
    })
    .openapi('CreateExamResultsReportExportBody');

export const examResultsReportExportStatusEnum = z.enum([
    'PENDING',
    'GENERATING',
    'READY',
    'FAILED',
    'EXPIRED',
]);

export const examResultsReportExportRecordSchema = z
    .object({
        exportId: z.string().uuid(),
        examId: z.string().uuid(),
        institutionId: z.string().uuid(),
        templateId: z.string().uuid().nullable(),
        status: examResultsReportExportStatusEnum,
        failureCode: z.string().nullable(),
        failureMessage: z.string().nullable(),
        retryCount: z.number().int(),
        createdBy: z.string().uuid().nullable(),
        createdAt: z.string(),
        updatedAt: z.string(),
        completedAt: z.string().nullable(),
        expiresAt: z.string().nullable(),
    })
    .openapi('ExamResultsReportExportRecord');

export const listExamResultsReportExportsQuerySchema = z.object({
    examId: z.string().uuid().optional().openapi({ description: 'Filter exports by exam UUID' }),
    institutionId: z
        .string()
        .uuid()
        .optional()
        .openapi({ description: 'Filter exports by institution UUID' }),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    page: z.coerce.number().int().min(1).optional(),
});

export const examResultsReportExportListResponseSchema = z.object({
    success: z.boolean(),
    data: z.object({
        records: z.array(examResultsReportExportRecordSchema),
        total_records: z.number().int().nonnegative(),
        limit: z.number().int().positive(),
        page: z.number().int().positive(),
    }),
});

export const createExamResultsReportExportResponseSchema = z.object({
    success: z.boolean(),
    message: z.string(),
    data: examResultsReportExportRecordSchema,
});

export type CreateExamResultsReportExportBody = z.infer<
    typeof createExamResultsReportExportBodySchema
>;
export type ExamResultsReportExportRecord = z.infer<typeof examResultsReportExportRecordSchema>;
