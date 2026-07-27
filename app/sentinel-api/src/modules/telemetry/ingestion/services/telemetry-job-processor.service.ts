import type { DbClient } from '@sentinel/db';
import { HTTPException } from 'hono/http-exception';
import type { PersistableProctoringEvent } from '../ingestion.dto';
import { TelemetryStorageService } from '../../storage/storage.service';

export type TelemetryJobProcessingResult = 'inserted' | 'aggregated' | 'duplicate-ignored' | 'dropped';

export function buildTelemetryJobLogContext(payload: PersistableProctoringEvent) {
    return {
        attemptId: payload.examSessionId,
        studentId: payload.studentId,
        eventType: payload.eventType,
        ruleKey: payload.ruleKey,
        timestamp: payload.timestamp,
        eventId: payload.metadata?.eventId ?? null,
        dedupeKey: payload.metadata?.dedupeKey ?? null,
    };
}

function isTerminalTelemetryStorageError(error: unknown): error is HTTPException {
    if (!(error instanceof HTTPException)) {
        return false;
    }

    return error.status === 404 || error.status === 409;
}

export async function processQueuedTelemetryEvent(
    db: DbClient,
    payload: PersistableProctoringEvent,
): Promise<TelemetryJobProcessingResult> {
    try {
        const result = await TelemetryStorageService.appendEvent(db, payload);
        if (result === null || result.disposition === 'duplicate-ignored') {
            return 'duplicate-ignored';
        }
        return result.disposition;
    } catch (error) {
        if (!isTerminalTelemetryStorageError(error)) {
            throw error;
        }

        console.warn('[TelemetryWorker] Dropping terminal telemetry job.', {
            status: error.status,
            message: error.message,
            ...buildTelemetryJobLogContext(payload),
        });

        return 'dropped';
    }
}
