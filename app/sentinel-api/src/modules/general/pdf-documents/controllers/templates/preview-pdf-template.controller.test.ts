import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OpenAPIHono } from '@hono/zod-openapi';
import {
    previewPdfTemplateHandler,
    previewPdfTemplateRoute,
} from './preview-pdf-template.controller';

const INST_UUID = '123e4567-e89b-12d3-a456-426614174000';
const PARENT_UUID = '123e4567-e89b-12d3-a456-426614174001';
const OTHER_UUID = '123e4567-e89b-12d3-a456-426614174002';
const USER_UUID = '123e4567-e89b-12d3-a456-426614174003';
const EXAM_A_UUID = '123e4567-e89b-12d3-a456-426614174010';
const EXAM_B_UUID = '123e4567-e89b-12d3-a456-426614174011';

const mockRenderAnalyticsOverallPdf = vi.fn();
const mockRenderExamAnswerKeyPdf = vi.fn();
const mockRenderExamResultsReportPdf = vi.fn();
const mockGetBranding = vi.fn();
const mockDownloadBrandingLogo = vi.fn();
const mockGetAnswerKeySource = vi.fn();
const mockMapAnswerKeySourceToViewModel = vi.fn();

vi.mock('../../rendering/analytics-overall-renderer', () => ({
    renderAnalyticsOverallPdf: (...args: any[]) => mockRenderAnalyticsOverallPdf(...args),
}));

vi.mock('../../rendering/exam-answer-key-renderer', () => ({
    renderExamAnswerKeyPdf: (...args: any[]) => mockRenderExamAnswerKeyPdf(...args),
}));

vi.mock('../../rendering/exam-results-report-renderer', () => ({
    renderExamResultsReportPdf: (...args: any[]) => mockRenderExamResultsReportPdf(...args),
}));

vi.mock('../../data/answer-keys/get-answer-key-source', () => ({
    getAnswerKeySource: (...args: any[]) => mockGetAnswerKeySource(...args),
    mapAnswerKeySourceToViewModel: (...args: any[]) => mockMapAnswerKeySourceToViewModel(...args),
}));

vi.mock('../../services/institution-branding.service', () => ({
    InstitutionBrandingService: {
        getBranding: (...args: any[]) => mockGetBranding(...args),
        downloadBrandingLogo: (...args: any[]) => mockDownloadBrandingLogo(...args),
    },
}));

