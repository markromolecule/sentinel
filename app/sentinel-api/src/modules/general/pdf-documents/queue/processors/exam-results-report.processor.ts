import type { DbClient } from '@sentinel/db';
import { UnrecoverableError } from 'bullmq';
import { renderExamResultsReportPdf } from '../../rendering/exam-results-report-renderer';
import { getExamReportExportSource } from '../../data/exam-reports/get-exam-report-export-source';
import type { PdfDocumentProcessor } from './pdf-document-processor.interface';

/**
 * Processor implementation for generating the exam results report PDF.
 */
export class ExamResultsReportDocumentProcessor implements PdfDocumentProcessor {
    readonly documentKind = 'EXAM_RESULTS_REPORT' as const;
    readonly tableName = 'exam_report_exports';
    readonly idCol = 'export_id';
    readonly resolveOptions = { persistBuiltInFallback: true };

    getClaimUpdateSet(currentRetries: number): Record<string, any> {
        return {
            status: 'GENERATING',
            retry_count: currentRetries + 1,
            failure_code: null,
            failure_message: null,
            started_at: new Date(),
            updated_at: new Date(),
        };
    }

    async render(
        dbClient: DbClient,
        exportRecord: any,
        _requestData: any,
        headerConfig: any,
        footerConfig: any,
        logoBuffer: Buffer | null,
    ): Promise<{ pdfBuffer: Buffer; storagePath: string }> {
        const examId = exportRecord.exam_id;
        const institutionId = exportRecord.institution_id;
        const exportId = exportRecord.export_id;
        const createdBy = exportRecord.created_by;

        if (!examId || !institutionId) {
            throw new UnrecoverableError(
                'Invalid request parameters: missing exam_id or institution_id on export record.',
            );
        }

        const storagePath = `exam-reports/${institutionId}/${examId}/${exportId}.pdf`;

        // Gather full report source dataset
        const sourceData = await getExamReportExportSource(
            dbClient,
            examId,
            institutionId,
            createdBy,
        );

        const pdfBuffer = await renderExamResultsReportPdf(
            headerConfig,
            footerConfig,
            logoBuffer,
            sourceData,
        );

        return { pdfBuffer, storagePath };
    }

    getReadyUpdateSet(
        completedAt: Date,
        bucket: string,
        storagePath: string,
        resolvedTemplate: { templateId: string | null; [key: string]: any },
    ): Record<string, any> {
        return {
            status: 'READY',
            storage_bucket: bucket,
            storage_path: storagePath,
            template_id: resolvedTemplate.templateId,
            template_snapshot: JSON.stringify(resolvedTemplate),
            completed_at: completedAt,
            expires_at: new Date(completedAt.getTime() + 7 * 24 * 3600 * 1000), // Expires in 7 days
            updated_at: completedAt,
        };
    }

    getFailedUpdateSet(error: any): Record<string, any> {
        const isUnrecoverable = error instanceof UnrecoverableError;
        return {
            status: 'FAILED',
            failure_code: isUnrecoverable ? 'UNRECOVERABLE_ERROR' : 'TRANSIENT_ERROR',
            failure_message: error.message || 'Unknown processing failure.',
            updated_at: new Date(),
        };
    }
}
