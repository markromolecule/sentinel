import type { DbClient } from '@sentinel/db';
import { UnrecoverableError } from 'bullmq';
import { renderExamAnswerKeyPdf } from '../../rendering/exam-answer-key-renderer';
import {
    getAnswerKeySource,
    mapAnswerKeySourceToViewModel,
} from '../../data/answer-keys/get-answer-key-source';
import type { PdfDocumentProcessor } from './pdf-document-processor.interface';

/**
 * Processor implementation for generating the exam answer key PDF.
 */
export class ExamAnswerKeyDocumentProcessor implements PdfDocumentProcessor {
    readonly documentKind = 'EXAM_ANSWER_KEY' as const;
    readonly tableName = 'exam_answer_key_exports';
    readonly idCol = 'export_id';
    readonly resolveOptions = { persistBuiltInFallback: true };

    getClaimUpdateSet(currentRetries: number): Record<string, any> {
        return {
            status: 'GENERATING',
            retry_count: currentRetries + 1,
            failure_code: null,
            failure_message: null,
            updated_at: new Date(),
        };
    }

    async render(
        dbClient: DbClient,
        exportRecord: any,
        requestData: any,
        headerConfig: any,
        footerConfig: any,
        logoBuffer: Buffer | null,
    ): Promise<{ pdfBuffer: Buffer; storagePath: string }> {
        const examId = exportRecord.exam_id;
        if (!examId) {
            throw new UnrecoverableError(
                'Invalid request parameters: missing exam_id on export record.',
            );
        }

        const exportId = exportRecord.export_id;
        const instId = exportRecord.institution_id || 'global';
        const storagePath = `answer-keys/${instId}/${examId}/${exportId}.pdf`;

        const answerKeySource = await getAnswerKeySource(
            dbClient,
            examId,
            exportRecord.institution_id!,
        );
        const answerKeyData = mapAnswerKeySourceToViewModel(answerKeySource, 'Sentinel Support');

        const pdfBuffer = await renderExamAnswerKeyPdf(
            headerConfig,
            footerConfig,
            logoBuffer,
            answerKeyData,
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
