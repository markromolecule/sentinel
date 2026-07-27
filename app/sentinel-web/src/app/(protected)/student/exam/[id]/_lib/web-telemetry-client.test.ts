import { TELEMETRY_EVENT_DEFINITIONS, type ExamConfig } from '@sentinel/shared';
import type { ApiClientType } from '@sentinel/services';
import { describe, expect, it, vi } from 'vitest';
import {
    buildWebTelemetryPayload,
    buildMobileTelemetryPayload,
    buildAttemptMediaPipeTelemetryPayload,
    emitMediaPipeTelemetryEvent,
    emitWebTelemetryEvent,
    isMediaPipeTelemetryEventEnabled,
    isWebTelemetryEventEnabled,
} from './web-telemetry-client';

function createExamConfiguration(overrides: Partial<ExamConfig['webSecurity']> = {}): ExamConfig {
    return {
        lobbyAdmissionMode: 'AUTOMATIC',
        maxReconnectAttempts: 3,
        strictMode: true,
        screenLock: true,
        cameraRequired: true,
        micRequired: true,
        autoSubmitTimeoutMinutes: 5,
        aiRules: {
            gaze_tracking: true,
            face_detection: true,
            audio_anomaly_detection: true,
            multiple_faces_detection: true,
        },
        webSecurity: {
            tab_switching_monitor: true,
            full_screen_required: true,
            clipboard_control: true,
            right_click_disable: true,
            print_screen_disable: true,
            ...overrides,
        },
        mobileSecurity: {
            app_pinning_required: true,
            prevent_backgrounding: true,
            notification_block: true,
            screenshot_block: true,
            root_jailbreak_detection: true,
        },
    };
}

