import { describe, expect, it, vi } from 'vitest';
import {
    createAnswerKeyExport,
    createExamReportExport,
    deleteAnswerKeyExport,
    deleteExamReportExport,
    deleteInstitutionPdfBranding,
    getAnswerKeyExportDownload,
    getAnswerKeyExportStatus,
    getAnswerKeyExports,
    getExamReportExportDownload,
    getExamReportExportStatus,
    getExamReportExports,
    getPdfExportDownload,
    getPdfTemplates,
    previewPdfTemplate,
    publishPdfTemplate,
    retryAnswerKeyExport,
    retryExamReportExport,
    retryPdfExport,
    uploadInstitutionPdfBranding,
} from './pdf-documents';

describe('pdf documents api', () => {
    it('builds template query strings from institution and document filters', async () => {
        const apiClient = vi.fn().mockResolvedValue({
            message: 'ok',
            data: [],
        });

        await getPdfTemplates(apiClient as any, {
            institutionId: 'inst-1',
            documentKind: 'ANALYTICS_OVERALL',
            status: 'PUBLISHED',
        });

        expect(apiClient).toHaveBeenCalledWith(
            '/pdf-documents/templates?institutionId=inst-1&documentKind=ANALYTICS_OVERALL&status=PUBLISHED',
        );
    });

    it('omits undefined, null, and empty query filters', async () => {
        const apiClient = vi.fn().mockResolvedValue({
            success: true,
            data: { records: [], total_records: 0, page: 1, limit: 10 },
        });

        await getExamReportExports(apiClient as any, {
            institutionId: 'inst-1',
            examId: undefined,
            page: 1,
            limit: undefined,
        });

        expect(apiClient).toHaveBeenCalledWith(
            '/pdf-documents/exam-reports?institutionId=inst-1&page=1',
        );
    });

    it('posts template previews as json and returns the blob response', async () => {
        const previewBlob = new Blob(['%PDF-1.7']);
        const apiClient = vi.fn().mockResolvedValue(previewBlob);

        const result = await previewPdfTemplate(apiClient as any, {
            institution_id: '11111111-1111-1111-1111-111111111111',
            document_kind: 'ANALYTICS_OVERALL',
            header_config: {
                logo_visible: true,
                logo_placement: 'LEFT',
                logo_max_size_px: 120,
                title_text: 'Preview',
                title_alignment: 'LEFT',
                subtitle_alignment: 'LEFT',
                divider_visible: true,
                divider_color: '#D1D5DB',
                accent_color: '#3B82F6',
                sentinel_logo_visible: true,
            },
            footer_config: {
                text: 'Footer',
                divider_visible: true,
                divider_color: '#E5E7EB',
                page_number_visible: true,
                page_number_format: 'PAGE_X_OF_Y',
            },
        });

        expect(apiClient).toHaveBeenCalledWith(
            '/pdf-documents/templates/preview',
            expect.objectContaining({
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            }),
        );
        expect(result).toBe(previewBlob);
    });

    it('passes optional selected exam id through preview payloads unchanged', async () => {
        const previewBlob = new Blob(['%PDF-1.7']);
        const apiClient = vi.fn().mockResolvedValue(previewBlob);

        await previewPdfTemplate(apiClient as any, {
            institution_id: '11111111-1111-1111-1111-111111111111',
            exam_id: '22222222-2222-4222-8222-222222222222',
            document_kind: 'EXAM_ANSWER_KEY',
            header_config: {
                logo_visible: true,
                logo_placement: 'LEFT',
                logo_max_size_px: 120,
                title_text: 'Preview',
                title_alignment: 'LEFT',
                subtitle_alignment: 'LEFT',
                divider_visible: true,
                divider_color: '#D1D5DB',
                accent_color: '#3B82F6',
                sentinel_logo_visible: true,
            },
            footer_config: {
                text: 'Footer',
                divider_visible: true,
                divider_color: '#E5E7EB',
                page_number_visible: true,
                page_number_format: 'PAGE_X_OF_Y',
            },
        });

        const [, options] = apiClient.mock.calls[0];

        expect(JSON.parse(options.body)).toMatchObject({
            institution_id: '11111111-1111-1111-1111-111111111111',
            exam_id: '22222222-2222-4222-8222-222222222222',
            document_kind: 'EXAM_ANSWER_KEY',
        });
    });

    it('uploads branding through multipart form data', async () => {
        const apiClient = vi.fn().mockResolvedValue({
            message: 'ok',
            data: { institution_id: 'inst-1' },
        });
        const file = new File(['svg'], 'logo.svg', { type: 'image/svg+xml' });

        await uploadInstitutionPdfBranding(apiClient as any, 'inst-1', file);

        expect(apiClient).toHaveBeenCalledWith(
            '/pdf-documents/institutions/inst-1/branding',
            expect.objectContaining({
                method: 'POST',
                body: expect.any(FormData),
            }),
        );
    });

    it('targets answer-key list filters and pagination correctly', async () => {
        const apiClient = vi.fn().mockResolvedValue({
            success: true,
            data: { records: [], total_records: 0, limit: 10, page: 2 },
        });

        await getAnswerKeyExports(apiClient as any, {
            institutionId: 'inst-1',
            examId: 'exam-1',
            page: 2,
            limit: 10,
        });

        expect(apiClient).toHaveBeenCalledWith(
            '/pdf-documents/answer-keys?institutionId=inst-1&examId=exam-1&page=2&limit=10',
        );
    });

    it('targets exam-report list filters and pagination correctly', async () => {
        const apiClient = vi.fn().mockResolvedValue({
            success: true,
            data: { records: [], total_records: 0, limit: 25, page: 3 },
        });

        await getExamReportExports(apiClient as any, {
            institutionId: 'inst-1',
            examId: 'exam-1',
            page: 3,
            limit: 25,
        });

        expect(apiClient).toHaveBeenCalledWith(
            '/pdf-documents/exam-reports?institutionId=inst-1&examId=exam-1&page=3&limit=25',
        );
    });

    it('posts answer-key creation payloads with json bodies', async () => {
        const apiClient = vi.fn().mockResolvedValue({
            success: true,
            data: { exportId: 'export-1' },
        });

        await createAnswerKeyExport(apiClient as any, {
            exam_id: 'exam-1',
            institution_id: 'inst-1',
            title: 'Answer Key',
        });

        expect(apiClient).toHaveBeenCalledWith(
            '/pdf-documents/answer-keys',
            expect.objectContaining({
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    exam_id: 'exam-1',
                    institution_id: 'inst-1',
                    title: 'Answer Key',
                }),
            }),
        );
    });

    it('posts exam-report creation payloads with json bodies', async () => {
        const apiClient = vi.fn().mockResolvedValue({
            success: true,
            data: { exportId: 'export-2' },
        });

        await createExamReportExport(apiClient as any, {
            exam_id: 'exam-1',
            title: 'Exam Results Report',
        });

        expect(apiClient).toHaveBeenCalledWith(
            '/pdf-documents/exam-reports',
            expect.objectContaining({
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    exam_id: 'exam-1',
                    title: 'Exam Results Report',
                }),
            }),
        );
    });

    it('requests exact exam-report lifecycle routes', async () => {
        const apiClient = vi
            .fn()
            .mockResolvedValueOnce({
                success: true,
                data: {
                    exportId: 'export-1',
                    examId: 'exam-1',
                    institutionId: 'inst-1',
                    templateId: null,
                    status: 'READY',
                    failureCode: null,
                    failureMessage: null,
                    retryCount: 0,
                    createdBy: null,
                    createdAt: '2026-08-01T00:00:00.000Z',
                    updatedAt: '2026-08-01T00:00:00.000Z',
                    completedAt: '2026-08-01T00:01:00.000Z',
                    expiresAt: '2026-08-08T00:01:00.000Z',
                },
            })
            .mockResolvedValueOnce({
                success: true,
                downloadUrl: 'https://signed.example/exam-report.pdf',
            })
            .mockResolvedValueOnce({ success: true, message: 'queued' })
            .mockResolvedValueOnce({ success: true, message: 'deleted' });

        const status = await getExamReportExportStatus(apiClient as any, 'export-1');
        const download = await getExamReportExportDownload(apiClient as any, 'export-1');
        const retry = await retryExamReportExport(apiClient as any, 'export-1');
        const remove = await deleteExamReportExport(apiClient as any, 'export-1');

        expect(apiClient).toHaveBeenNthCalledWith(1, '/pdf-documents/exam-reports/export-1/status');
        expect(apiClient).toHaveBeenNthCalledWith(
            2,
            '/pdf-documents/exam-reports/export-1/download',
        );
        expect(apiClient).toHaveBeenNthCalledWith(
            3,
            '/pdf-documents/exam-reports/export-1/retry',
            expect.objectContaining({ method: 'POST' }),
        );
        expect(apiClient).toHaveBeenNthCalledWith(
            4,
            '/pdf-documents/exam-reports/export-1',
            expect.objectContaining({ method: 'DELETE' }),
        );
        expect(status).toMatchObject({
            exportId: 'export-1',
            status: 'READY',
            expiresAt: '2026-08-08T00:01:00.000Z',
        });
        expect(download.downloadUrl).toContain('signed.example');
        expect(retry.message).toBe('queued');
        expect(remove.message).toBe('deleted');
    });

    it('requests fresh signed download URLs and retry endpoints for generic pdf exports', async () => {
        const apiClient = vi
            .fn()
            .mockResolvedValueOnce({
                success: true,
                downloadUrl: 'https://signed.example/report.pdf',
            })
            .mockResolvedValueOnce({ success: true, message: 'queued' })
            .mockResolvedValueOnce({ message: 'published', template_id: 'template-1', version: 2 })
            .mockResolvedValueOnce({ message: 'deleted' });

        const download = await getPdfExportDownload(apiClient as any, 'export-1');
        const retry = await retryPdfExport(apiClient as any, 'export-1');
        const publish = await publishPdfTemplate(apiClient as any, 'template-1');
        const removeBranding = await deleteInstitutionPdfBranding(apiClient as any, 'inst-1');

        expect(apiClient).toHaveBeenNthCalledWith(1, '/pdf-documents/exports/export-1/download');
        expect(apiClient).toHaveBeenNthCalledWith(
            2,
            '/pdf-documents/exports/export-1/retry',
            expect.objectContaining({ method: 'POST' }),
        );
        expect(apiClient).toHaveBeenNthCalledWith(
            3,
            '/pdf-documents/templates/template-1/publish',
            expect.objectContaining({ method: 'POST' }),
        );
        expect(apiClient).toHaveBeenNthCalledWith(
            4,
            '/pdf-documents/institutions/inst-1/branding',
            expect.objectContaining({ method: 'DELETE' }),
        );
        expect(download.downloadUrl).toContain('signed.example');
        expect(retry.message).toBe('queued');
        expect(publish.version).toBe(2);
        expect(removeBranding.message).toBe('deleted');
    });

    it('preserves api client errors for exam-report requests', async () => {
        const error = new Error('download failed');
        const apiClient = vi.fn().mockRejectedValue(error);

        await expect(getExamReportExportDownload(apiClient as any, 'export-1')).rejects.toThrow(
            'download failed',
        );
    });

    it('requests exact answer-key lifecycle routes', async () => {
        const apiClient = vi
            .fn()
            .mockResolvedValueOnce({
                success: true,
                data: {
                    exportId: 'export-1',
                    examId: 'exam-1',
                    institutionId: 'inst-1',
                    templateId: null,
                    status: 'READY',
                    failureCode: null,
                    failureMessage: null,
                    retryCount: 0,
                    createdBy: null,
                    createdAt: '2026-08-01T00:00:00.000Z',
                    updatedAt: '2026-08-01T00:00:00.000Z',
                    completedAt: '2026-08-01T00:01:00.000Z',
                },
            })
            .mockResolvedValueOnce({
                success: true,
                downloadUrl: 'https://signed.example/answer-key.pdf',
            })
            .mockResolvedValueOnce({ success: true, message: 'queued' })
            .mockResolvedValueOnce({ success: true, message: 'deleted' });

        const status = await getAnswerKeyExportStatus(apiClient as any, 'export-1');
        const download = await getAnswerKeyExportDownload(apiClient as any, 'export-1');
        const retry = await retryAnswerKeyExport(apiClient as any, 'export-1');
        const remove = await deleteAnswerKeyExport(apiClient as any, 'export-1');

        expect(apiClient).toHaveBeenNthCalledWith(1, '/pdf-documents/answer-keys/export-1/status');
        expect(apiClient).toHaveBeenNthCalledWith(
            2,
            '/pdf-documents/answer-keys/export-1/download',
        );
        expect(apiClient).toHaveBeenNthCalledWith(
            3,
            '/pdf-documents/answer-keys/export-1/retry',
            expect.objectContaining({ method: 'POST' }),
        );
        expect(apiClient).toHaveBeenNthCalledWith(
            4,
            '/pdf-documents/answer-keys/export-1',
            expect.objectContaining({ method: 'DELETE' }),
        );
        expect(status).toMatchObject({
            exportId: 'export-1',
            status: 'READY',
        });
        expect(download.downloadUrl).toContain('signed.example');
        expect(retry.message).toBe('queued');
        expect(remove.message).toBe('deleted');
    });
});
