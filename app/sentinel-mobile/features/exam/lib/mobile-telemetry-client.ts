import Constants from 'expo-constants';
import { Platform } from 'react-native';
import {
    MOBILE_TELEMETRY_EVENT_TYPES,
    SHARED_TELEMETRY_EVENT_TYPES,
    TELEMETRY_EVENT_DEFINITIONS,
    type TelemetryEventType,
} from '@sentinel/shared/schema';
import type { ExamConfiguration } from '@sentinel/shared/types';
import { ingestTelemetryEvent, type ApiClientType } from '@sentinel/services';

export type MobileTelemetryEventType =
    (typeof MOBILE_TELEMETRY_EVENT_TYPES)[number] | (typeof SHARED_TELEMETRY_EVENT_TYPES)[number];

type MobileTelemetrySessionContext = {
    os?: string;
    deviceType?: 'DESKTOP' | 'TABLET' | 'MOBILE';
    appVersion?: string;
    clientVersion?: string;
    clientCapabilities?: string[];
};

type MobileTelemetryPayload = {
    examSessionId: string;
    studentId: string;
    timestamp: string;
    platform: 'MOBILE';
    source: (typeof TELEMETRY_EVENT_DEFINITIONS)[TelemetryEventType]['source'];
    ruleKey: (typeof TELEMETRY_EVENT_DEFINITIONS)[TelemetryEventType]['ruleKey'];
    eventType: MobileTelemetryEventType;
    sessionContext?: MobileTelemetrySessionContext;
};

type EmitMobileTelemetryEventArgs = {
    apiClient?: ApiClientType;
    configuration?: ExamConfiguration;
    examSessionId: string;
    eventType: MobileTelemetryEventType;
    studentId?: string;
};

type MobileTelemetryRuleEnabledReader = (configuration: ExamConfiguration) => boolean;

const MOBILE_TELEMETRY_RULE_ENABLED_READERS: Record<
    MobileTelemetryEventType,
    MobileTelemetryRuleEnabledReader
> = {
    APP_BACKGROUNDING: (configuration) => configuration.mobileSecurity.prevent_backgrounding,
    SCREENSHOT_ATTEMPT: (configuration) => configuration.mobileSecurity.screenshot_block,
    ROOT_JAILBREAK_DETECTED: (configuration) =>
        configuration.mobileSecurity.root_jailbreak_detection,
    APP_PINNING_VIOLATION: (configuration) => configuration.mobileSecurity.app_pinning_required,
    NOTIFICATION_BLOCK_VIOLATION: (configuration) =>
        configuration.mobileSecurity.notification_block,
    GAZE_OFF_SCREEN: (configuration) => configuration.aiRules.gaze_tracking ?? true,
    MULTIPLE_FACES: (configuration) => configuration.aiRules.multiple_faces_detection ?? true,
    NO_FACE_DETECTED: (configuration) => configuration.aiRules.face_detection ?? true,
    AUDIO_ANOMALY: (configuration) => configuration.aiRules.audio_anomaly_detection ?? true,
};

export function isMobileTelemetryEventEnabled(
    configuration: ExamConfiguration | undefined,
    eventType: MobileTelemetryEventType,
) {
    if (!configuration) {
        return false;
    }

    return MOBILE_TELEMETRY_RULE_ENABLED_READERS[eventType](configuration);
}

export function buildMobileTelemetrySessionContext(
    extraCapabilities: string[] = [],
): MobileTelemetrySessionContext {
    const appVersion =
        Constants.expoConfig?.version ??
        (typeof Constants.nativeAppVersion === 'string' ? Constants.nativeAppVersion : undefined);

    return {
        os: `${Platform.OS} ${String(Platform.Version)}`,
        deviceType: 'MOBILE',
        appVersion,
        clientVersion: appVersion,
        clientCapabilities: ['appstate-monitor', 'notification-blur-monitor', ...extraCapabilities],
    };
}

export function buildMobileTelemetryPayload({
    examSessionId,
    eventType,
    studentId,
}: {
    examSessionId: string;
    eventType: MobileTelemetryEventType;
    studentId: string;
}): MobileTelemetryPayload {
    const eventDefinition = TELEMETRY_EVENT_DEFINITIONS[eventType];

    return {
        examSessionId,
        studentId,
        timestamp: new Date().toISOString(),
        platform: 'MOBILE',
        source: eventDefinition.source,
        ruleKey: eventDefinition.ruleKey,
        eventType,
        sessionContext: buildMobileTelemetrySessionContext(),
    };
}

export async function emitMobileTelemetryEvent({
    apiClient,
    configuration,
    examSessionId,
    eventType,
    studentId,
}: EmitMobileTelemetryEventArgs) {
    if (!isMobileTelemetryEventEnabled(configuration, eventType)) {
        return false;
    }

    if (!studentId || !examSessionId) {
        console.info(
            'Skipping mobile telemetry delivery because the authenticated mobile attempt identity is incomplete.',
            {
                eventType,
                hasApiBaseUrl: Boolean(apiClient || process.env.EXPO_PUBLIC_API_URL?.trim()),
                hasStudentId: Boolean(studentId),
                hasExamSessionId: Boolean(examSessionId),
            },
        );
        return false;
    }

    const payload = buildMobileTelemetryPayload({
        examSessionId,
        eventType,
        studentId,
    });

    if (apiClient) {
        await ingestTelemetryEvent(apiClient, payload);
        return true;
    }

    const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, '');
    const bearerToken = process.env.EXPO_PUBLIC_API_BEARER_TOKEN?.trim();

    if (!apiBaseUrl) {
        console.info(
            'Skipping mobile telemetry delivery because the mobile API identity is not configured.',
            {
                eventType,
                hasApiBaseUrl: false,
                hasStudentId: true,
            },
        );
        return false;
    }

    const response = await fetch(`${apiBaseUrl}/telemetry/events`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {}),
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        throw new Error(`Failed to deliver mobile telemetry event: ${response.status}`);
    }

    return true;
}
