import { type DbClient } from '@sentinel/db';
import { EvidenceCorrelationService } from './evidence-correlation.service';
import { EvidenceDeletionService } from './evidence-deletion.service';
import {
    computeEvidenceExpiresAt,
    loadEvidenceRetentionContext,
} from './evidence-retention.service';
import { EvidenceStorageService } from './evidence-storage.service';

const RECONCILIATION_BATCH_SIZE = 50;
const UNLINKED_RECONCILIATION_TIMEOUT_MS = 15 * 60 * 1000;
const STALE_PENDING_UPLOAD_TIMEOUT_MS = 15 * 60 * 1000;

type ReconcileEvidenceResult = {
    processedCount: number;
    details: {
        staleUploadsPurged: number;
        retentionExpiredPurged: number;
        deletedConverged: number;
        unlinkedPurged: number;
    };
};

/**
 * Reconciles out-of-order evidence uploads and converges terminal evidence cleanup states.
 */
export class EvidenceReconciliationService {
    static async reconcileEvidence(db: DbClient): Promise<ReconcileEvidenceResult> {
        const details: ReconcileEvidenceResult['details'] = {
            staleUploadsPurged: 0,
            retentionExpiredPurged: 0,
            deletedConverged: 0,
            unlinkedPurged: 0,
        };

        let processedCount = 0;

        const stalePendingUploads = await db
            .selectFrom('telemetry_incident_evidence')
            .select(['evidence_id', 'received_at'])
            .where('state', '=', 'PENDING_UPLOAD')
            .orderBy('received_at', 'asc')
            .limit(RECONCILIATION_BATCH_SIZE)
            .execute();

        for (const row of stalePendingUploads) {
            const receivedAt =
                row.received_at instanceof Date ? row.received_at : new Date(row.received_at);

            if (Date.now() - receivedAt.getTime() < STALE_PENDING_UPLOAD_TIMEOUT_MS) {
                continue;
            }

            await EvidenceDeletionService.deleteEvidenceForSystemCleanup(db, {
                evidenceId: row.evidence_id,
                deletionReason: 'STALE_PENDING_UPLOAD',
            });
            details.staleUploadsPurged += 1;
            processedCount += 1;
        }

        const failedRows = await db
            .selectFrom('telemetry_incident_evidence')
            .select(['evidence_id'])
            .where('state', '=', 'FAILED')
            .orderBy('updated_at', 'asc')
            .limit(RECONCILIATION_BATCH_SIZE)
            .execute();

        for (const row of failedRows) {
            await EvidenceDeletionService.deleteEvidenceForSystemCleanup(db, {
                evidenceId: row.evidence_id,
                deletionReason: 'OBJECT_MISSING',
            });
            details.deletedConverged += 1;
            processedCount += 1;
        }

        const deletePendingRows = await db
            .selectFrom('telemetry_incident_evidence')
            .select(['evidence_id'])
            .where('state', '=', 'DELETE_PENDING')
            .orderBy('updated_at', 'asc')
            .limit(RECONCILIATION_BATCH_SIZE)
            .execute();

        for (const row of deletePendingRows) {
            await EvidenceDeletionService.deleteEvidenceForSystemCleanup(db, {
                evidenceId: row.evidence_id,
                deletionReason: 'OBJECT_MISSING',
            });
            details.deletedConverged += 1;
            processedCount += 1;
        }

        const expiredRows = await db
            .selectFrom('telemetry_incident_evidence')
            .select(['evidence_id', 'attempt_id', 'captured_at', 'expires_at'])
            .where('state', '=', 'AVAILABLE')
            .where('expires_at', '<=', new Date())
            .orderBy('expires_at', 'asc')
            .limit(RECONCILIATION_BATCH_SIZE)
            .execute();

        for (const row of expiredRows) {
            const retentionContext = await loadEvidenceRetentionContext(db, row.attempt_id);
            const recalculatedExpiresAt = computeEvidenceExpiresAt({
                capturedAt:
                    row.captured_at instanceof Date ? row.captured_at : new Date(row.captured_at),
                examEndsAt: retentionContext.examEndsAt,
                attemptStartedAt: retentionContext.attemptStartedAt,
                attemptCompletedAt: retentionContext.attemptCompletedAt,
            });
            const currentExpiresAt =
                row.expires_at instanceof Date ? row.expires_at : new Date(row.expires_at);

            if (recalculatedExpiresAt.getTime() > currentExpiresAt.getTime()) {
                await db
                    .updateTable('telemetry_incident_evidence')
                    .set({
                        expires_at: recalculatedExpiresAt,
                        updated_at: new Date(),
                    })
                    .where('evidence_id', '=', row.evidence_id)
                    .execute();
                processedCount += 1;
                continue;
            }

            await EvidenceDeletionService.deleteEvidenceForSystemCleanup(db, {
                evidenceId: row.evidence_id,
                deletionReason: 'RETENTION_EXPIRED',
            });
            details.retentionExpiredPurged += 1;
            processedCount += 1;
        }

        const missingObjectRows = await db
            .selectFrom('telemetry_incident_evidence')
            .select(['evidence_id', 'storage_bucket', 'storage_path'])
            .where('state', '=', 'AVAILABLE')
            .where('incident_id', 'is not', null)
            .orderBy('updated_at', 'asc')
            .limit(RECONCILIATION_BATCH_SIZE)
            .execute();

        for (const row of missingObjectRows) {
            if (!row.storage_bucket || !row.storage_path) {
                await EvidenceDeletionService.deleteEvidenceForSystemCleanup(db, {
                    evidenceId: row.evidence_id,
                    deletionReason: 'OBJECT_MISSING',
                });
                details.deletedConverged += 1;
                processedCount += 1;
                continue;
            }

            try {
                await EvidenceStorageService.inspectObject(row.storage_bucket, row.storage_path);
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                if (!message.toLowerCase().includes('not found')) {
                    continue;
                }

                await EvidenceDeletionService.deleteEvidenceForSystemCleanup(db, {
                    evidenceId: row.evidence_id,
                    deletionReason: 'OBJECT_MISSING',
                });
                details.deletedConverged += 1;
                processedCount += 1;
            }
        }

        const unlinkedRows = await db
            .selectFrom('telemetry_incident_evidence')
            .select(['evidence_id', 'attempt_id', 'event_id', 'received_at'])
            .where('state', '=', 'AVAILABLE')
            .where('incident_id', 'is', null)
            .orderBy('received_at', 'asc')
            .limit(RECONCILIATION_BATCH_SIZE)
            .execute();

        for (const row of unlinkedRows) {
            const candidateIncidentIds = await EvidenceCorrelationService.findCandidateIncidentIds(
                db,
                {
                    attemptId: row.attempt_id,
                    eventId: row.event_id,
                },
            );

            if (candidateIncidentIds.length === 1) {
                await EvidenceCorrelationService.linkEvidenceToIncident(db, {
                    attemptId: row.attempt_id,
                    eventId: row.event_id,
                    incidentId: candidateIncidentIds[0]!,
                });
                processedCount += 1;
                continue;
            }

            const receivedAt =
                row.received_at instanceof Date ? row.received_at : new Date(row.received_at);
            const isExpiredForUnlinkedReconciliation =
                Date.now() - receivedAt.getTime() >= UNLINKED_RECONCILIATION_TIMEOUT_MS;

            if (!isExpiredForUnlinkedReconciliation || candidateIncidentIds.length > 1) {
                continue;
            }

            await EvidenceDeletionService.deleteEvidenceForSystemCleanup(db, {
                evidenceId: row.evidence_id,
                deletionReason: 'TELEMETRY_UNLINKED',
            });
            details.unlinkedPurged += 1;
            processedCount += 1;
        }

        return {
            processedCount,
            details,
        };
    }
}
