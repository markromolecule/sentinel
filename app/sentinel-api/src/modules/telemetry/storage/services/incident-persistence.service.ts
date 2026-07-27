import { type DbClient } from '@sentinel/db';
import { HTTPException } from 'hono/http-exception';
import type { PersistableProctoringEvent } from '../../ingestion/ingestion.dto';
import { EvidenceCorrelationService } from '../../evidence/services/evidence-correlation.service';
import { appendIncidentRecord } from './incident-writer.service';
import { handleIncidentSideEffects } from './incident-side-effects.service';
import {
    checkTelemetrySessionEligibility,
    fetchTelemetryIngestSession,
    resolveTelemetrySessionEligibility,
} from './incident-session-eligibility.service';
import type { AppendEventResult, IngestSessionType } from './incident-persistence.types';

export type { AppendEventResult, IngestSessionType } from './incident-persistence.types';

function logIgnoredTelemetryEvent(message: string, attemptId: string): void {
    console.warn(`[TelemetryStorage] ${message}`, { attemptId });
}

async function executeWithTransactionFallback<T>(
    db: DbClient,
    callback: (trx: DbClient) => Promise<T>,
): Promise<T> {
    if (typeof db.transaction !== 'function') {
        return callback(db);
    }

    try {
        return await db.transaction().execute(callback);
    } catch (error) {
        if (error instanceof Error && error.message.includes('does not support transactions')) {
            return callback(db);
        }

        throw error;
    }
}

export class IncidentPersistenceService {
    static async appendEvent(
        db: DbClient,
        payload: PersistableProctoringEvent,
        preloadedSession?: IngestSessionType,
    ): Promise<AppendEventResult | null> {
        const result = await executeWithTransactionFallback(db, async (trx) => {
            const eligibility = preloadedSession
                ? checkTelemetrySessionEligibility(preloadedSession, payload)
                : await resolveTelemetrySessionEligibility(trx, payload);

            if (!eligibility.ok) {
                if (eligibility.errorType === 'IGNORE_SILENTLY') {
                    logIgnoredTelemetryEvent(eligibility.message, payload.examSessionId);
                    return null;
                }

                throw new HTTPException(eligibility.errorType, {
                    message: eligibility.message,
                });
            }

            const result = await appendIncidentRecord({
                db: trx,
                payload,
                session: eligibility.session,
            });

            if (result && payload.metadata?.eventId) {
                await EvidenceCorrelationService.linkEvidenceToIncident(trx, {
                    attemptId: eligibility.session.attempt_id,
                    eventId: payload.metadata.eventId,
                    incidentId: result.incidentId,
                });
            }

            return result;
        });

        if (result && result.disposition !== 'duplicate-ignored') {
            await handleIncidentSideEffects(db, payload, result);
        }

        return result;
    }

    static async appendBatch(db: DbClient, events: PersistableProctoringEvent[]): Promise<void> {
        if (events.length === 0) {
            return;
        }

        const groups = new Map<string, PersistableProctoringEvent[]>();
        for (const event of events) {
            groups.set(event.examSessionId, [...(groups.get(event.examSessionId) ?? []), event]);
        }

        for (const [sessionId, sessionEvents] of groups.entries()) {
            const session = await fetchTelemetryIngestSession(db, sessionId);

            if (!session) {
                console.error('[TelemetryStorage] Batch failure: exam session not found', {
                    sessionId,
                });
                continue;
            }

            for (const event of sessionEvents) {
                try {
                    await this.appendEvent(db, event, session);
                } catch (error) {
                    console.error('[TelemetryStorage] Batch event processing failed', {
                        sessionId,
                        eventType: event.eventType,
                        error: error instanceof Error ? error.message : error,
                    });
                }
            }

            console.log('[TelemetryStorage] Batch session processed successfully', {
                count: sessionEvents.length,
                attemptId: sessionId,
            });
        }
    }
}