describe('previewPdfTemplateHandler', () => {
    let mockDb: any;

    beforeEach(() => {
        vi.clearAllMocks();

        mockDb = {
            selectFrom: vi.fn((table: string) => {
                if (table === 'institutions') {
                    return {
                        select: vi.fn((fields: string[]) => ({
                            where: vi.fn((_column: string, _op: string, value: string) => ({
                                executeTakeFirst: vi.fn().mockResolvedValue(
                                    value === OTHER_UUID
                                        ? { id: OTHER_UUID, institution_kind: 'CHILD' }
                                        : value === PARENT_UUID
                                          ? { id: PARENT_UUID, institution_kind: 'PARENT' }
                                          : value === INST_UUID
                                            ? {
                                                  id: INST_UUID,
                                                  institution_kind: 'CHILD',
                                                  parent_institution_id: PARENT_UUID,
                                              }
                                            : undefined,
                                ),
                                execute: vi
                                    .fn()
                                    .mockResolvedValue(
                                        value === PARENT_UUID ? [{ id: INST_UUID }] : [],
                                    ),
                            })),
                        })),
                    };
                }

                if (table === 'exams') {
                    return {
                        select: vi.fn(() => ({
                            where: vi.fn((_column: string, _op: string, value: string) => ({
                                executeTakeFirst: vi.fn().mockResolvedValue(
                                    value === EXAM_A_UUID || value === EXAM_B_UUID
                                        ? {
                                              exam_id: value,
                                              institution_id:
                                                  value === EXAM_A_UUID ? INST_UUID : OTHER_UUID,
                                          }
                                        : undefined,
                                ),
                            })),
                        })),
                    };
                }

                throw new Error(`Unexpected table ${table}`);
            }),
        };

        mockRenderAnalyticsOverallPdf.mockResolvedValue(Buffer.from('analytics-pdf'));
        mockRenderExamAnswerKeyPdf.mockResolvedValue(Buffer.from('answer-key-pdf'));
        mockRenderExamResultsReportPdf.mockResolvedValue(Buffer.from('exam-results-pdf'));
        mockGetBranding.mockResolvedValue(null);
        mockDownloadBrandingLogo.mockResolvedValue(Buffer.from('logo'));
        mockGetAnswerKeySource.mockImplementation(
            async (_dbClient: any, examId: string, institutionId: string) => ({
                examId,
                institutionId,
                examTitle: examId === EXAM_A_UUID ? 'Exam A' : 'Exam B',
                subjectCode: 'CS-101',
                subjectName: 'Computer Science',
                durationMinutes: 60,
                difficulty: 'MEDIUM',
                passingScore: 75,
                institutionName: 'Test University',
                questions: [
                    {
                        questionId: `${examId}-q1`,
                        type: 'SHORT_ANSWER',
                        points: 1,
                        text: examId === EXAM_A_UUID ? 'A question' : 'B question',
                        shortAnswerPattern: examId === EXAM_A_UUID ? 'A answer' : 'B answer',
                    },
                ],
            }),
        );
        mockMapAnswerKeySourceToViewModel.mockImplementation(
            (source: any, generatedBy: string) => ({
                examId: source.examId,
                title: source.examTitle,
                subjectCode: source.subjectCode,
                subjectName: source.subjectName,
                durationMinutes: source.durationMinutes,
                difficulty: source.difficulty,
                passingScore: source.passingScore,
                generatedAt: '2026-08-01T00:00:00.000Z',
                generatedBy,
                institutionName: source.institutionName,
                questions: source.questions,
            }),
        );
    });

    function createApp(
        permissions: string[],
        institutionId: string | null = null,
        email = 'support@example.com',
    ) {
        const app = new OpenAPIHono();
        app.use('*', async (c, next) => {
            c.set('dbClient', mockDb);
            c.set('user', { id: USER_UUID, email, role: 'support' });
            c.set('activePermissionKeys', permissions);
            c.set('institutionId', institutionId);
            await next();
        });
        app.openapi(previewPdfTemplateRoute, previewPdfTemplateHandler);
        return app;
    }

    it('rejects preview without template permissions', async () => {
        const app = createApp([]);

        const res = await app.request('/templates/preview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                institution_id: null,
                document_kind: 'EXAM_RESULTS_REPORT',
                header_config: {
                    logo_visible: true,
                    logo_placement: 'LEFT',
                    logo_max_size_px: 120,
                    title_text: 'Title',
                    title_alignment: 'LEFT',
                    subtitle_text: 'Subtitle',
                    subtitle_alignment: 'LEFT',
                    divider_visible: true,
                    divider_color: '#D1D5DB',
                    accent_color: '#3B82F6',
                    sentinel_logo_visible: true,
                },
                footer_config: {
                    text: 'Footer',
                    confidentiality_label: 'Sample',
                    divider_visible: true,
                    divider_color: '#E5E7EB',
                    page_number_visible: true,
                    page_number_format: 'PAGE_X_OF_Y',
                },
            }),
        });

        expect(res.status).toBe(403);
    });

    it('rejects answer-key preview with template-only permission', async () => {
        const app = createApp(['pdf_templates:view']);

        const res = await app.request('/templates/preview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                institution_id: INST_UUID,
                exam_id: EXAM_A_UUID,
                document_kind: 'EXAM_ANSWER_KEY',
                header_config: {
                    logo_visible: true,
                    logo_placement: 'LEFT',
                    logo_max_size_px: 120,
                    title_text: 'Title',
                    title_alignment: 'LEFT',
                    subtitle_text: 'Subtitle',
                    subtitle_alignment: 'LEFT',
                    divider_visible: true,
                    divider_color: '#D1D5DB',
                    accent_color: '#3B82F6',
                    sentinel_logo_visible: true,
                },
                footer_config: {
                    text: 'Footer',
                    confidentiality_label: 'Restricted',
                    divider_visible: true,
                    divider_color: '#E5E7EB',
                    page_number_visible: true,
                    page_number_format: 'PAGE_X_OF_Y',
                },
            }),
        });

        expect(res.status).toBe(403);
        expect(mockGetAnswerKeySource).not.toHaveBeenCalled();
    });

    it('rejects answer-key preview with answer-key-only permission', async () => {
        const app = createApp(['examinations:export_answer_key']);

        const res = await app.request('/templates/preview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                institution_id: INST_UUID,
                document_kind: 'EXAM_ANSWER_KEY',
                header_config: {
                    logo_visible: true,
                    logo_placement: 'LEFT',
                    logo_max_size_px: 120,
                    title_text: 'Title',
                    title_alignment: 'LEFT',
                    subtitle_text: 'Subtitle',
                    subtitle_alignment: 'LEFT',
                    divider_visible: true,
                    divider_color: '#D1D5DB',
                    accent_color: '#3B82F6',
                    sentinel_logo_visible: true,
                },
                footer_config: {
                    text: 'Footer',
                    confidentiality_label: 'Restricted',
                    divider_visible: true,
                    divider_color: '#E5E7EB',
                    page_number_visible: true,
                    page_number_format: 'PAGE_X_OF_Y',
                },
            }),
        });

        expect(res.status).toBe(403);
    });

    it('renders selected exam answer-key content with both permissions and unsaved configs', async () => {
        const app = createApp(['pdf_templates:view', 'examinations:export_answer_key']);

        const res = await app.request('/templates/preview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                institution_id: INST_UUID,
                exam_id: EXAM_A_UUID,
                document_kind: 'EXAM_ANSWER_KEY',
                header_config: {
                    logo_visible: false,
                    logo_placement: 'RIGHT',
                    logo_max_size_px: 88,
                    title_text: 'Unsaved Answer Key Header',
                    title_alignment: 'CENTER',
                    subtitle_text: 'Unsaved subtitle',
                    subtitle_alignment: 'RIGHT',
                    divider_visible: false,
                    divider_color: '#111111',
                    accent_color: '#222222',
                    sentinel_logo_visible: true,
                },
                footer_config: {
                    text: 'Unsaved footer text',
                    confidentiality_label: 'Preview Only',
                    divider_visible: false,
                    divider_color: '#333333',
                    page_number_visible: false,
                    page_number_format: 'SIMPLE_X',
                },
            }),
        });

        expect(res.status).toBe(200);
        expect(await res.text()).toBe('answer-key-pdf');
        expect(mockGetAnswerKeySource).toHaveBeenCalledWith(
            expect.anything(),
            EXAM_A_UUID,
            INST_UUID,
        );
        expect(mockRenderExamAnswerKeyPdf).toHaveBeenCalledWith(
            expect.objectContaining({ title_text: 'Unsaved Answer Key Header' }),
            expect.objectContaining({ text: 'Unsaved footer text' }),
            null,
            expect.objectContaining({
                examId: EXAM_A_UUID,
                title: 'Exam A',
                questions: [expect.objectContaining({ text: 'A question' })],
            }),
        );
    });

    it('sends different selected exam IDs to the answer-key source loader', async () => {
        const app = createApp(['pdf_templates:view', 'examinations:export_answer_key'], null);
        const body = {
            document_kind: 'EXAM_ANSWER_KEY',
            header_config: {
                logo_visible: true,
                logo_placement: 'LEFT',
                logo_max_size_px: 120,
                title_text: 'Title',
                title_alignment: 'LEFT',
                subtitle_text: 'Subtitle',
                subtitle_alignment: 'LEFT',
                divider_visible: true,
                divider_color: '#D1D5DB',
                accent_color: '#3B82F6',
                sentinel_logo_visible: true,
            },
            footer_config: {
                text: 'Footer',
                confidentiality_label: 'Restricted',
                divider_visible: true,
                divider_color: '#E5E7EB',
                page_number_visible: true,
                page_number_format: 'PAGE_X_OF_Y',
            },
        };

        await app.request('/templates/preview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...body, exam_id: EXAM_A_UUID }),
        });
        await app.request('/templates/preview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...body, exam_id: EXAM_B_UUID }),
        });

        expect(mockGetAnswerKeySource).toHaveBeenNthCalledWith(
            1,
            expect.anything(),
            EXAM_A_UUID,
            INST_UUID,
        );
        expect(mockGetAnswerKeySource).toHaveBeenNthCalledWith(
            2,
            expect.anything(),
            EXAM_B_UUID,
            OTHER_UUID,
        );
    });

    it('rejects missing and institution-mismatched selected exams', async () => {
        const app = createApp(['pdf_templates:view', 'examinations:export_answer_key']);
        const baseBody = {
            document_kind: 'EXAM_ANSWER_KEY',
            header_config: {
                logo_visible: true,
                logo_placement: 'LEFT',
                logo_max_size_px: 120,
                title_text: 'Title',
                title_alignment: 'LEFT',
                subtitle_text: 'Subtitle',
                subtitle_alignment: 'LEFT',
                divider_visible: true,
                divider_color: '#D1D5DB',
                accent_color: '#3B82F6',
                sentinel_logo_visible: true,
            },
            footer_config: {
                text: 'Footer',
                confidentiality_label: 'Restricted',
                divider_visible: true,
                divider_color: '#E5E7EB',
                page_number_visible: true,
                page_number_format: 'PAGE_X_OF_Y',
            },
        };

        const missing = await app.request('/templates/preview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...baseBody,
                exam_id: '123e4567-e89b-12d3-a456-426614174099',
            }),
        });
        const mismatch = await app.request('/templates/preview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...baseBody, institution_id: OTHER_UUID, exam_id: EXAM_A_UUID }),
        });

        expect(missing.status).toBe(400);
        expect(mismatch.status).toBe(400);
        expect(mockGetAnswerKeySource).not.toHaveBeenCalled();
    });

    it('allows parent scope to preview a branch exam and labels no-exam sample previews', async () => {
        const app = createApp(
            ['pdf_templates:view', 'examinations:export_answer_key'],
            PARENT_UUID,
        );

        const selected = await app.request('/templates/preview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                institution_id: INST_UUID,
                exam_id: EXAM_A_UUID,
                document_kind: 'EXAM_ANSWER_KEY',
                header_config: {
                    logo_visible: true,
                    logo_placement: 'LEFT',
                    logo_max_size_px: 120,
                    title_text: 'Title',
                    title_alignment: 'LEFT',
                    subtitle_text: 'Subtitle',
                    subtitle_alignment: 'LEFT',
                    divider_visible: true,
                    divider_color: '#D1D5DB',
                    accent_color: '#3B82F6',
                    sentinel_logo_visible: true,
                },
                footer_config: {
                    text: 'Footer',
                    confidentiality_label: 'Restricted',
                    divider_visible: true,
                    divider_color: '#E5E7EB',
                    page_number_visible: true,
                    page_number_format: 'PAGE_X_OF_Y',
                },
            }),
        });
        const sample = await app.request('/templates/preview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                institution_id: INST_UUID,
                document_kind: 'EXAM_ANSWER_KEY',
                header_config: {
                    logo_visible: true,
                    logo_placement: 'LEFT',
                    logo_max_size_px: 120,
                    title_text: 'Title',
                    title_alignment: 'LEFT',
                    subtitle_text: 'Subtitle',
                    subtitle_alignment: 'LEFT',
                    divider_visible: true,
                    divider_color: '#D1D5DB',
                    accent_color: '#3B82F6',
                    sentinel_logo_visible: true,
                },
                footer_config: {
                    text: 'Footer',
                    confidentiality_label: 'Restricted',
                    divider_visible: true,
                    divider_color: '#E5E7EB',
                    page_number_visible: true,
                    page_number_format: 'PAGE_X_OF_Y',
                },
            }),
        });

        expect(selected.status).toBe(200);
        expect(sample.status).toBe(200);
        expect(mockRenderExamAnswerKeyPdf).toHaveBeenLastCalledWith(
            expect.anything(),
            expect.anything(),
            null,
            expect.objectContaining({
                examId: 'sample-preview-exam-answer-key',
                title: expect.stringContaining('Sample Preview'),
                subjectName: expect.stringContaining('Sample Data'),
                questions: expect.arrayContaining([
                    expect.objectContaining({
                        questionId: expect.stringContaining('sample-'),
                        text: expect.stringContaining('Sample question'),
                    }),
                ]),
            }),
        );
    });

    it('renders exam results preview using the sample-labelled fixture and unsaved configs', async () => {
        const app = createApp(['pdf_templates:view']);

        const res = await app.request('/templates/preview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                institution_id: null,
                document_kind: 'EXAM_RESULTS_REPORT',
                header_config: {
                    logo_visible: false,
                    logo_placement: 'RIGHT',
                    logo_max_size_px: 88,
                    title_text: 'Unsaved Exam Results Header',
                    title_alignment: 'CENTER',
                    subtitle_text: 'Unsaved subtitle',
                    subtitle_alignment: 'RIGHT',
                    divider_visible: false,
                    divider_color: '#111111',
                    accent_color: '#222222',
                    sentinel_logo_visible: true,
                },
                footer_config: {
                    text: 'Unsaved footer text',
                    confidentiality_label: 'Preview Only',
                    divider_visible: false,
                    divider_color: '#333333',
                    page_number_visible: false,
                    page_number_format: 'SIMPLE_X',
                },
            }),
        });

        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toBe('application/pdf');
        expect(await res.text()).toBe('exam-results-pdf');
        expect(mockRenderExamResultsReportPdf).toHaveBeenCalledWith(
            expect.objectContaining({
                title_text: 'Unsaved Exam Results Header',
                logo_placement: 'RIGHT',
            }),
            expect.objectContaining({
                text: 'Unsaved footer text',
                confidentiality_label: 'Preview Only',
            }),
            null,
            expect.objectContaining({
                examTitle: expect.stringContaining('Sample Preview'),
                institutionName: expect.stringContaining('Sample Preview'),
                report: expect.objectContaining({
                    students: expect.arrayContaining([
                        expect.objectContaining({
                            studentNo: expect.stringContaining('SAMPLE-'),
                            firstName: expect.stringContaining('Sample'),
                        }),
                    ]),
                }),
            }),
        );
    });

    it('enforces institution scope for exam results template previews', async () => {
        const app = createApp(['pdf_templates:view'], INST_UUID);

        const res = await app.request('/templates/preview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                institution_id: OTHER_UUID,
                document_kind: 'EXAM_RESULTS_REPORT',
                header_config: {
                    logo_visible: true,
                    logo_placement: 'LEFT',
                    logo_max_size_px: 120,
                    title_text: 'Title',
                    title_alignment: 'LEFT',
                    subtitle_text: 'Subtitle',
                    subtitle_alignment: 'LEFT',
                    divider_visible: true,
                    divider_color: '#D1D5DB',
                    accent_color: '#3B82F6',
                    sentinel_logo_visible: true,
                },
                footer_config: {
                    text: 'Footer',
                    confidentiality_label: 'Sample',
                    divider_visible: true,
                    divider_color: '#E5E7EB',
                    page_number_visible: true,
                    page_number_format: 'PAGE_X_OF_Y',
                },
            }),
        });

        expect(res.status).toBe(403);
        expect(mockRenderExamResultsReportPdf).not.toHaveBeenCalled();
    });

    it('returns a generic preview error without leaking fixture student names', async () => {
        mockRenderExamResultsReportPdf.mockRejectedValueOnce(
            new Error('Failed while rendering Alice Sample Smith row'),
        );

        const app = createApp(['pdf_templates:view']);

        const res = await app.request('/templates/preview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                institution_id: null,
                document_kind: 'EXAM_RESULTS_REPORT',
                header_config: {
                    logo_visible: true,
                    logo_placement: 'LEFT',
                    logo_max_size_px: 120,
                    title_text: 'Title',
                    title_alignment: 'LEFT',
                    subtitle_text: 'Subtitle',
                    subtitle_alignment: 'LEFT',
                    divider_visible: true,
                    divider_color: '#D1D5DB',
                    accent_color: '#3B82F6',
                    sentinel_logo_visible: true,
                },
                footer_config: {
                    text: 'Footer',
                    confidentiality_label: 'Sample',
                    divider_visible: true,
                    divider_color: '#E5E7EB',
                    page_number_visible: true,
                    page_number_format: 'PAGE_X_OF_Y',
                },
            }),
        });

        expect(res.status).toBe(500);
        expect(await res.json()).toEqual({
            success: false,
            error: 'Internal error rendering PDF preview.',
        });
    });
});
