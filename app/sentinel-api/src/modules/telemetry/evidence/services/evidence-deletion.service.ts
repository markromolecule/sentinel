import { type DbClient } from '@sentinel/db';
import { HTTPException } from 'hono/http-exception';
import { EvidenceStorageService } from './evidence-storage.service';
import { TelemetryStorageService } from '../../storage/storage.service';
import { ActivityLogsService } from '../../../general/logs/services/activity-logs.service';
import { type UserQueryScope } from '../../storage/data/query-scoping';
import { executeTransaction } from '@sentinel/db';

/**
 * Service to handle evidence deletion requests from instructors or retention processes.
 */
export class EvidenceDeletionService {
    /**
     * Deletes an evidence record.
     * Enforces instructor scoping and permission checks.
     * Transitions state from AVAILABLE -> DELETE_PENDING -> DELETED.
     * Deletes storage object and clears database storage coordinates.
     */
    static async deleteEvidence(
        db: DbClient,
        evidenceId: string,
        scopedInstitutionId: string | undefined,
        userScope: UserQueryScope,
        actorUserId: string,
        ipAddress?: string | null,
    ): Promise<void> {
        // 1. Fetch the evidence record
        const evidence = await db
            .selectFrom('telemetry_incident_evidence as tie')
            .select([
                'tie.evidence_id',
                'tie.incident_id',
                'tie.attempt_id',
                'tie.institution_id',
                'tie.state',
                'tie.storage_bucket',
                'tie.storage_path',
            ])
            .where('tie.evidence_id', '=', evidenceId)
            .executeTakeFirst();

        if (!evidence) {
            throw new HTTPException(404, { message: 'Evidence record not found' });
        }

        // Idempotently return if already deleted or expired
        if (evidence.state === 'DELETED' || evidence.state === 'EXPIRED') {
            return;
        }

        // 2. Validate tenant and incident/attempt scope
        if (evidence.incident_id) {
            // Reuses existing incident review/view scoping checks
            await TelemetryStorageService.getIncidentById(
                db,
                evidence.incident_id,
                scopedInstitutionId,
                userScope,
            );
        } else {
            // Fallback for unlinked evidence: check institution
            if (scopedInstitutionId && evidence.institution_id !== scopedInstitutionId) {
                throw new HTTPException(403, {
                    message: 'Forbidden: Evidence does not belong to authorized institution.',
                });
            }
        }

        // 3. Move state to DELETE_PENDING
        await executeTransaction(async (trx) => {
            await trx
                .updateTable('telemetry_incident_evidence')
                .set({
                    state: 'DELETE_PENDING',
                    updated_at: new Date(),
                })
                .where('evidence_id', '=', evidenceId)
                .execute();
        });

        // 4. Perform storage object deletion
        const bucket = evidence.storage_bucket;
        const path = evidence.storage_path;

        if (bucket && path) {
            try {
                await EvidenceStorageService.deleteObject(bucket, path);
            } catch (err: any) {
                // If storage deletion fails, keep state as DELETE_PENDING for reconciliation cleanup
                throw new HTTPException(502, {
                    message: `Failed to delete storage file: ${err.message}`,
                });
            }
        }

        // 5. Complete state transition to DELETED and clear coordinates
        await executeTransaction(async (trx) => {
            await trx
                .updateTable('telemetry_incident_evidence')
                .set({
                    state: 'DELETED',
                    deletion_reason: 'INSTRUCTOR_REVIEW',
                    deleted_at: new Date(),
                    deleted_by: actorUserId,
                    storage_bucket: null,
                    storage_path: null,
                    updated_at: new Date(),
                })
                .where('evidence_id', '=', evidenceId)
                .execute();
        });

        // 6. Log activity event
        await ActivityLogsService.logActivityEvent(db, {
            userId: actorUserId,
            action: 'incident_evidence.delete',
            resourceType: 'incident_evidence',
            resourceId: evidenceId,
            details: {
                incidentId: evidence.incident_id,
                attemptId: evidence.attempt_id,
                deletionReason: 'INSTRUCTOR_REVIEW',
            },
            ipAddress,
            institutionId: evidence.institution_id,
        });
    }
}
