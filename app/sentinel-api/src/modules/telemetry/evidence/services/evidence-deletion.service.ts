import { executeTransaction, type DbClient } from '@sentinel/db';
import { HTTPException } from 'hono/http-exception';
import { ActivityLogsService } from '../../../general/logs/services/activity-logs.service';
import { type UserQueryScope } from '../../storage/data/query-scoping';
import { TelemetryStorageService } from '../../storage/storage.service';
import { EvidenceStorageService } from './evidence-storage.service';

type EvidenceDeletionReason =
    | 'INSTRUCTOR_REVIEW'
    | 'RETENTION_EXPIRED'
    | 'ATTEMPT_DELETED'
    | 'STALE_PENDING_UPLOAD'
    | 'TELEMETRY_UNLINKED'
    | 'OBJECT_MISSING';

/**
 * Service to handle evidence deletion requests from instructors or retention processes.
 */
export class EvidenceDeletionService {
    private static async convergeDeletion(args: {
        db: DbClient;
        evidenceId: string;
        deletionReason: EvidenceDeletionReason;
        actorUserId?: string | null;
        scopedInstitutionId?: string;
        userScope?: UserQueryScope;
        ipAddress?: string | null;
        enforceScope?: boolean;
    }) {
        const {
            db,
            evidenceId,
            deletionReason,
            actorUserId = null,
            scopedInstitutionId,
            userScope,
            ipAddress,
            enforceScope = false,
        } = args;

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

        if (evidence.state === 'DELETED' || evidence.state === 'EXPIRED') {
            return;
        }

        if (enforceScope) {
            if (!userScope) {
                throw new HTTPException(500, { message: 'Missing user scope for evidence deletion.' });
            }

            if (evidence.incident_id) {
                await TelemetryStorageService.getIncidentById(
                    db,
                    evidence.incident_id,
                    scopedInstitutionId,
                    userScope,
                );
            } else if (scopedInstitutionId && evidence.institution_id !== scopedInstitutionId) {
                throw new HTTPException(403, {
                    message: 'Forbidden: Evidence does not belong to authorized institution.',
                });
            }
        }

        await executeTransaction(async (trx) => {
            await trx
                .updateTable('telemetry_incident_evidence')
                .set({
                    state: 'DELETE_PENDING',
                    updated_at: new Date(),
                })
                .where('evidence_id', '=', evidenceId)
                .where('state', 'not in', ['DELETED', 'EXPIRED'])
                .execute();
        });

        if (evidence.storage_bucket && evidence.storage_path) {
            try {
                await EvidenceStorageService.deleteObject(
                    evidence.storage_bucket,
                    evidence.storage_path,
                );
            } catch (err: any) {
                const message = err?.message ?? String(err);
                if (!message.toLowerCase().includes('not found')) {
                    throw new HTTPException(502, {
                        message: `Failed to delete storage file: ${message}`,
                    });
                }
            }
        }

        const terminalState = deletionReason === 'RETENTION_EXPIRED' ? 'EXPIRED' : 'DELETED';

        await executeTransaction(async (trx) => {
            await trx
                .updateTable('telemetry_incident_evidence')
                .set({
                    state: terminalState,
                    deletion_reason: deletionReason,
                    deleted_at: new Date(),
                    deleted_by: actorUserId,
                    storage_bucket: null,
                    storage_path: null,
                    updated_at: new Date(),
                })
                .where('evidence_id', '=', evidenceId)
                .execute();
        });

        if (enforceScope && actorUserId) {
            await ActivityLogsService.logActivityEvent(db, {
                userId: actorUserId,
                action: 'incident_evidence.delete',
                resourceType: 'incident_evidence',
                resourceId: evidenceId,
                details: {
                    incidentId: evidence.incident_id,
                    attemptId: evidence.attempt_id,
                    deletionReason,
                },
                ipAddress,
                institutionId: evidence.institution_id,
            });
        }
    }

    /**
     * Deletes an evidence record for an authorized reviewer.
     */
    static async deleteEvidence(
        db: DbClient,
        evidenceId: string,
        scopedInstitutionId: string | undefined,
        userScope: UserQueryScope,
        actorUserId: string,
        ipAddress?: string | null,
    ): Promise<void> {
        await EvidenceDeletionService.convergeDeletion({
            db,
            evidenceId,
            deletionReason: 'INSTRUCTOR_REVIEW',
            actorUserId,
            scopedInstitutionId,
            userScope,
            ipAddress,
            enforceScope: true,
        });
    }

    /**
     * Deletes evidence for internal lifecycle cleanup without reviewer scope checks.
     */
    static async deleteEvidenceForSystemCleanup(
        db: DbClient,
        args: {
            evidenceId: string;
            deletionReason: Exclude<EvidenceDeletionReason, 'INSTRUCTOR_REVIEW'>;
        },
    ) {
        await EvidenceDeletionService.convergeDeletion({
            db,
            evidenceId: args.evidenceId,
            deletionReason: args.deletionReason,
            enforceScope: false,
        });
    }
}
