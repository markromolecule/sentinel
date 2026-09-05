import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ExamConfiguration } from '@sentinel/shared/types';

vi.mock('expo-constants', () => ({
    default: {
        expoConfig: {
            version: '1.0.0',
        },
        nativeAppVersion: '1.0.0',
    },
}));

vi.mock('react-native', () => ({
    Platform: {
        OS: 'ios',
        Version: '17.0',
    },
}));

const { ingestTelemetryEventMock } = vi.hoisted(() => ({
    ingestTelemetryEventMock: vi.fn(),
}));

vi.mock('@sentinel/services', () => ({
    ingestTelemetryEvent: ingestTelemetryEventMock,
}));

const telemetry = await import('./mobile-telemetry-client');

function buildConfiguration(overrides: Partial<ExamConfiguration['mobileSecurity']> = {}): ExamConfiguration {
    return {
        lobbyAdmissionMode: 'AUTOMATIC',
        maxReconnectAttempts: 1,
        strictMode: false,
        screenLock: false,
        cameraRequired: false,
        micRequired: false,
        autoSubmitTimeoutMinutes: 0,
        aiRules: {
            gaze_tracking: false,
            face_detection: false,
            audio_anomaly_detection: false,
            multiple_faces_detection: false,
        },
        webSecurity: {
            tab_switching_monitor: false,
            full_screen_required: false,
            clipboard_control: false,
            right_click_disable: false,
            print_screen_disable: false,
        },
        mobileSecurity: {
            app_pinning_required: false,
            prevent_backgrounding: true,
            notification_block: false,
            screenshot_block: false,
            root_jailbreak_detection: false,
            ...overrides,
        },
    };
}

describe('mobile telemetry client', () => {
    beforeEach(() => {
        ingestTelemetryEventMock.mockReset();
    });

    it('skips delivery when authenticated student identity is missing', async () => {
        const delivered = await telemetry.emitMobileTelemetryEvent({
            apiClient: vi.fn(),
            configuration: buildConfiguration(),
            examSessionId: 'session-1',
            eventType: 'APP_BACKGROUNDING',
        });

        expect(delivered).toBe(false);
        expect(ingestTelemetryEventMock).not.toHaveBeenCalled();
    });

    it('sends enabled mobile attempt events through the authenticated API client', async () => {
        const apiClient = vi.fn();

        const delivered = await telemetry.emitMobileTelemetryEvent({
            apiClient,
            configuration: buildConfiguration({
                screenshot_block: true,
            }),
            examSessionId: 'session-1',
            eventType: 'SCREENSHOT_ATTEMPT',
            studentId: 'student-1',
        });

        expect(delivered).toBe(true);
        expect(ingestTelemetryEventMock).toHaveBeenCalledWith(
            apiClient,
            expect.objectContaining({
                examSessionId: 'session-1',
                studentId: 'student-1',
                platform: 'MOBILE',
                source: 'CLIENT',
                ruleKey: 'mobileSecurity.screenshot_block',
                eventType: 'SCREENSHOT_ATTEMPT',
            }),
        );
    });

    it('does not send disabled mobile security events', async () => {
        const delivered = await telemetry.emitMobileTelemetryEvent({
            apiClient: vi.fn(),
            configuration: buildConfiguration({
                screenshot_block: false,
            }),
            examSessionId: 'session-1',
            eventType: 'SCREENSHOT_ATTEMPT',
            studentId: 'student-1',
        });

        expect(delivered).toBe(false);
        expect(ingestTelemetryEventMock).not.toHaveBeenCalled();
    });

    it('correctly maps and delivers AI anomaly telemetry events', async () => {
        const apiClient = vi.fn();
        const baseConfig = buildConfiguration();
        baseConfig.aiRules = {
            gaze_tracking: true,
            face_detection: true,
            multiple_faces_detection: true,
            audio_anomaly_detection: true,
        };

        const aiEvents = [
            { type: 'GAZE_OFF_SCREEN' as const, ruleKey: 'aiRules.gaze_tracking' },
            { type: 'MULTIPLE_FACES' as const, ruleKey: 'aiRules.multiple_faces_detection' },
            { type: 'NO_FACE_DETECTED' as const, ruleKey: 'aiRules.face_detection' },
            { type: 'AUDIO_ANOMALY' as const, ruleKey: 'aiRules.audio_anomaly_detection' },
        ];

        for (const { type, ruleKey } of aiEvents) {
            ingestTelemetryEventMock.mockClear();
            const delivered = await telemetry.emitMobileTelemetryEvent({
                apiClient,
                configuration: baseConfig,
                examSessionId: 'session-ai',
                eventType: type,
                studentId: 'student-ai',
            });

            expect(delivered).toBe(true);
            expect(ingestTelemetryEventMock).toHaveBeenCalledWith(
                apiClient,
                expect.objectContaining({
                    examSessionId: 'session-ai',
                    studentId: 'student-ai',
                    platform: 'MOBILE',
                    source: 'AI',
                    ruleKey,
                    eventType: type,
                    sessionContext: expect.objectContaining({
                        deviceType: 'MOBILE',
                        os: 'ios 17.0',
                        appVersion: '1.0.0',
                    }),
                }),
            );
        }
    });

    it('correctly maps and delivers all native mobile security telemetry events', async () => {
        const apiClient = vi.fn();
        const config = buildConfiguration({
            prevent_backgrounding: true,
            screenshot_block: true,
            root_jailbreak_detection: true,
            app_pinning_required: true,
            notification_block: true,
        });

        const mobileEvents = [
            { type: 'APP_BACKGROUNDING' as const, ruleKey: 'mobileSecurity.prevent_backgrounding' },
            { type: 'SCREENSHOT_ATTEMPT' as const, ruleKey: 'mobileSecurity.screenshot_block' },
            { type: 'ROOT_JAILBREAK_DETECTED' as const, ruleKey: 'mobileSecurity.root_jailbreak_detection' },
            { type: 'APP_PINNING_VIOLATION' as const, ruleKey: 'mobileSecurity.app_pinning_required' },
            { type: 'NOTIFICATION_BLOCK_VIOLATION' as const, ruleKey: 'mobileSecurity.notification_block' },
        ];

        for (const { type, ruleKey } of mobileEvents) {
            ingestTelemetryEventMock.mockClear();
            const delivered = await telemetry.emitMobileTelemetryEvent({
                apiClient,
                configuration: config,
                examSessionId: 'session-sec',
                eventType: type,
                studentId: 'student-sec',
            });

            expect(delivered).toBe(true);
            expect(ingestTelemetryEventMock).toHaveBeenCalledWith(
                apiClient,
                expect.objectContaining({
                    examSessionId: 'session-sec',
                    studentId: 'student-sec',
                    platform: 'MOBILE',
                    source: 'CLIENT',
                    ruleKey,
                    eventType: type,
                }),
            );
        }
    });
});
