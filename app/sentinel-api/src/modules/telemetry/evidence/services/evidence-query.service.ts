import { type DbClient } from '@sentinel/db';
import { HTTPException } from 'hono/http-exception';
import { getEvidenceViewTtlSeconds } from '../evidence.constants';
import { EvidenceStorageService } from './evidence-storage.service';
import { TelemetryStorageService } from '../../storage/storage.service';
import { ActivityLogsService } from '../../../general/logs/services/activity-logs.service';
import { type UserQueryScope } from '../../storage/data/query-scoping';

/**
 * Service to handle querying evidence metadata and generating signed view URLs.
 */
export class EvidenceQueryService {
    /**
     * Retrieves all evidence records associated with a specific incident.
     * Validates incident access/scoping first.
     * Generates signed view URLs only for AVAILABLE evidence.
     * Logs the view action in the activity logs.
     */
    static async getIncidentEvidence(
        db: DbClient,
        incidentId: string,
        scopedInstitutionId: string | undefined,
        userScope: UserQueryScope,
        actorUserId: string,
        ipAddress?: string | null,
    ) {
        // 1. Resolve incident to enforce scoping and permissions (throws if unauthorized or not found)
        const incident = await TelemetryStorageService.getIncidentById(
            db,
            incidentId,
            scopedInstitutionId,
            userScope,
        );

        if (!incident) {
            throw new HTTPException(404, { message: 'Incident not found' });
        }

        // 2. Fetch evidence linked to this incident
        const evidenceRows = await db
            .selectFrom('telemetry_incident_evidence')
            .selectAll()
            .where('incident_id', '=', incidentId)
            .orderBy('captured_at', 'asc')
            .execute();

        const viewTtl = getEvidenceViewTtlSeconds();

        // 3. Process each evidence row
        const results = [];
        for (const row of evidenceRows) {
            let signedUrl: string | undefined;

            if (row.state === 'AVAILABLE' && row.storage_bucket && row.storage_path) {
                try {
                    signedUrl = await EvidenceStorageService.createSignedViewUrl(
                        row.storage_bucket,
                        row.storage_path,
                        viewTtl,
                    );

                    // Log the view event
                    await ActivityLogsService.logActivityEvent(db, {
                        userId: actorUserId,
                        action: 'incident_evidence.view',
                        resourceType: 'incident_evidence',
                        resourceId: row.evidence_id,
                        details: {
                            incidentId,
                            attemptId: row.attempt_id,
                            state: row.state,
                        },
                        ipAddress,
                        institutionId: row.institution_id,
                    });
                } catch (err: any) {
                    // Log failure to generate view URL, but don't crash listing other evidence
                    console.error(`Failed to generate signed view URL for evidence ${row.evidence_id}:`, err);
                }
            }

            results.push({
                evidenceId: row.evidence_id,
                attemptId: row.attempt_id,
                incidentId: row.incident_id,
                eventId: row.event_id,
                eventType: row.event_type,
                capturedAt: row.captured_at.toISOString(),
                state: row.state,
                expiresAt: row.expires_at.toISOString(),
                ...(signedUrl ? { signedUrl } : {}),
            });
        }

        return results;
    }
}
