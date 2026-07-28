import type {
    WEB_TELEMETRY_EVENT_TYPES,
    MOBILE_TELEMETRY_EVENT_TYPES,
    MEDIAPIPE_SUPPORTED_EVENT_TYPES,
    ExamConfig,
    TelemetrySettings,
} from '@sentinel/shared';
import type { TelemetryMetadata, TelemetrySessionContext } from '@sentinel/services';
import type { TelemetryActionMetadata } from '../_utils/action-metadata';

export type WebTelemetryEventType = (typeof WEB_TELEMETRY_EVENT_TYPES)[number];
export type MobileTelemetryEventType = (typeof MOBILE_TELEMETRY_EVENT_TYPES)[number];
export type BrowserTelemetryEventType = WebTelemetryEventType | MobileTelemetryEventType;
export type MediaPipeTelemetryEventType = (typeof MEDIAPIPE_SUPPORTED_EVENT_TYPES)[number];

export type WebTelemetryRuleEnabledReader = (configuration: ExamConfig) => boolean;

export type BuildWebTelemetryPayloadArgs = {
    examSessionId: string;
    studentId: string;
    eventType: BrowserTelemetryEventType;
    timestamp?: string;
    metadata?: TelemetryMetadata;
    sessionContext?: TelemetrySessionContext;
    eventId?: string;
    dedupeKey?: string;
    clientActionAt?: string;
    platform?: 'WEB' | 'MOBILE';
};

export type { TelemetryActionMetadata };

export type EmitWebTelemetryEventArgs = BuildWebTelemetryPayloadArgs & {
    configuration?: ExamConfig;
};

export type BuildMediaPipeTelemetryPayloadArgs = {
    examSessionId: string;
    studentId: string;
    eventType: MediaPipeTelemetryEventType;
    timestamp?: string;
    metadata?: TelemetryMetadata;
    sessionContext?: TelemetrySessionContext;
    eventId?: string;
    dedupeKey?: string;
    clientActionAt?: string;
};

export type EmitMediaPipeTelemetryEventArgs = BuildMediaPipeTelemetryPayloadArgs & {
    configuration?: ExamConfig;
    mediaPipeSandbox?: TelemetrySettings['mediaPipeSandbox'];
};
