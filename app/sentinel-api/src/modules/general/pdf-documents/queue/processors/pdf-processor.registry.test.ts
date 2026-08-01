import { describe, expect, it } from 'vitest';
import { UnrecoverableError } from 'bullmq';
import { getPdfProcessor } from './pdf-processor.registry';
import { AnalyticsOverallDocumentProcessor } from './analytics-overall.processor';
import { ExamAnswerKeyDocumentProcessor } from './exam-answer-key.processor';
import { ExamResultsReportDocumentProcessor } from './exam-results-report.processor';

describe('pdf-processor.registry and processors', () => {
    it('should retrieve correct processor for ANALYTICS_OVERALL', () => {
        const processor = getPdfProcessor('ANALYTICS_OVERALL');
        expect(processor).toBeInstanceOf(AnalyticsOverallDocumentProcessor);
        expect(processor.documentKind).toBe('ANALYTICS_OVERALL');
        expect(processor.tableName).toBe('analytics_reports');
        expect(processor.idCol).toBe('report_id');
        expect(processor.resolveOptions.persistBuiltInFallback).toBe(false);
    });

    it('should retrieve correct processor for EXAM_ANSWER_KEY', () => {
        const processor = getPdfProcessor('EXAM_ANSWER_KEY');
        expect(processor).toBeInstanceOf(ExamAnswerKeyDocumentProcessor);
        expect(processor.documentKind).toBe('EXAM_ANSWER_KEY');
        expect(processor.tableName).toBe('exam_answer_key_exports');
        expect(processor.idCol).toBe('export_id');
        expect(processor.resolveOptions.persistBuiltInFallback).toBe(true);
    });

    it('should retrieve correct processor for EXAM_RESULTS_REPORT', () => {
        const processor = getPdfProcessor('EXAM_RESULTS_REPORT');
        expect(processor).toBeInstanceOf(ExamResultsReportDocumentProcessor);
        expect(processor.documentKind).toBe('EXAM_RESULTS_REPORT');
        expect(processor.tableName).toBe('exam_report_exports');
        expect(processor.idCol).toBe('export_id');
        expect(processor.resolveOptions.persistBuiltInFallback).toBe(true);
    });

    it('should throw for unsupported document kind', () => {
        expect(() => getPdfProcessor('INVALID_KIND' as any)).toThrow(
            'Unsupported document kind for PDF generation: INVALID_KIND',
        );
    });

    describe('AnalyticsOverallDocumentProcessor lifecycle update sets', () => {
        const processor = getPdfProcessor('ANALYTICS_OVERALL');

        it('returns correct update set for claim', () => {
            expect(processor.getClaimUpdateSet(1)).toEqual({
                status: 'GENERATING',
                retry_count: 2,
                failure_code: null,
                failure_message: null,
            });
        });

        it('returns correct update set for ready', () => {
            const completedAt = new Date();
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
            expect(updateSet.expires_at).toBeInstanceOf(Date);
            // Verify expires_at is 7 days from completedAt
            const diffMs = updateSet.expires_at.getTime() - completedAt.getTime();
            expect(diffMs).toBe(7 * 24 * 3600 * 1000);
        });

        it('returns correct update set for failure (transient)', () => {
            const error = new Error('Some error');
            const updateSet = processor.getFailedUpdateSet(error);
            expect(updateSet).toEqual({
                status: 'FAILED',
                failure_code: 'TRANSIENT_ERROR',
                failure_message: 'Some error',
            });
        });

        it('returns correct update set for failure (unrecoverable)', () => {
            const error = new UnrecoverableError('Fatal error');
            const updateSet = processor.getFailedUpdateSet(error);
            expect(updateSet).toEqual({
                status: 'FAILED',
                failure_code: 'UNRECOVERABLE_ERROR',
                failure_message: 'Fatal error',
            });
        });
    });

    describe('ExamAnswerKeyDocumentProcessor lifecycle update sets', () => {
        const processor = getPdfProcessor('EXAM_ANSWER_KEY');

        it('returns correct update set for claim', () => {
            const updateSet = processor.getClaimUpdateSet(2);
            expect(updateSet.status).toBe('GENERATING');
            expect(updateSet.retry_count).toBe(3);
            expect(updateSet.failure_code).toBeNull();
            expect(updateSet.failure_message).toBeNull();
            expect(updateSet.updated_at).toBeInstanceOf(Date);
        });

        it('returns correct update set for ready', () => {
            const completedAt = new Date();
            const template = { templateId: 'temp-456' };
            const updateSet = processor.getReadyUpdateSet(
                completedAt,
                'test-bucket',
                'test-path',
                template,
            );

            expect(updateSet).toEqual({
                status: 'READY',
                storage_bucket: 'test-bucket',
                storage_path: 'test-path',
                template_id: 'temp-456',
                template_snapshot: JSON.stringify(template),
                completed_at: completedAt,
                updated_at: completedAt,
            });
        });

        it('returns correct update set for failure (transient)', () => {
            const error = new Error('Mock failure');
            const updateSet = processor.getFailedUpdateSet(error);
            expect(updateSet.status).toBe('FAILED');
            expect(updateSet.failure_code).toBe('TRANSIENT_ERROR');
            expect(updateSet.failure_message).toBe(
                'Answer key export failed because of a transient processing error.',
            );
            expect(updateSet.updated_at).toBeInstanceOf(Date);
        });

        it('returns correct update set for failure (unrecoverable)', () => {
            const error = new UnrecoverableError('Mock fatal error');
            const updateSet = processor.getFailedUpdateSet(error);
            expect(updateSet.status).toBe('FAILED');
            expect(updateSet.failure_code).toBe('UNRECOVERABLE_ERROR');
            expect(updateSet.failure_message).toBe(
                'Answer key export failed because the source data could not be processed.',
            );
            expect(updateSet.updated_at).toBeInstanceOf(Date);
        });
    });
});
