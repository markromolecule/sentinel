import { z } from 'zod';

/**
 * Supported PDF Document kinds.
 */
export const DocumentKindSchema = z.enum(['ANALYTICS_OVERALL', 'EXAM_ANSWER_KEY', 'EXAM_RESULTS_REPORT']);
export type DocumentKind = z.infer<typeof DocumentKindSchema>;

/**
 * Status of an asynchronous export job.
 */
export const LifecycleStatusSchema = z.enum([
    'PENDING',
    'GENERATING',
    'READY',
    'FAILED',
    'EXPIRED',
]);
export type LifecycleStatus = z.infer<typeof LifecycleStatusSchema>;

/**
 * Status of template definitions.
 */
export const TemplateStatusSchema = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']);
export type TemplateStatus = z.infer<typeof TemplateStatusSchema>;

/**
 * Scope options for template definitions.
 */
export const TemplateScopeSchema = z.enum(['GLOBAL', 'INSTITUTION']);
export type TemplateScope = z.infer<typeof TemplateScopeSchema>;

/**
 * Format options for page numbers in footer.
 */
export const PageNumberFormatSchema = z.enum(['PAGE_X_OF_Y', 'SIMPLE_X', 'BRACKET_X']);
export type PageNumberFormat = z.infer<typeof PageNumberFormatSchema>;

/**
 * Header Customization Configuration.
 */
export const HeaderConfigSchema = z
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
            .regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color')
            .default('#D1D5DB'),
        accent_color: z
            .string()
            .regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color')
            .default('#3B82F6'),
        sentinel_logo_visible: z.boolean().default(true),
    })
    .strict();
export type HeaderConfig = z.infer<typeof HeaderConfigSchema>;

/**
 * Footer Customization Configuration.
 */
export const FooterConfigSchema = z
    .object({
        text: z.string().max(255).default(''),
        confidentiality_label: z.string().max(100).optional().nullable(),
        divider_visible: z.boolean().default(true),
        divider_color: z
            .string()
            .regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color')
            .default('#E5E7EB'),
        page_number_visible: z.boolean().default(true),
        page_number_format: PageNumberFormatSchema.default('PAGE_X_OF_Y'),
    })
    .strict();
export type FooterConfig = z.infer<typeof FooterConfigSchema>;

/**
 * Main Template Schema.
 */
export const PdfTemplateSchema = z
    .object({
        template_id: z.string().uuid().optional(),
        institution_id: z.string().uuid().optional().nullable(),
        document_kind: DocumentKindSchema,
        version: z.number().int().positive().default(1),
        status: TemplateStatusSchema.default('DRAFT'),
        header_config: HeaderConfigSchema,
        footer_config: FooterConfigSchema,
        created_by: z.string().uuid().optional().nullable(),
        updated_by: z.string().uuid().optional().nullable(),
        published_by: z.string().uuid().optional().nullable(),
        created_at: z.string().optional(),
        updated_at: z.string().optional(),
        published_at: z.string().optional().nullable(),
    })
    .superRefine((data, ctx) => {
        if (data.document_kind === 'ANALYTICS_OVERALL') {
            if (data.header_config.sentinel_logo_visible !== true) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'Sentinel logo visibility must be true for analytics overall reports',
                    path: ['header_config', 'sentinel_logo_visible'],
                });
            }
        }
    });
export type PdfTemplate = z.infer<typeof PdfTemplateSchema>;

/**
 * Institution PDF Branding schema.
 */
