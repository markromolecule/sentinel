import {
    TELEMETRY_EVENT_DEFINITIONS,
    buildMediaPipeTelemetryPayload as buildSharedMediaPipePayload,
    type ExamConfig,
} from '@sentinel/shared';
import type { IngestTelemetryEventPayload } from '@sentinel/services';
import type {
    BuildWebTelemetryPayloadArgs,
    BuildMediaPipeTelemetryPayloadArgs,
    BrowserTelemetryEventType,
    MediaPipeTelemetryEventType,
} from '../_types';
import {
    BROWSER_TELEMETRY_RULE_ENABLED_READERS,
    MEDIAPIPE_TELEMETRY_RULE_ENABLED_READERS,
} from '../_constants';
import { buildWebTelemetrySessionContext, buildMediaPipeTelemetrySessionContext } from './context';

export function isWebTelemetryEventEnabled(
    configuration: ExamConfig | undefined,
    eventType: BrowserTelemetryEventType,
) {
    if (!configuration) return false;
    return BROWSER_TELEMETRY_RULE_ENABLED_READERS[eventType](configuration);
}

export function buildWebTelemetryPayload({
    examSessionId,
    studentId,
    eventType,
    timestamp = new Date().toISOString(),
    metadata,
    sessionContext = buildWebTelemetrySessionContext(),
    eventId,
    dedupeKey,
    clientActionAt,
    platform = 'WEB',
}: BuildWebTelemetryPayloadArgs): IngestTelemetryEventPayload {
    const eventDefinition = TELEMETRY_EVENT_DEFINITIONS[eventType];

    return {
        examSessionId,
        studentId,
        timestamp,
        eventType,
        platform,
        source: eventDefinition.source,
        ruleKey: eventDefinition.ruleKey,
        metadata: {
            ...metadata,
            ...(eventId ? { eventId } : {}),
            ...(dedupeKey ? { dedupeKey } : {}),
            clientActionAt: clientActionAt || timestamp,
        },
        sessionContext,
    };
}

/**
 * Builds a canonical mobile browser telemetry payload that uses the shared schema.
 *
 * @param args The telemetry payload arguments for a mobile browser event.
 * @returns The ingestion payload with `platform: MOBILE`.
 */
export function buildMobileTelemetryPayload(
    args: Omit<BuildWebTelemetryPayloadArgs, 'platform'>,
): IngestTelemetryEventPayload {
    return buildWebTelemetryPayload({
        ...args,
        platform: 'MOBILE',
    });
}

export function isMediaPipeTelemetryEventEnabled(
    configuration: ExamConfig | undefined,
    eventType: MediaPipeTelemetryEventType,
) {
    if (!configuration) return false;
    return MEDIAPIPE_TELEMETRY_RULE_ENABLED_READERS[eventType](configuration);
}

export function buildAttemptMediaPipeTelemetryPayload({
    examSessionId,
    studentId,
    eventType,
    timestamp = new Date().toISOString(),
    metadata,
    sessionContext = buildMediaPipeTelemetrySessionContext(),
    eventId,
    dedupeKey,
    clientActionAt,
}: BuildMediaPipeTelemetryPayloadArgs): IngestTelemetryEventPayload {
    return buildSharedMediaPipePayload({
        examSessionId,
        studentId,
        eventType,
        timestamp,
        metadata: {
            ...metadata,
            ...(eventId ? { eventId } : {}),
            ...(dedupeKey ? { dedupeKey } : {}),
            clientActionAt: clientActionAt || timestamp,
        },
        sessionContext,
    });
}
