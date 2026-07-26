import type { DbClient } from '@sentinel/db';
import { UnrecoverableError } from 'bullmq';
import { renderAnalyticsOverallPdf } from '../../rendering/analytics-overall-renderer';
import { BuildOverallAnalyticsSnapshotService } from '../../../analytics/services/build-overall-analytics-snapshot.service';
import type { PdfDocumentProcessor } from './pdf-document-processor.interface';

/**
 * Processor implementation for generating the overall analytics PDF.
 */
export class AnalyticsOverallDocumentProcessor implements PdfDocumentProcessor {
    readonly documentKind = 'ANALYTICS_OVERALL' as const;
    readonly tableName = 'analytics_reports';
    readonly idCol = 'report_id';
    readonly resolveOptions = { persistBuiltInFallback: false };

    getClaimUpdateSet(currentRetries: number): Record<string, any> {
        return {
            status: 'GENERATING',
            retry_count: currentRetries + 1,
            failure_code: null,
            failure_message: null,
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
        const exportId = exportRecord.report_id;
        const instId = exportRecord.institution_id || 'global';
        const storagePath = `analytics/${instId}/${exportId}.pdf`;

        const startAt = exportRecord.period_start_at
            ? new Date(exportRecord.period_start_at)
            : new Date();
        const endAtExclusive = exportRecord.period_end_at
            ? new Date(exportRecord.period_end_at)
            : new Date();
        const timezone = exportRecord.timezone || 'Asia/Manila';

        const analyticsData = await BuildOverallAnalyticsSnapshotService.buildSnapshot({
            dbClient,
            institutionId: exportRecord.institution_id || undefined,
            startAt,
            endAtExclusive,
            timezone,
            periodLabel: requestData?.periodLabel || 'Custom Period',
            generatedBy: 'Sentinel Analytics System',
        });

        const pdfBuffer = await renderAnalyticsOverallPdf(
            headerConfig,
            footerConfig,
            logoBuffer,
            analyticsData,
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
        };
    }

    getFailedUpdateSet(error: any): Record<string, any> {
        const isUnrecoverable = error instanceof UnrecoverableError;
        return {
            status: 'FAILED',
            failure_code: isUnrecoverable ? 'UNRECOVERABLE_ERROR' : 'TRANSIENT_ERROR',
            failure_message: error.message || 'Unknown processing failure.',
        };
    }
}
