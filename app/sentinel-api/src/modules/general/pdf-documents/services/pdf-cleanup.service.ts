import { type DbClient, executeTransaction } from '@sentinel/db';
import { PdfStorageService } from '../storage/pdf-storage.service';
import { LogsService } from '../../logs/logs.service';

export class PdfCleanupService {
    /**
     * Purges expired analytics PDF exports.
     * Deletes the files from private storage and sets status to EXPIRED in the database.
     * Never deletes answer keys, templates, or branding.
     *
     * @param dbClient database client
     * @returns count of successfully purged records
     */
    static async purgeExpiredAnalytics(dbClient: DbClient): Promise<number> {
        const now = new Date();

        // 1. Fetch expired analytics exports that are still in READY state
        const expiredRecords = await dbClient
            .selectFrom('analytics_reports')
            .selectAll()
            .where('expires_at', '<=', now)
            .where('status', '=', 'READY')
            .execute();

        let purgeCount = 0;

        for (const record of expiredRecords) {
            try {
                // 2. Delete file from storage if bucket and path are set
                if (record.storage_bucket && record.storage_path) {
                    try {
                        await PdfStorageService.deletePdf(
                            record.storage_bucket,
                            record.storage_path,
                        );
                    } catch (storageErr: any) {
                        // If file already deleted or not found, we can proceed with DB update.
                        // Otherwise, log warning but continue to update DB to avoid getting stuck.
                        console.warn(
                            `[PDFCleanup] Storage deletion failed/skipped for export ${record.report_id}:`,
                            storageErr.message,
                        );
                    }
                }

                // 3. Update database status to EXPIRED and clear coordinates
                await executeTransaction(async (trx) => {
                    await trx
                        .updateTable('analytics_reports')
                        .set({
                            status: 'EXPIRED',
                            storage_bucket: null,
                            storage_path: null,
                        })
                        .where('report_id', '=', record.report_id)
                        .execute();
                });

                // 4. Log event if scoped to an institution
                if (record.institution_id) {
                    try {
                        await LogsService.createLog(dbClient, {
                            resourceType: 'system',
                            action: 'PDF_EXPORT_PURGED',
                            activeInstitutionId: record.institution_id,
                            details: {
                                exportId: record.report_id,
                                documentKind: 'ANALYTICS_OVERALL',
                                expiredAt: record.expires_at,
                            },
                        });
                    } catch (logErr: any) {
                        console.warn(
                            `[PDFCleanup] Audit logging failed for export ${record.report_id}:`,
                            logErr.message,
                        );
                    }
                } else {
                    console.log(
                        `[PDFCleanup] PDF_EXPORT_PURGED for global export ${record.report_id}`,
                    );
                }

                purgeCount++;
            } catch (err: any) {
                console.error(
                    `[PDFCleanup] Failed to purge expired PDF export ${record.report_id}:`,
                    err.message,
                );
            }
        }

        if (purgeCount > 0) {
            console.log(
                `[PDFCleanup] Successfully purged ${purgeCount} expired analytics PDF reports.`,
            );
        }
        return purgeCount;
    }
}
