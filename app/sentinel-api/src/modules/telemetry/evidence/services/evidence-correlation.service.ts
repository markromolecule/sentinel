import { type DbClient } from '@sentinel/db';
import { HTTPException } from 'hono/http-exception';
import { parseIncidentDetails } from '../../storage/services/incident-details.utils';

export type LinkEvidenceToIncidentArgs = {
    attemptId: string;
    eventId: string;
    incidentId: string;
};

export type LinkEvidenceToIncidentResult =
    | { status: 'linked'; evidenceId: string }
    | { status: 'already-linked'; evidenceId: string }
    | { status: 'missing' };

function extractEventId(details: unknown) {
    const parsed = parseIncidentDetails(details);
    const lastEvent = parsed.lastEvent;

    if (!lastEvent || typeof lastEvent !== 'object' || Array.isArray(lastEvent)) {
        return null;
    }

    const metadata =
        'metadata' in lastEvent &&
        lastEvent.metadata &&
        typeof lastEvent.metadata === 'object' &&
        !Array.isArray(lastEvent.metadata)
            ? (lastEvent.metadata as Record<string, unknown>)
            : null;

    return metadata && typeof metadata.eventId === 'string' ? metadata.eventId : null;
}

function extractDedupeKey(details: unknown) {
    const parsed = parseIncidentDetails(details);
    const lastEvent = parsed.lastEvent;

    if (!lastEvent || typeof lastEvent !== 'object' || Array.isArray(lastEvent)) {
        return null;
    }

    const metadata =
        'metadata' in lastEvent &&
        lastEvent.metadata &&
        typeof lastEvent.metadata === 'object' &&
        !Array.isArray(lastEvent.metadata)
            ? (lastEvent.metadata as Record<string, unknown>)
            : null;

    return metadata && typeof metadata.dedupeKey === 'string' ? metadata.dedupeKey : null;
}

/**
 * Links one evidence row to the incident chosen by telemetry persistence.
 * The operation is idempotent for the same incident and rejects conflicting links.
 */
export class EvidenceCorrelationService {
    static async linkEvidenceToIncident(
        db: DbClient,
        { attemptId, eventId, incidentId }: LinkEvidenceToIncidentArgs,
    ): Promise<LinkEvidenceToIncidentResult> {
        const evidence = await db
            .selectFrom('telemetry_incident_evidence')
            .select(['evidence_id', 'incident_id'])
            .where('attempt_id', '=', attemptId)
            .where('event_id', '=', eventId)
            .executeTakeFirst();

        if (!evidence) {
            return { status: 'missing' };
        }

        if (evidence.incident_id === incidentId) {
            return {
                status: 'already-linked',
                evidenceId: evidence.evidence_id,
            };
        }

        if (evidence.incident_id) {
            throw new HTTPException(409, {
                message: 'Evidence row is already linked to a different incident.',
            });
        }

        await db
            .updateTable('telemetry_incident_evidence')
            .set({
                incident_id: incidentId,
                updated_at: new Date(),
            })
            .where('evidence_id', '=', evidence.evidence_id)
            .where('incident_id', 'is', null)
            .execute();

        return {
            status: 'linked',
            evidenceId: evidence.evidence_id,
        };
    }

    /**
     * Resolves candidate incident ids for an unlinked evidence row using the exact
     * telemetry event UUID first, then the stored dedupe key when the UUID is only
     * embedded in that key.
     */
    static async findCandidateIncidentIds(
        db: DbClient,
        args: { attemptId: string; eventId: string },
    ): Promise<string[]> {
        const candidates = await db
            .selectFrom('flagged_incidents')
            .select(['incident_id', 'details', 'dedupe_key'])
            .where('attempt_id', '=', args.attemptId)
            .orderBy('timestamp', 'desc')
            .execute();

        return candidates
            .filter((candidate) => {
                const detailEventId = extractEventId(candidate.details);
                if (detailEventId === args.eventId) {
                    return true;
                }

                const detailDedupeKey = extractDedupeKey(candidate.details);
                if (detailDedupeKey?.includes(args.eventId)) {
                    return true;
                }

                return candidate.dedupe_key?.includes(args.eventId) ?? false;
            })
            .map((candidate) => candidate.incident_id);
    }
}
