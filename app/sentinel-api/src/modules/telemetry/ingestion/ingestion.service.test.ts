import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TelemetryIngestionService } from './ingestion.service';
import { telemetrySettingsResolverService } from '../settings/telemetry-settings-resolver.service';
import { telemetryPolicyService } from './services/telemetry-policy.service';
import { TelemetryStorageService } from '../storage/storage.service';
import { telemetryIngestionQueueService } from './services/ingestion-queue.service';
import type { AppendEventResult } from '../storage/services/incident-persistence.service';

vi.mock('../settings/telemetry-settings-resolver.service', () => ({
    telemetrySettingsResolverService: {
        resolve: vi.fn(),
    },
}));

vi.mock('./services/telemetry-policy.service', () => ({
    telemetryPolicyService: {
        filterImportantEvent: vi.fn(),
    },
}));

vi.mock('../storage/storage.service', () => ({
    TelemetryStorageService: {
        appendEvent: vi.fn(),
        appendBatch: vi.fn(),
    },
}));

vi.mock('./services/ingestion-queue.service', () => ({
    telemetryIngestionQueueService: {
        submit: vi.fn(),
        bufferBatch: vi.fn(),
    },
}));

describe('TelemetryIngestionService.persistEvidenceCandidate', () => {
    const dbClient = {} as never;
    const candidatePayload = {
        examSessionId: '123e4567-e89b-12d3-a456-426614174000',
        studentId: '123e4567-e89b-12d3-a456-426614174001',
        timestamp: '2026-07-28T00:00:00.000Z',
        platform: 'WEB',
        source: 'AI',
        ruleKey: 'aiRules.face_detection',
        eventType: 'NO_FACE_DETECTED',
        metadata: {
            eventId: '123e4567-e89b-12d3-a456-426614174999',
            dedupeKey: 'attempt:NO_FACE_DETECTED:123e4567-e89b-12d3-a456-426614174999',
            clientActionAt: '2026-07-28T00:00:00.250Z',
        },
    } as const;

    const resolvedSettingsRecord = {
        key: 'telemetry-settings',
        category: 'telemetry',
        description: 'Telemetry settings',
        updatedAt: new Date('2026-07-28T00:00:00.000Z'),
        updatedBy: 'Sentinel Test',
        value: {
            version: 1,
            operations: {
                enabled: true,
                ingestionMode: 'sync',
                batchingEnabled: true,
                batchWindowMs: 5000,
                maxBatchSize: 500,
                dedupeWindowSeconds: 120,
            },
            ruleOverrides: {
                'aiRules.gaze_tracking': {},
                'aiRules.face_detection': {},
                'aiRules.audio_anomaly_detection': {},
                'aiRules.multiple_faces_detection': {},
                'webSecurity.tab_switching_monitor': {},
                'webSecurity.full_screen_required': {},
                'webSecurity.clipboard_control': {},
                'webSecurity.right_click_disable': {},
                'webSecurity.print_screen_disable': {},
                'mobileSecurity.app_pinning_required': {},
                'mobileSecurity.prevent_backgrounding': {},
                'mobileSecurity.notification_block': {},
                'mobileSecurity.screenshot_block': {},
                'mobileSecurity.root_jailbreak_detection': {},
            },
            mediaPipeSandbox: {
                enabled: false,
                captureDuringCheckup: false,
                emitDuringExam: false,
                confidenceThreshold: 0.8,
                frameIntervalMs: 500,
                offScreenDurationMs: 3000,
                calibrationRequired: false,
                debugOverlayEnabled: false,
            },
        },
    } as const;

    const persistablePayload = {
        ...candidatePayload,
        runtimeSettingsSnapshot: {
            version: 1,
            operations: resolvedSettingsRecord.value.operations,
            ruleOverrideApplied: null,
        },
    };

    const appendResult: AppendEventResult = {
        incidentId: '123e4567-e89b-12d3-a456-426614174555',
        finalSeverity: 'MEDIUM',
        isNew: false,
        disposition: 'aggregated',
        previousSeverity: 'LOW',
        institutionId: '123e4567-e89b-12d3-a456-426614174777',
        studentUserId: '123e4567-e89b-12d3-a456-426614174001',
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(telemetrySettingsResolverService.resolve).mockResolvedValue(
            resolvedSettingsRecord as never,
        );
        vi.mocked(telemetryPolicyService.filterImportantEvent).mockResolvedValue({
            action: 'persist',
            payload: persistablePayload,
        } as never);
        vi.mocked(TelemetryStorageService.appendEvent).mockResolvedValue(appendResult);
        vi.mocked(telemetryIngestionQueueService.submit).mockResolvedValue({
            mode: 'redis',
            jobId: 'job-1',
        });
    });

    it('returns null when telemetry is globally disabled', async () => {
        vi.mocked(telemetrySettingsResolverService.resolve).mockResolvedValue({
            ...resolvedSettingsRecord,
            value: {
                ...resolvedSettingsRecord.value,
                operations: {
                    ...resolvedSettingsRecord.value.operations,
                    enabled: false,
                },
            },
        } as never);

        const result = await TelemetryIngestionService.persistEvidenceCandidate(
            dbClient,
            candidatePayload as never,
        );

        expect(result).toBeNull();
        expect(telemetryPolicyService.filterImportantEvent).not.toHaveBeenCalled();
        expect(TelemetryStorageService.appendEvent).not.toHaveBeenCalled();
        expect(telemetryIngestionQueueService.submit).not.toHaveBeenCalled();
    });

    it('returns null when telemetry policy ignores the candidate', async () => {
        vi.mocked(telemetryPolicyService.filterImportantEvent).mockResolvedValue({
            action: 'ignore',
        } as never);

        const result = await TelemetryIngestionService.persistEvidenceCandidate(
            dbClient,
            candidatePayload as never,
        );

        expect(result).toBeNull();
        expect(TelemetryStorageService.appendEvent).not.toHaveBeenCalled();
        expect(telemetryIngestionQueueService.submit).not.toHaveBeenCalled();
    });

    it('persists candidates inline in configured sync mode and returns the append result', async () => {
        const result = await TelemetryIngestionService.persistEvidenceCandidate(
            dbClient,
            candidatePayload as never,
        );

        expect(result).toEqual(appendResult);
        expect(TelemetryStorageService.appendEvent).toHaveBeenCalledWith(
            dbClient,
            persistablePayload,
        );
        expect(telemetryIngestionQueueService.submit).not.toHaveBeenCalled();
    });

    it('persists candidates inline even when settings are configured for redis mode', async () => {
        vi.mocked(telemetrySettingsResolverService.resolve).mockResolvedValue({
            ...resolvedSettingsRecord,
            value: {
                ...resolvedSettingsRecord.value,
                operations: {
                    ...resolvedSettingsRecord.value.operations,
                    ingestionMode: 'redis',
                },
            },
        } as never);

        const result = await TelemetryIngestionService.persistEvidenceCandidate(
            dbClient,
            candidatePayload as never,
        );

        expect(result).toEqual(appendResult);
        expect(TelemetryStorageService.appendEvent).toHaveBeenCalledOnce();
        expect(telemetryIngestionQueueService.submit).not.toHaveBeenCalled();
    });
});
