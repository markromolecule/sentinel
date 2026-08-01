import { executeTransaction, type DbClient } from '@sentinel/db';
import { PdfStorageService } from '../storage/pdf-storage.service';
import { resolvePdfTemplate } from '../services/resolve-pdf-template.service';
import { getPdfProcessor } from './processors/pdf-processor.registry';
import { LogsService } from '../../logs/logs.service';

/**
 * Service orchestrator that processes background PDF generation jobs.
 * Uses strategy processors to handle document-specific database claiming, rendering,
 * and status updates.
 */
export class PdfGenerationJobProcessor {
    /**
     * Executes the PDF generation job logic, managing status transitions, template snapshots,
     * rendering, and storage uploads transactionally.
     *
     * @param dbClient database client
     * @param exportId export record UUID
     * @param documentKind type of document being generated
     */
    static async processJob(
        dbClient: DbClient,
        exportId: string,
        documentKind: 'ANALYTICS_OVERALL' | 'EXAM_ANSWER_KEY' | 'EXAM_RESULTS_REPORT',
    ): Promise<void> {
        const processor = getPdfProcessor(documentKind);
        const { tableName, idCol, resolveOptions } = processor;

        // 1. Transaction block for claiming the job and updating state
        const taskResult = await executeTransaction(async (trx) => {
            // Select and lock the row to avoid concurrent duplicate processing
            const exportRecord = await trx
                .selectFrom(tableName as any)
                .selectAll()
                .where(idCol as any, '=', exportId)
                .forUpdate()
                .executeTakeFirst();

            if (!exportRecord) {
                return { action: 'SKIP_MISSING' as const, record: null };
            }

            const rec = exportRecord as any;

            // If already complete or generating, skip to preserve idempotency
            if (rec.status === 'READY') {
                return { action: 'SKIP' as const, record: rec };
            }

            // Claim the job: transition PENDING/FAILED to GENERATING, increment retry_count
            const currentRetries = rec.retry_count ?? 0;
            const updateSet = processor.getClaimUpdateSet(currentRetries);

            const updatedRecord = await trx
                .updateTable(tableName as any)
                .set(updateSet)
                .where(idCol as any, '=', exportId)
                .returningAll()
                .executeTakeFirstOrThrow();

            return { action: 'PROCESS' as const, record: updatedRecord as any };
        });

        if (taskResult.action === 'SKIP') {
            return;
        }
        if (taskResult.action === 'SKIP_MISSING') {
            console.warn(
                `[PDFWorker] Skipping orphaned job for missing ${tableName} record ${exportId}`,
            );
            return;
        }

        const exportRecord = taskResult.record;
        const requestData =
            typeof exportRecord.request_snapshot === 'string'
                ? JSON.parse(exportRecord.request_snapshot)
                : exportRecord.request_snapshot;

        try {
            // 2. Resolve template layout and freeze snapshot
            const resolvedTemplate = await resolvePdfTemplate(
                dbClient,
                exportRecord.institution_id,
                documentKind,
                resolveOptions,
            );

            const headerConfig = resolvedTemplate.headerConfig;
            const footerConfig = resolvedTemplate.footerConfig;

            // 3. Download Branding Logo if applicable
            let logoBuffer: Buffer | null = null;
            if (exportRecord.institution_id) {
                const branding = await dbClient
                    .selectFrom('institution_pdf_branding')
                    .selectAll()
                    .where('institution_id', '=', exportRecord.institution_id)
                    .executeTakeFirst();
                if (branding) {
                    try {
                        logoBuffer = await PdfStorageService.downloadFile(
                            branding.logo_storage_bucket,
                            branding.logo_storage_path,
                        );
                    } catch (e) {
                        // Logo download failure is transient or non-fatal, fallback to null
                        logoBuffer = null;
                    }
                }
            }

            // 4. Gather data and render PDF depending on kind
            const { pdfBuffer, storagePath } = await processor.render(
                dbClient,
                exportRecord,
                requestData,
                headerConfig,
                footerConfig,
                logoBuffer,
            );

            // 5. Upload file to private storage bucket
            const bucket = PdfStorageService.PDF_ARTIFACTS_BUCKET;
            await PdfStorageService.uploadPdf(bucket, storagePath, pdfBuffer);

            // 6. Update status to READY transactionally
            await executeTransaction(async (trx) => {
                const completedAt = new Date();
                const updateSet = processor.getReadyUpdateSet(
                    completedAt,
                    bucket,
                    storagePath,
                    resolvedTemplate,
                );

                await trx
                    .updateTable(tableName as any)
                    .set(updateSet)
                    .where(idCol as any, '=', exportId)
                    .execute();
            });

            // 7. Audit log success if institution-scoped
            if (exportRecord.institution_id) {
                try {
                    await LogsService.createLog(dbClient, {
                        ...(exportRecord.created_by && exportRecord.created_by !== 'system-worker'
                            ? { userId: exportRecord.created_by }
                            : { resourceType: 'system' }),
                        action: 'PDF_EXPORT_COMPLETED',
                        activeInstitutionId: exportRecord.institution_id,
                        details: {
                            exportId,
                            documentKind,
                            sizeBytes: pdfBuffer.length,
                        },
                    });
                } catch (logErr: any) {
                    console.warn(
                        `[PDFWorker] Audit logging failed for export ${exportId}:`,
                        logErr.message,
                    );
                }
            } else {
                console.log(`[PDFWorker] PDF_EXPORT_COMPLETED for global export ${exportId}`);
            }
        } catch (error: any) {
            await executeTransaction(async (trx) => {
                const updateSet = processor.getFailedUpdateSet(error);

                await trx
                    .updateTable(tableName as any)
                    .set(updateSet)
                    .where(idCol as any, '=', exportId)
                    .execute();
            });

            // Log event if institution-scoped
            if (exportRecord.institution_id) {
                try {
                    await LogsService.createLog(dbClient, {
                        ...(exportRecord.created_by && exportRecord.created_by !== 'system-worker'
                            ? { userId: exportRecord.created_by }
                            : { resourceType: 'system' }),
                        action: 'PDF_EXPORT_FAILED',
                        activeInstitutionId: exportRecord.institution_id,
                        details: {
                            exportId,
                            error: error.message,
                        },
                    });
                } catch (logErr: any) {
                    console.warn(
                        `[PDFWorker] Audit logging failed for failed export ${exportId}:`,
                        logErr.message,
                    );
                }
            } else {
                console.error(
                    `[PDFWorker] PDF_EXPORT_FAILED for global export ${exportId}:`,
                    error.message,
                );
            }

            throw error;
        }
    }
}
