import { useRef, useEffect, type RefObject } from 'react';
import type { LiveInspectionDirective, LiveInspectionState } from '@sentinel/shared/schema';

const TERMINAL_STATES = new Set<LiveInspectionState>(['ENDED', 'FAILED', 'EXPIRED']);

/**
 * Checks if a newly fetched directive represents a newer lease/revision or a state transition.
 */
export function isNewerDirective(
    directive: LiveInspectionDirective,
    currentLeaseId: string | null,
    currentRevision: number,
) {
    return (
        directive.leaseId !== currentLeaseId ||
        directive.revision >= currentRevision ||
        TERMINAL_STATES.has(directive.state)
    );
}

/**
 * Emits bounded telemetry diagnostics for live-inspection API/infrastructure phases.
 */
export function logLocalDiagnostic(phase: string, error: any) {
    let status = 0;
    const message = error instanceof Error ? error.message : String(error ?? '');

    if (error && typeof error === 'object' && 'status' in error) {
        status = Number(error.status) || 0;
    } else {
        const match = message.match(/\b(401|403|404|409|429|500)\b/);
        if (match) {
            status = parseInt(match[1], 10);
        }
    }

    let boundedCode = 'UNKNOWN';
    if (status === 401 || status === 403 || /401|403|permission|denied|forbidden/i.test(message)) {
        boundedCode = 'UNAUTHORIZED';
    } else if (status === 404 || /404|not found/i.test(message)) {
        boundedCode = 'NOT_FOUND';
    } else if (status === 409 || /409|already|active|conflict/i.test(message)) {
        boundedCode = 'STALE_LEASE';
    } else if (status === 429 || /429|capacity/i.test(message)) {
        boundedCode = 'RATE_LIMITED';
    } else if (status >= 500 || /5\d{2}/.test(message)) {
        boundedCode = 'SERVER_ERROR';
    } else if (/network|fetch|offline/i.test(message)) {
        boundedCode = 'OFFLINE';
    }

    console.warn(
        `[LiveInspection Diagnostic] Phase: ${phase}, Status: ${status}, Code: ${boundedCode}`,
    );

    if (boundedCode === 'UNAUTHORIZED') {
        console.warn(
            '[LiveInspection Diagnostic] Ensure student and instructor sessions run in separate browser profiles (Normal + Incognito) to prevent auth token overwriting.',
        );
    }
}

/**
 * Bounded camera track wait helper that retries track acquisition for up to 8 seconds
 * and aborts immediately if unmounted, disabled, or if the active sequence is preempted.
 */
export async function waitForCameraTrack({
    sequence,
    getLiveVideoTrack,
    isMounted,
    enabled,
    requestSequenceRef,
}: {
    sequence: number;
    getLiveVideoTrack: () => MediaStreamTrack | null;
    isMounted: RefObject<boolean>;
    enabled: boolean;
    requestSequenceRef: RefObject<number>;
}): Promise<MediaStreamTrack | null> {
    const intervalMs = 100;
    const maxWaitMs = 8000;
    let elapsed = 0;

    while (elapsed < maxWaitMs) {
        if (!isMounted.current || !enabled || sequence !== requestSequenceRef.current) {
            return null;
        }

        const track = getLiveVideoTrack();
        if (track && track.readyState === 'live') {
            return track;
        }

        await new Promise((resolve) => window.setTimeout(resolve, intervalMs));
        elapsed += intervalMs;
    }

    return null;
}

/**
 * Simple hook to wrap values/callbacks in mutable refs that update on every render,
 * eliminating the need for callback dependency array recreation.
 */
export function useLatestRef<T>(value: T) {
    const ref = useRef(value);
    useEffect(() => {
        ref.current = value;
    });
    return ref;
}
