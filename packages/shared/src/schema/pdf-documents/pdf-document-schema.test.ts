import { describe, expect, it } from 'vitest';
import {
    PdfTemplateSchema,
    ReportPeriodSchema,
    PdfReportGenerationRequestSchema,
    ExamResultsReportExportSchema,
} from './pdf-document-schema';

describe('PdfTemplateSchema', () => {
    const validHeader = {
        logo_visible: true,
        logo_placement: 'LEFT' as const,
        logo_max_size_px: 120,
        title_text: 'Test Title',
        title_alignment: 'LEFT' as const,
        divider_visible: true,
        divider_color: '#D1D5DB',
        accent_color: '#3B82F6',
        sentinel_logo_visible: true,
    };

    const validFooter = {
        text: 'Test Footer',
        confidentiality_label: 'CONFIDENTIAL',
        divider_visible: true,
        divider_color: '#E5E7EB',
        page_number_visible: true,
        page_number_format: 'PAGE_X_OF_Y' as const,
    };

    it('should validate a correct global template', () => {
        const result = PdfTemplateSchema.safeParse({
            document_kind: 'ANALYTICS_OVERALL',
            status: 'PUBLISHED',
            header_config: validHeader,
            footer_config: validFooter,
        });

        expect(result.success).toBe(true);
    });

    it('should validate a correct institution template', () => {
        const result = PdfTemplateSchema.safeParse({
            institution_id: '12345678-1234-4234-8234-1234567890ab',
            document_kind: 'EXAM_ANSWER_KEY',
            status: 'DRAFT',
            header_config: {
                ...validHeader,
                sentinel_logo_visible: false, // allowed for exam answer keys
            },
            footer_config: validFooter,
        });

        expect(result.success).toBe(true);
    });

    it('should reject invalid hex colors in header config', () => {
        const result = PdfTemplateSchema.safeParse({
            document_kind: 'ANALYTICS_OVERALL',
            header_config: {
                ...validHeader,
                accent_color: 'invalid-hex',
            },
            footer_config: validFooter,
        });

        expect(result.success).toBe(false);
    });

    it('should reject when sentinel_logo_visible is false for ANALYTICS_OVERALL', () => {
        const result = PdfTemplateSchema.safeParse({
            document_kind: 'ANALYTICS_OVERALL',
            header_config: {
                ...validHeader,
                sentinel_logo_visible: false,
            },
            footer_config: validFooter,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0].message).toContain(
                'Sentinel logo visibility must be true',
            );
        }
    });

    it('should reject extra properties due to strict validation', () => {
        const result = PdfTemplateSchema.safeParse({
            document_kind: 'ANALYTICS_OVERALL',
            header_config: {
                ...validHeader,
                extra_field: 'not-allowed',
            },
            footer_config: validFooter,
        });

        expect(result.success).toBe(false);
    });
});

describe('ReportPeriodSchema', () => {
    it('should validate non-custom presets without dates', () => {
        const result = ReportPeriodSchema.safeParse({
            preset: 'LAST_30_DAYS',
        });
        expect(result.success).toBe(true);
    });

    it('should require dates for custom period', () => {
        const result = ReportPeriodSchema.safeParse({
            preset: 'CUSTOM',
        });
        expect(result.success).toBe(false);
    });

    it('should reject reversed dates', () => {
        const result = ReportPeriodSchema.safeParse({
            preset: 'CUSTOM',
            start_date: '2026-07-15',
            end_date: '2026-07-01',
        });
        expect(result.success).toBe(false);
    });

    it('should reject ranges exceeding 366 days', () => {
        const result = ReportPeriodSchema.safeParse({
            preset: 'CUSTOM',
            start_date: '2025-01-01',
            end_date: '2026-02-01', // 396 days
        });
        expect(result.success).toBe(false);
    });

    it('should validate a valid range under 366 days', () => {
        const result = ReportPeriodSchema.safeParse({
            preset: 'CUSTOM',
            start_date: '2026-01-01',
            end_date: '2026-12-31', // 364 days
        });
        expect(result.success).toBe(true);
    });
});

describe('PdfReportGenerationRequestSchema', () => {
    it('should validate correct generation payload', () => {
        const result = PdfReportGenerationRequestSchema.safeParse({
            institutionId: '12345678-1234-4234-8234-1234567890ab',
            title: 'Q2 Report',
            period: {
                preset: 'LAST_30_DAYS',
            },
            timezone: 'Asia/Manila',
            format: 'pdf',
        });
        expect(result.success).toBe(true);
    });

    it('should reject format other than pdf', () => {
        const result = PdfReportGenerationRequestSchema.safeParse({
            institutionId: '12345678-1234-4234-8234-1234567890ab',
            title: 'Q2 Report',
            period: {
                preset: 'LAST_30_DAYS',
            },
            timezone: 'Asia/Manila',
            format: 'csv',
        });
        expect(result.success).toBe(false);
    });
});

describe('ExamResultsReportExportSchema', () => {
    const validHeader = {
        logo_visible: true,
        logo_placement: 'LEFT' as const,
        logo_max_size_px: 120,
        title_text: 'Test Title',
        title_alignment: 'LEFT' as const,
        divider_visible: true,
        divider_color: '#D1D5DB',
        accent_color: '#3B82F6',
        sentinel_logo_visible: false, // Allowed for exam results reports
    };

    const validFooter = {
        text: 'Test Footer',
        confidentiality_label: 'CONFIDENTIAL',
        divider_visible: true,
        divider_color: '#E5E7EB',
        page_number_visible: true,
        page_number_format: 'PAGE_X_OF_Y' as const,
    };

    it('should validate a correct EXAM_RESULTS_REPORT template with sentinel_logo_visible false', () => {
        const result = PdfTemplateSchema.safeParse({
            document_kind: 'EXAM_RESULTS_REPORT',
            status: 'PUBLISHED',
            header_config: {
                ...validHeader,
                sentinel_logo_visible: false,
            },
            footer_config: validFooter,
        });
        expect(result.success).toBe(true);
    });

    it('should validate a correct ExamResultsReportExport record', () => {
        const result = ExamResultsReportExportSchema.safeParse({
            export_id: '12345678-1234-4234-8234-1234567890ab',
            exam_id: '12345678-1234-4234-8234-1234567890ac',
            institution_id: '12345678-1234-4234-8234-1234567890ad',
            status: 'PENDING',
            retry_count: 0,
        });
        expect(result.success).toBe(true);
    });

    it('should reject invalid lifecycle status', () => {
        const result = ExamResultsReportExportSchema.safeParse({
            exam_id: '12345678-1234-4234-8234-1234567890ac',
            institution_id: '12345678-1234-4234-8234-1234567890ad',
            status: 'INVALID_STATUS',
        });
        expect(result.success).toBe(false);
    });
});