describe('web-telemetry-client', () => {
    it('gates web telemetry by the active configuration rule', () => {
        expect(
            isWebTelemetryEventEnabled(
                createExamConfiguration({ clipboard_control: false }),
                'CLIPBOARD_ATTEMPT',
            ),
        ).toBe(false);

        expect(
            isWebTelemetryEventEnabled(
                createExamConfiguration({ clipboard_control: true }),
                'CLIPBOARD_ATTEMPT',
            ),
        ).toBe(true);
    });

    it('builds shared-contract payloads for web telemetry', () => {
        const payload = buildWebTelemetryPayload({
            examSessionId: '123e4567-e89b-12d3-a456-426614174000',
            studentId: '123e4567-e89b-12d3-a456-426614174001',
            eventType: 'RIGHT_CLICK_ATTEMPT',
            timestamp: '2026-04-14T00:00:00.000Z',
            sessionContext: {
                browser: 'Chrome',
                os: 'macOS',
                deviceType: 'DESKTOP',
                clientCapabilities: ['contextmenu-monitor'],
            },
        });

        expect(payload).toEqual({
            examSessionId: '123e4567-e89b-12d3-a456-426614174000',
            studentId: '123e4567-e89b-12d3-a456-426614174001',
            timestamp: '2026-04-14T00:00:00.000Z',
            eventType: 'RIGHT_CLICK_ATTEMPT',
            platform: 'WEB',
            source: TELEMETRY_EVENT_DEFINITIONS.RIGHT_CLICK_ATTEMPT.source,
            ruleKey: TELEMETRY_EVENT_DEFINITIONS.RIGHT_CLICK_ATTEMPT.ruleKey,
            metadata: {
                clientActionAt: '2026-04-14T00:00:00.000Z',
            },
            sessionContext: {
                browser: 'Chrome',
                os: 'macOS',
                deviceType: 'DESKTOP',
                clientCapabilities: ['contextmenu-monitor'],
            },
        });
    });

    it('preserves deterministic metadata fields in the ingestion payload', () => {
        const payload = buildWebTelemetryPayload({
            examSessionId: '123e4567-e89b-12d3-a456-426614174000',
            studentId: '123e4567-e89b-12d3-a456-426614174001',
            eventType: 'RIGHT_CLICK_ATTEMPT',
            timestamp: '2026-04-14T00:00:00.000Z',
            eventId: '2cf84368-aad2-4f9b-8932-7cab4d4df82c',
            dedupeKey:
                '123e4567-e89b-12d3-a456-426614174000:RIGHT_CLICK_ATTEMPT:contextmenu:2026-04-14T00:00:00.000Z',
            clientActionAt: '2026-04-14T00:00:00.250Z',
        });

        expect(payload.metadata).toEqual({
            eventId: '2cf84368-aad2-4f9b-8932-7cab4d4df82c',
            dedupeKey:
                '123e4567-e89b-12d3-a456-426614174000:RIGHT_CLICK_ATTEMPT:contextmenu:2026-04-14T00:00:00.000Z',
            clientActionAt: '2026-04-14T00:00:00.250Z',
        });
    });

    it('builds shared-contract payloads for mobile backgrounding telemetry', () => {
        const payload = buildMobileTelemetryPayload({
            examSessionId: '123e4567-e89b-12d3-a456-426614174000',
            studentId: '123e4567-e89b-12d3-a456-426614174001',
            eventType: 'APP_BACKGROUNDING',
            timestamp: '2026-04-14T00:00:00.000Z',
            sessionContext: {
                browser: 'Safari',
                os: 'iOS',
                deviceType: 'MOBILE',
                clientCapabilities: ['visibility-monitor'],
            },
        });

        expect(payload).toEqual({
            examSessionId: '123e4567-e89b-12d3-a456-426614174000',
            studentId: '123e4567-e89b-12d3-a456-426614174001',
            timestamp: '2026-04-14T00:00:00.000Z',
            eventType: 'APP_BACKGROUNDING',
            platform: 'MOBILE',
            source: TELEMETRY_EVENT_DEFINITIONS.APP_BACKGROUNDING.source,
            ruleKey: TELEMETRY_EVENT_DEFINITIONS.APP_BACKGROUNDING.ruleKey,
            metadata: {
                clientActionAt: '2026-04-14T00:00:00.000Z',
            },
            sessionContext: {
                browser: 'Safari',
                os: 'iOS',
                deviceType: 'MOBILE',
                clientCapabilities: ['visibility-monitor'],
            },
        });
    });

    it('skips disabled events and posts enabled ones', async () => {
        const apiClient = vi.fn().mockResolvedValue(undefined);

        const disabledResult = await emitWebTelemetryEvent(apiClient as unknown as ApiClientType, {
            configuration: createExamConfiguration({ print_screen_disable: false }),
            examSessionId: '123e4567-e89b-12d3-a456-426614174000',
            studentId: '123e4567-e89b-12d3-a456-426614174001',
            eventType: 'PRINT_SCREEN_ATTEMPT',
            timestamp: '2026-04-14T00:00:00.000Z',
            sessionContext: {
                browser: 'Chrome',
                os: 'Windows',
                deviceType: 'DESKTOP',
                clientCapabilities: ['print-screen-monitor'],
            },
        });

        expect(disabledResult).toBe(false);
        expect(apiClient).not.toHaveBeenCalled();

        const enabledResult = await emitWebTelemetryEvent(apiClient as unknown as ApiClientType, {
            configuration: createExamConfiguration({ print_screen_disable: true }),
            examSessionId: '123e4567-e89b-12d3-a456-426614174000',
            studentId: '123e4567-e89b-12d3-a456-426614174001',
            eventType: 'PRINT_SCREEN_ATTEMPT',
            timestamp: '2026-04-14T00:00:00.000Z',
            sessionContext: {
                browser: 'Chrome',
                os: 'Windows',
                deviceType: 'DESKTOP',
                clientCapabilities: ['print-screen-monitor'],
            },
        });

        expect(enabledResult).toBe(true);
        expect(apiClient).toHaveBeenCalledTimes(1);
        expect(apiClient).toHaveBeenCalledWith(
            '/telemetry/events',
            expect.objectContaining({
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            }),
        );

        expect(JSON.parse(apiClient.mock.calls[0][1].body)).toMatchObject({
            eventType: 'PRINT_SCREEN_ATTEMPT',
            platform: 'WEB',
            source: TELEMETRY_EVENT_DEFINITIONS.PRINT_SCREEN_ATTEMPT.source,
            ruleKey: TELEMETRY_EVENT_DEFINITIONS.PRINT_SCREEN_ATTEMPT.ruleKey,
        });
    });

    it('posts enabled mobile browser events with the mobile platform contract', async () => {
        const apiClient = vi.fn().mockResolvedValue(undefined);

        const enabledResult = await emitWebTelemetryEvent(apiClient as unknown as ApiClientType, {
            configuration: createExamConfiguration(),
            examSessionId: '123e4567-e89b-12d3-a456-426614174000',
            studentId: '123e4567-e89b-12d3-a456-426614174001',
            eventType: 'APP_BACKGROUNDING',
            platform: 'MOBILE',
            timestamp: '2026-04-14T00:00:00.000Z',
            sessionContext: {
                browser: 'Safari',
                os: 'iOS',
                deviceType: 'MOBILE',
                clientCapabilities: ['visibility-monitor'],
            },
        });

        expect(enabledResult).toBe(true);
        expect(apiClient).toHaveBeenCalledTimes(1);
        expect(JSON.parse(apiClient.mock.calls[0][1].body)).toMatchObject({
            eventType: 'APP_BACKGROUNDING',
            platform: 'MOBILE',
            source: TELEMETRY_EVENT_DEFINITIONS.APP_BACKGROUNDING.source,
            ruleKey: TELEMETRY_EVENT_DEFINITIONS.APP_BACKGROUNDING.ruleKey,
        });
    });

    it('gates MediaPipe telemetry by the related AI rule', () => {
        expect(
            isMediaPipeTelemetryEventEnabled(
                createExamConfiguration({
                    clipboard_control: true,
                }),
                'GAZE_OFF_SCREEN',
            ),
        ).toBe(true);

        expect(
            isMediaPipeTelemetryEventEnabled(
                {
                    ...createExamConfiguration(),
                    aiRules: {
                        ...createExamConfiguration().aiRules,
                        gaze_tracking: false,
                    },
                },
                'GAZE_OFF_SCREEN',
            ),
        ).toBe(false);
    });

    it('builds attempt payloads for MediaPipe AI events using the shared telemetry contract', () => {
        const payload = buildAttemptMediaPipeTelemetryPayload({
            examSessionId: '123e4567-e89b-12d3-a456-426614174000',
            studentId: '123e4567-e89b-12d3-a456-426614174001',
            eventType: 'MULTIPLE_FACES',
            timestamp: '2026-04-22T00:00:00.000Z',
            eventId: '2cf84368-aad2-4f9b-8932-7cab4d4df82c',
            dedupeKey:
                '123e4567-e89b-12d3-a456-426614174000:MULTIPLE_FACES:2cf84368-aad2-4f9b-8932-7cab4d4df82c',
            clientActionAt: '2026-04-22T00:00:00.100Z',
            metadata: {
                confidenceScore: 0.91,
                aggregation: {
                    trigger: 'confidence-threshold',
                    threshold: 0.8,
                },
            },
        });

        expect(payload).toMatchObject({
            examSessionId: '123e4567-e89b-12d3-a456-426614174000',
            studentId: '123e4567-e89b-12d3-a456-426614174001',
            eventType: 'MULTIPLE_FACES',
            platform: 'WEB',
            source: TELEMETRY_EVENT_DEFINITIONS.MULTIPLE_FACES.source,
            ruleKey: TELEMETRY_EVENT_DEFINITIONS.MULTIPLE_FACES.ruleKey,
            metadata: {
                confidenceScore: 0.91,
                aggregation: {
                    trigger: 'confidence-threshold',
                    threshold: 0.8,
                },
                eventId: '2cf84368-aad2-4f9b-8932-7cab4d4df82c',
                dedupeKey:
                    '123e4567-e89b-12d3-a456-426614174000:MULTIPLE_FACES:2cf84368-aad2-4f9b-8932-7cab4d4df82c',
                clientActionAt: '2026-04-22T00:00:00.100Z',
            },
        });
    });

    it('skips disabled MediaPipe runtime emission and posts enabled events', async () => {
        const apiClient = vi.fn().mockResolvedValue(undefined);

        const disabledResult = await emitMediaPipeTelemetryEvent(
            apiClient as unknown as ApiClientType,
            {
                configuration: createExamConfiguration(),
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
                examSessionId: '123e4567-e89b-12d3-a456-426614174000',
                studentId: '123e4567-e89b-12d3-a456-426614174001',
                eventType: 'NO_FACE_DETECTED',
            },
        );

        expect(disabledResult).toBe(false);
        expect(apiClient).not.toHaveBeenCalled();

        const enabledResult = await emitMediaPipeTelemetryEvent(
            apiClient as unknown as ApiClientType,
            {
                configuration: createExamConfiguration(),
                mediaPipeSandbox: {
                    enabled: true,
                    captureDuringCheckup: true,
                    emitDuringExam: true,
                    confidenceThreshold: 0.8,
                    frameIntervalMs: 500,
                    offScreenDurationMs: 3000,
                    calibrationRequired: false,
                    debugOverlayEnabled: false,
                },
                examSessionId: '123e4567-e89b-12d3-a456-426614174000',
                studentId: '123e4567-e89b-12d3-a456-426614174001',
                eventType: 'NO_FACE_DETECTED',
                metadata: {
                    durationMs: 5000,
                    aggregation: {
                        trigger: 'duration-threshold',
                        threshold: 1500,
                    },
                },
            },
        );

        expect(enabledResult).toBe(true);
        expect(apiClient).toHaveBeenCalledTimes(1);
        expect(JSON.parse(apiClient.mock.calls[0][1].body)).toMatchObject({
            eventType: 'NO_FACE_DETECTED',
            platform: 'WEB',
            source: TELEMETRY_EVENT_DEFINITIONS.NO_FACE_DETECTED.source,
            ruleKey: TELEMETRY_EVENT_DEFINITIONS.NO_FACE_DETECTED.ruleKey,
            metadata: {
                durationMs: 5000,
                aggregation: {
                    trigger: 'duration-threshold',
                    threshold: 1500,
                },
            },
        });
    });
});
