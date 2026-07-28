import { isMediaPipeRuntimeEnabled } from '@sentinel/shared';
import {
    ingestMediaPipeEvidenceCandidate,
    ingestTelemetryEvent,
    type ApiClientType,
} from '@sentinel/services';
import type { EmitWebTelemetryEventArgs, EmitMediaPipeTelemetryEventArgs } from './_types';
import {
    isWebTelemetryEventEnabled,
    buildWebTelemetryPayload,
    buildMobileTelemetryPayload,
    isMediaPipeTelemetryEventEnabled,
    buildAttemptMediaPipeTelemetryPayload,
} from './_utils/payloads';

export * from './_types';
export * from './_utils/payloads';
export * from './_utils/context';
export * from './_utils/action-metadata';
export * from './_utils/monitoring-event-trace';
export * from './_utils/screen-capture-shortcut';

export async function emitWebTelemetryEvent(
    apiClient: ApiClientType,
    { configuration, ...payloadArgs }: EmitWebTelemetryEventArgs,
) {
    if (!isWebTelemetryEventEnabled(configuration, payloadArgs.eventType)) {
        return false;
    }

    const payload =
        payloadArgs.platform === 'MOBILE'
            ? buildMobileTelemetryPayload(payloadArgs)
            : buildWebTelemetryPayload(payloadArgs);

    await ingestTelemetryEvent(apiClient, payload);
    return true;
}

export async function emitMediaPipeTelemetryEvent(
    apiClient: ApiClientType,
    { configuration, mediaPipeSandbox, ...payloadArgs }: EmitMediaPipeTelemetryEventArgs,
) {
    const runtimeEnabled = isMediaPipeRuntimeEnabled({
        sandbox: mediaPipeSandbox,
        configuration,
        stage: 'attempt',
    });
    const eventEnabled = isMediaPipeTelemetryEventEnabled(configuration, payloadArgs.eventType);

    if (!runtimeEnabled || !eventEnabled) {
        console.warn('[MediaPipeTelemetry] Event not emitted', {
            eventType: payloadArgs.eventType,
            examSessionId: payloadArgs.examSessionId,
            runtimeEnabled,
            eventEnabled,
        });
        return false;
    }

    await ingestTelemetryEvent(apiClient, buildAttemptMediaPipeTelemetryPayload(payloadArgs));
    return true;
}

/**
 * Emits a MediaPipe telemetry occurrence through the evidence-candidate
 * contract so the server can authoritatively decide whether upload is allowed.
 */
export async function emitMediaPipeEvidenceCandidate(
    apiClient: ApiClientType,
    {
        configuration,
        mediaPipeSandbox,
        capture,
        signal,
        ...payloadArgs
    }: EmitMediaPipeTelemetryEventArgs & {
        capture: {
            capturedAt: string;
            mimeType: 'image/webp' | 'image/jpeg';
            sizeBytes: number;
        };
        signal?: AbortSignal;
    },
) {
    const runtimeEnabled = isMediaPipeRuntimeEnabled({
        sandbox: mediaPipeSandbox,
        configuration,
        stage: 'attempt',
    });
    const eventEnabled = isMediaPipeTelemetryEventEnabled(configuration, payloadArgs.eventType);

    if (!runtimeEnabled || !eventEnabled) {
        console.warn('[MediaPipeTelemetry] Evidence candidate not emitted', {
            eventType: payloadArgs.eventType,
            examSessionId: payloadArgs.examSessionId,
            runtimeEnabled,
            eventEnabled,
        });
        return false;
    }

    const payload = buildAttemptMediaPipeTelemetryPayload(payloadArgs);

    return ingestMediaPipeEvidenceCandidate(
        apiClient,
        {
            ...payload,
            eventType: payloadArgs.eventType,
            platform: 'WEB',
            source: 'AI',
            capture,
            metadata: {
                ...payload.metadata,
                eventId: payload.metadata?.eventId ?? payload.timestamp,
                dedupeKey: payload.metadata?.dedupeKey ?? payload.timestamp,
                clientActionAt: payload.metadata?.clientActionAt ?? payload.timestamp,
            },
        },
        signal,
    );
}
