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
import type {
    AppendEventResult,
    DeferredIncidentSideEffectsResult,
    IngestSessionType,
} from './incident-persistence.types';

export type {
    AppendEventResult,
    DeferredIncidentSideEffectsResult,
    IngestSessionType,
} from './incident-persistence.types';

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

async function persistIncidentRecord(
    db: DbClient,
    payload: PersistableProctoringEvent,
    preloadedSession?: IngestSessionType,
): Promise<AppendEventResult | null> {
    return executeWithTransactionFallback(db, async (trx) => {
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
}

/**
 * Executes the incident side effects associated with a persisted telemetry
 * result. The caller decides when to invoke it so evidence candidates can
 * defer these effects until upload eligibility has been established.
 */
export async function runDeferredIncidentSideEffects(
    db: DbClient,
    payload: PersistableProctoringEvent,
    result: AppendEventResult,
): Promise<void> {
    if (result.disposition === 'duplicate-ignored') {
        return;
    }

    await handleIncidentSideEffects(db, payload, result);
}

function buildDeferredIncidentSideEffects(
    db: DbClient,
    payload: PersistableProctoringEvent,
    result: AppendEventResult,
): DeferredIncidentSideEffectsResult {
    let didRun = false;

    return {
        ...result,
        payload,
        runSideEffects: async () => {
            if (didRun) {
                return;
            }

            didRun = true;
            await runDeferredIncidentSideEffects(db, payload, result);
        },
    };
}

export class IncidentPersistenceService {
    static async appendEvent(
        db: DbClient,
        payload: PersistableProctoringEvent,
        preloadedSession?: IngestSessionType,
    ): Promise<AppendEventResult | null> {
        const result = await persistIncidentRecord(db, payload, preloadedSession);

        if (result) {
            await runDeferredIncidentSideEffects(db, payload, result);
        }

        return result;
    }

    static async appendEventDeferred(
        db: DbClient,
        payload: PersistableProctoringEvent,
        preloadedSession?: IngestSessionType,
    ): Promise<DeferredIncidentSideEffectsResult | null> {
        const result = await persistIncidentRecord(db, payload, preloadedSession);

        if (!result) {
            return null;
        }

        return buildDeferredIncidentSideEffects(db, payload, result);
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
