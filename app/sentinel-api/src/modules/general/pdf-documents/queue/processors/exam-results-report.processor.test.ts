import { describe, expect, it, vi, beforeEach } from 'vitest';
import { UnrecoverableError } from 'bullmq';
import { ExamResultsReportDocumentProcessor } from './exam-results-report.processor';
import { getExamReportExportSource } from '../../data/exam-reports/get-exam-report-export-source';
import { renderExamResultsReportPdf } from '../../rendering/exam-results-report-renderer';

vi.mock('../../data/exam-reports/get-exam-report-export-source', () => ({
    getExamReportExportSource: vi.fn(),
}));

vi.mock('../../rendering/exam-results-report-renderer', () => ({
    renderExamResultsReportPdf: vi.fn(),
}));

describe('ExamResultsReportDocumentProcessor', () => {
    let processor: ExamResultsReportDocumentProcessor;

    beforeEach(() => {
        vi.clearAllMocks();
        processor = new ExamResultsReportDocumentProcessor();
    });

    it('defines correct metadata properties', () => {
        expect(processor.documentKind).toBe('EXAM_RESULTS_REPORT');
        expect(processor.tableName).toBe('exam_report_exports');
        expect(processor.idCol).toBe('export_id');
        expect(processor.resolveOptions.persistBuiltInFallback).toBe(true);
    });

    it('returns claim update set incrementing retry count', () => {
        const updateSet = processor.getClaimUpdateSet(2);
        expect(updateSet.status).toBe('GENERATING');
        expect(updateSet.retry_count).toBe(3);
        expect(updateSet.failure_code).toBeNull();
        expect(updateSet.failure_message).toBeNull();
        expect(updateSet.started_at).toBeInstanceOf(Date);
        expect(updateSet.updated_at).toBeInstanceOf(Date);
    });

    it('returns ready update set with 7-day expiration', () => {
        const completedAt = new Date('2026-08-01T08:00:00.000Z');
        const template = { templateId: 'temp-123' };
        const updateSet = processor.getReadyUpdateSet(
            completedAt,
            'test-bucket',
            'test-path',
            template,
        );

        expect(updateSet.status).toBe('READY');
        expect(updateSet.storage_bucket).toBe('test-bucket');
        expect(updateSet.storage_path).toBe('test-path');
        expect(updateSet.template_id).toBe('temp-123');
        expect(updateSet.template_snapshot).toBe(JSON.stringify(template));
        expect(updateSet.completed_at).toBe(completedAt);
        expect(updateSet.updated_at).toBe(completedAt);

        // Expiry should be exactly 7 days later
        const expectedExpiresAt = new Date(completedAt.getTime() + 7 * 24 * 3600 * 1000);
        expect(updateSet.expires_at.getTime()).toBe(expectedExpiresAt.getTime());
    });

    it('returns failed update set classifying error severity', () => {
        const transientError = new Error('Transient network timeout');
        const transientUpdate = processor.getFailedUpdateSet(transientError);
        expect(transientUpdate.status).toBe('FAILED');
        expect(transientUpdate.failure_code).toBe('TRANSIENT_ERROR');
        expect(transientUpdate.failure_message).toBe('Transient network timeout');

        const unrecoverableError = new UnrecoverableError('Database schema mismatch');
        const unrecoverableUpdate = processor.getFailedUpdateSet(unrecoverableError);
        expect(unrecoverableUpdate.status).toBe('FAILED');
        expect(unrecoverableUpdate.failure_code).toBe('UNRECOVERABLE_ERROR');
        expect(unrecoverableUpdate.failure_message).toBe('Database schema mismatch');
    });

    it('renders the PDF buffer using resolved exam results report source data', async () => {
        const mockDbClient = {} as any;
        const exportRecord = {
            export_id: 'export-789',
            exam_id: 'exam-123',
            institution_id: 'inst-456',
            created_by: 'creator-999',
        };
        const requestData = {};
        const headerConfig = { headerText: 'Header' };
        const footerConfig = { footerText: 'Footer' };
        const logoBuffer = Buffer.from('logo');

        const mockSourceData = { examId: 'exam-123', report: {} };
        const mockPdfBuffer = Buffer.from('pdf-data');

        vi.mocked(getExamReportExportSource).mockResolvedValue(mockSourceData as any);
        vi.mocked(renderExamResultsReportPdf).mockResolvedValue(mockPdfBuffer);

        const result = await processor.render(
            mockDbClient,
            exportRecord,
            requestData,
            headerConfig,
            footerConfig,
            logoBuffer,
        );

        expect(getExamReportExportSource).toHaveBeenCalledWith(
            mockDbClient,
            'exam-123',
            'inst-456',
            'creator-999',
        );

        expect(renderExamResultsReportPdf).toHaveBeenCalledWith(
            headerConfig,
            footerConfig,
            logoBuffer,
            mockSourceData,
        );

        expect(result.pdfBuffer).toBe(mockPdfBuffer);
        expect(result.storagePath).toBe('exam-reports/inst-456/exam-123/export-789.pdf');
    });

    it('throws UnrecoverableError in render if exam_id or institution_id is missing', async () => {
        await expect(
            processor.render({} as any, { export_id: '123' }, {}, {}, {}, null),
        ).rejects.toThrow(UnrecoverableError);
    });
});