export const InstitutionPdfBrandingSchema = z.object({
    institution_id: z.string().uuid(),
    logo_storage_bucket: z.string().max(100),
    logo_storage_path: z.string().max(255),
    logo_mime_type: z.string().max(100),
    logo_size_bytes: z.number().int().positive(),
    logo_hash_sha256: z.string().max(64),
    logo_original_name: z.string().max(255),
    updated_by: z.string().uuid().optional().nullable(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
});
export type InstitutionPdfBranding = z.infer<typeof InstitutionPdfBrandingSchema>;

/**
 * Report Period Schema.
 */
export const ReportPeriodSchema = z
    .object({
        preset: z
            .enum(['LAST_7_DAYS', 'LAST_30_DAYS', 'LAST_90_DAYS', 'CUSTOM'])
            .default('LAST_30_DAYS'),
        start_date: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be in YYYY-MM-DD format')
            .optional()
            .nullable(),
        end_date: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be in YYYY-MM-DD format')
            .optional()
            .nullable(),
    })
    .superRefine((data, ctx) => {
        if (data.preset === 'CUSTOM') {
            if (!data.start_date) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'Start date is required for custom period',
                    path: ['start_date'],
                });
            }
            if (!data.end_date) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'End date is required for custom period',
                    path: ['end_date'],
                });
            }
            if (data.start_date && data.end_date) {
                const start = new Date(data.start_date);
                const end = new Date(data.end_date);
                if (end < start) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: 'End date must be greater than or equal to start date',
                        path: ['end_date'],
                    });
                }
                const diffTime = end.getTime() - start.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays > 366) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: 'Date range cannot exceed 366 days',
                        path: ['end_date'],
                    });
                }
            }
        }
    });
export type ReportPeriod = z.infer<typeof ReportPeriodSchema>;

/**
 * Report PDF Generation Request.
 */
export const PdfReportGenerationRequestSchema = z.object({
    institutionId: z.string().uuid(),
    title: z.string().max(255),
    period: ReportPeriodSchema,
    timezone: z.literal('Asia/Manila').default('Asia/Manila'),
    format: z.literal('pdf').default('pdf'),
});
export type PdfReportGenerationRequest = z.infer<typeof PdfReportGenerationRequestSchema>;

/**
 * Answer Key Export Record Schema.
 */
export const ExamAnswerKeyExportSchema = z.object({
    export_id: z.string().uuid().optional(),
    exam_id: z.string().uuid(),
    institution_id: z.string().uuid(),
    template_id: z.string().uuid(),
    template_snapshot: z.record(z.string(), z.any()),
    storage_bucket: z.string().max(100).optional().nullable(),
    storage_path: z.string().max(255).optional().nullable(),
    status: LifecycleStatusSchema.default('PENDING'),
    failure_code: z.string().max(50).optional().nullable(),
    failure_message: z.string().optional().nullable(),
    retry_count: z.number().int().nonnegative().default(0),
    request_snapshot: z.record(z.string(), z.any()).optional().nullable(),
    created_by: z.string().uuid().optional().nullable(),
    started_at: z.string().optional().nullable(),
    completed_at: z.string().optional().nullable(),
    expires_at: z.string().optional().nullable(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
});
export type ExamAnswerKeyExport = z.infer<typeof ExamAnswerKeyExportSchema>;

/**
 * Lifecycle export record for an Examination Results Report PDF (client-facing).
 * Excludes raw storage coordinates and report-body/student data from client responses.
 */
export const ExamResultsReportExportSchema = z.object({
    export_id: z.string().uuid().optional(),
    exam_id: z.string().uuid(),
    institution_id: z.string().uuid(),
    template_id: z.string().uuid().optional().nullable(),
    template_snapshot: z.record(z.string(), z.any()).optional().nullable(),
    status: LifecycleStatusSchema.default('PENDING'),
    failure_code: z.string().max(50).optional().nullable(),
    failure_message: z.string().optional().nullable(),
    retry_count: z.number().int().nonnegative().default(0),
    request_snapshot: z.record(z.string(), z.any()).optional().nullable(),
    created_by: z.string().uuid().optional().nullable(),
    started_at: z.string().optional().nullable(),
    completed_at: z.string().optional().nullable(),
    expires_at: z.string().optional().nullable(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
});
export type ExamResultsReportExport = z.infer<typeof ExamResultsReportExportSchema>;
