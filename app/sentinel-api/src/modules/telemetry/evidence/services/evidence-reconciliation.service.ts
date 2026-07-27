import { type DbClient } from '@sentinel/db';
import { EvidenceCorrelationService } from './evidence-correlation.service';
import { EvidenceStorageService } from './evidence-storage.service';

const UNLINKED_RECONCILIATION_BATCH_SIZE = 100;
const UNLINKED_RECONCILIATION_TIMEOUT_MS = 15 * 60 * 1000;

type ReconcileEvidenceResult = {
    processedCount: number;
    details: {
        staleUploadsPurged: number;
        retentionExpiredPurged: number;
        deletedConverged: number;
        unlinkedPurged: number;
    };
};

async function purgeUnlinkedEvidence(db: DbClient, evidence: {
    evidence_id: string;
    storage_bucket: string | null;
    storage_path: string | null;
}) {
    if (evidence.storage_bucket && evidence.storage_path) {
        try {
            await EvidenceStorageService.deleteObject(
                evidence.storage_bucket,
                evidence.storage_path,
            );
        } catch (error) {
            console.error('[TelemetryEvidence] Failed to purge unlinked evidence object.', {
                evidenceId: evidence.evidence_id,
                error: error instanceof Error ? error.message : error,
            });
            return false;
        }
    }

    await db
        .updateTable('telemetry_incident_evidence')
        .set({
            state: 'DELETED',
            deletion_reason: 'TELEMETRY_UNLINKED',
            deleted_at: new Date(),
            storage_bucket: null,
            storage_path: null,
            updated_at: new Date(),
        })
        .where('evidence_id', '=', evidence.evidence_id)
        .execute();

    return true;
}

/**
 * Reconciles out-of-order evidence uploads after telemetry persistence.
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

        const unlinkedRows = await db
            .selectFrom('telemetry_incident_evidence')
            .select([
                'evidence_id',
                'attempt_id',
                'event_id',
                'received_at',
                'storage_bucket',
                'storage_path',
            ])
            .where('state', '=', 'AVAILABLE')
            .where('incident_id', 'is', null)
            .orderBy('received_at', 'asc')
            .limit(UNLINKED_RECONCILIATION_BATCH_SIZE)
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

            const purged = await purgeUnlinkedEvidence(db, row);
            if (purged) {
                details.unlinkedPurged += 1;
                processedCount += 1;
            }
        }

        return {
            processedCount,
            details,
        };
    }
}
