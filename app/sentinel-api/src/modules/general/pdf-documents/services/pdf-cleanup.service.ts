import { type DbClient, executeTransaction } from '@sentinel/db';
import { PdfStorageService } from '../storage/pdf-storage.service';
import { LogsService } from '../../logs/logs.service';

interface CleanupCandidateRecord {
    id: string;
    institutionId: string | null;
    storageBucket: string | null;
    storagePath: string | null;
    expiresAt: Date | null;
}

interface CleanupTargets {
    tableName: 'analytics_reports' | 'exam_report_exports';
    idColumn: 'report_id' | 'export_id';
    storagePrefix: 'analytics/' | 'exam-reports/';
    documentKind: 'ANALYTICS_OVERALL' | 'EXAM_RESULTS_REPORT';
    logAction: 'PDF_EXPORT_PURGED' | 'EXAM_REPORT_EXPORT_PURGED';
}

export interface PdfCleanupKindResult {
    purgedCount: number;
    error: string | null;
}

export interface PdfCleanupSummary {
    analytics: PdfCleanupKindResult;
    examReports: PdfCleanupKindResult;
}

function getErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message.trim().length > 0) {
        return error.message;
    }

    return 'Unknown cleanup error.';
}

function isMissingStorageObjectError(error: unknown): boolean {
    const message = getErrorMessage(error).toLowerCase();
    return (
        message.includes('not found') || message.includes('no such') || message.includes('missing')
    );
}

async function purgeExpiredRecords(dbClient: DbClient, targets: CleanupTargets): Promise<number> {
    const now = new Date();
    const expiredRecords = (await dbClient
        .selectFrom(targets.tableName)
        .select([
            `${targets.idColumn} as id`,
            'institution_id as institutionId',
            'storage_bucket as storageBucket',
            'storage_path as storagePath',
            'expires_at as expiresAt',
        ])
        .where('expires_at', '<=', now)
        .where('status', '=', 'READY')
        .execute()) as CleanupCandidateRecord[];

    let purgeCount = 0;

    for (const record of expiredRecords) {
        try {
            if (record.storageBucket && record.storagePath) {
                if (!record.storagePath.startsWith(targets.storagePrefix)) {
                    throw new Error(
                        `Refusing to delete storage path outside ${targets.storagePrefix}: ${record.storagePath}`,
                    );
                }

                try {
                    await PdfStorageService.deletePdf(record.storageBucket, record.storagePath);
                } catch (error) {
                    if (!isMissingStorageObjectError(error)) {
                        throw error;
                    }
                }
            }

            await executeTransaction(async (trx) => {
                await trx
                    .updateTable(targets.tableName)
                    .set({
                        status: 'EXPIRED',
                        storage_bucket: null,
                        storage_path: null,
                    })
                    .where(targets.idColumn, '=', record.id)
                    .execute();
            });

            if (record.institutionId) {
                try {
                    await LogsService.createLog(dbClient, {
                        resourceType: 'system',
                        action: targets.logAction,
                        activeInstitutionId: record.institutionId,
                        details: {
                            exportId: record.id,
                            documentKind: targets.documentKind,
                            expiredAt: record.expiresAt,
                        },
                    });
                } catch (error) {
                    console.warn(
                        `[PDFCleanup] Audit logging failed for ${targets.documentKind} ${record.id}: ${getErrorMessage(error)}`,
                    );
                }
            }

            purgeCount += 1;
        } catch (error) {
            console.error(
                `[PDFCleanup] Failed to purge expired ${targets.documentKind} ${record.id}: ${getErrorMessage(error)}`,
            );
        }
    }

    return purgeCount;
}

export class PdfCleanupService {
    /**
     * Purges expired analytics PDF exports.
     * Deletes only `analytics/...` private storage objects, marks rows `EXPIRED`,
     * clears persisted storage coordinates, and preserves the remaining metadata for audit/history.
     *
     * Storage objects that are already missing are treated as successfully purged. Unexpected
     * storage deletion failures leave the row untouched so operators can reconcile safely later.
     *
     * @param dbClient database client
     * @returns count of successfully purged records
     */
    static async purgeExpiredAnalytics(dbClient: DbClient): Promise<number> {
        return purgeExpiredRecords(dbClient, {
            tableName: 'analytics_reports',
            idColumn: 'report_id',
            storagePrefix: 'analytics/',
            documentKind: 'ANALYTICS_OVERALL',
            logAction: 'PDF_EXPORT_PURGED',
        });
    }

    /**
     * Purges expired examination-results report exports.
     * Deletes only `exam-reports/...` private storage objects, marks rows `EXPIRED`,
     * clears persisted storage coordinates, and preserves the remaining metadata for audit/history.
     *
     * Storage objects that are already missing are treated as successfully purged. Unexpected
     * storage deletion failures leave the row untouched so operators can reconcile safely later.
     *
     * @param dbClient database client
     * @returns count of successfully purged records
     */
    static async purgeExpiredExamReports(dbClient: DbClient): Promise<number> {
        return purgeExpiredRecords(dbClient, {
            tableName: 'exam_report_exports',
            idColumn: 'export_id',
            storagePrefix: 'exam-reports/',
            documentKind: 'EXAM_RESULTS_REPORT',
            logAction: 'EXAM_REPORT_EXPORT_PURGED',
        });
    }

    /**
     * Purges expired analytics and examination-results PDF artifacts independently so one
     * cleanup path failing does not silently skip the other.
     *
     * @param dbClient database client
     * @returns per-document-kind purge counts and error summaries
     */
    static async purgeExpiredPdfArtifacts(dbClient: DbClient): Promise<PdfCleanupSummary> {
        const analytics: PdfCleanupKindResult = {
            purgedCount: 0,
            error: null,
        };
        const examReports: PdfCleanupKindResult = {
            purgedCount: 0,
            error: null,
        };

        try {
            analytics.purgedCount = await PdfCleanupService.purgeExpiredAnalytics(dbClient);
        } catch (error) {
            analytics.error = getErrorMessage(error);
        }

        try {
            examReports.purgedCount = await PdfCleanupService.purgeExpiredExamReports(dbClient);
        } catch (error) {
            examReports.error = getErrorMessage(error);
        }

        return {
            analytics,
            examReports,
        };
    }
}
