import { type DbClient } from '@sentinel/db';
import type {
    BatchProctoringEventBody,
    PersistableProctoringEvent,
    ProctoringEventBody,
} from './ingestion.dto';
import { telemetryIngestionQueueService } from './services/ingestion-queue.service';
import { telemetryPolicyService } from './services/telemetry-policy.service';
import { telemetrySettingsResolverService } from '../settings/telemetry-settings-resolver.service';
import { TelemetryStorageService } from '../storage/storage.service';
import type { AppendEventResult } from '../storage/services/incident-persistence.service';
import { HTTPException } from 'hono/http-exception';

import type { TelemetryQueueMode } from './config/ingestion-queue.config';

const EVIDENCE_CANDIDATE_EVENT_TYPES = new Set([
    'GAZE_OFF_SCREEN',
    'NO_FACE_DETECTED',
    'MULTIPLE_FACES',
] as const);

type PreparedTelemetryEvent =
    | {
          settingsRecord: Awaited<ReturnType<typeof telemetrySettingsResolverService.resolve>> | undefined;
          payload: PersistableProctoringEvent;
      }
    | null;

export class TelemetryIngestionService {
    private static async prepareEventForPersistence(
        db: DbClient,
        payload: ProctoringEventBody,
    ): Promise<PreparedTelemetryEvent> {
        const resolvedSettingsRecord = await telemetrySettingsResolverService.resolve(db);
        const settingsRecord =
            resolvedSettingsRecord.updatedAt === null ? undefined : resolvedSettingsRecord;

        if (settingsRecord && !settingsRecord.value.operations.enabled) {
            console.log('[TelemetryIngestion] Event ignored: telemetry disabled globally', {
                attemptId: payload.examSessionId,
                eventType: payload.eventType,
                settingsVersion: settingsRecord.value.version,
            });
            return null;
        }

        console.log('[TelemetryIngestion] Received event', {
            attemptId: payload.examSessionId,
            eventType: payload.eventType,
            platform: payload.platform,
            settingsVersion: settingsRecord?.value.version ?? null,
        });

        const decision = await telemetryPolicyService.filterImportantEvent(
            db,
            payload,
            settingsRecord,
        );

        if (decision.action === 'ignore') {
            return null;
        }

        return {
            settingsRecord,
            payload: decision.payload,
        };
    }

    /**
     * Process an incoming telemetry event.
     * This acts as the buffer/orchestrator before hitting the append-only storage tier.
     * `sync` mode writes inline, while `redis` mode hands work off to BullMQ workers.
     */
    static async processEvent(
        db: DbClient,
        payload: ProctoringEventBody,
    ): Promise<{ mode: TelemetryQueueMode; jobId?: string } | null> {
        const prepared = await this.prepareEventForPersistence(db, payload);
        if (!prepared) {
            return null;
        }

        console.log('[TelemetryIngestion] Submitting event to queue', {
            attemptId: payload.examSessionId,
            eventType: prepared.payload.eventType,
            platform: prepared.payload.platform,
            settingsVersion: prepared.settingsRecord?.value.version ?? null,
        });

        return await telemetryIngestionQueueService.submit(db, prepared.payload, {
            operations: prepared.settingsRecord?.value.operations,
        });
    }

    /**
     * Persists one restricted MediaPipe evidence-candidate event inline and returns the
     * authoritative incident severity decision from storage.
     *
     * This path is intentionally limited to `GAZE_OFF_SCREEN`, `NO_FACE_DETECTED`,
     * and `MULTIPLE_FACES` so evidence eligibility can be decided from the server's
     * resolved severity without routing through the async queue first.
     */
    static async persistEvidenceCandidate(
        db: DbClient,
        payload: ProctoringEventBody,
    ): Promise<AppendEventResult | null> {
        if (
            !EVIDENCE_CANDIDATE_EVENT_TYPES.has(
                payload.eventType as 'GAZE_OFF_SCREEN' | 'NO_FACE_DETECTED' | 'MULTIPLE_FACES',
            )
        ) {
            throw new HTTPException(400, {
                message: `Unsupported evidence candidate event type: ${payload.eventType}`,
            });
        }

        const prepared = await this.prepareEventForPersistence(db, payload);
        if (!prepared) {
            return null;
        }

        return TelemetryStorageService.appendEvent(db, prepared.payload);
    }

    /**
     * Process a batch of telemetry events.
     * Buffers all persistent events into a Redis list for high-throughput cron flushing.
     */
    static async processBatch(db: DbClient, payloads: BatchProctoringEventBody): Promise<void> {
        const resolvedSettingsRecord = await telemetrySettingsResolverService.resolve(db);
        const settingsRecord =
            resolvedSettingsRecord.updatedAt === null ? undefined : resolvedSettingsRecord;

        if (settingsRecord && !settingsRecord.value.operations.enabled) {
            console.log('[TelemetryIngestion] Batch ignored: telemetry disabled globally', {
                eventCount: payloads.length,
                attemptId: payloads[0]?.examSessionId,
                settingsVersion: settingsRecord.value.version,
            });
            return;
        }

        console.log('[TelemetryIngestion] Received batch', {
            eventCount: payloads.length,
            attemptId: payloads[0]?.examSessionId,
            settingsVersion: settingsRecord?.value.version ?? null,
        });

        const persistableEvents: PersistableProctoringEvent[] = [];

        // Apply policy filtering to each event in the batch
        for (const payload of payloads) {
            const decision = await telemetryPolicyService.filterImportantEvent(
                db,
                payload,
                settingsRecord,
            );
            if (decision.action === 'persist') {
                persistableEvents.push(decision.payload);
            }
        }

        if (persistableEvents.length === 0) {
            return;
        }

        console.log('[TelemetryIngestion] Buffering batch events', {
            count: persistableEvents.length,
            attemptId: persistableEvents[0]?.examSessionId,
            settingsVersion: settingsRecord?.value.version ?? null,
            batchingEnabled: settingsRecord?.value.operations.batchingEnabled ?? null,
            maxBatchSize: settingsRecord?.value.operations.maxBatchSize ?? null,
        });

        // Use the buffer path instead of BullMQ for high-frequency batch data
        await telemetryIngestionQueueService.bufferBatch(db, persistableEvents, {
            operations: settingsRecord?.value.operations,
        });
    }
}
