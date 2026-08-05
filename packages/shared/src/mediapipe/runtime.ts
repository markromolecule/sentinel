import { MEDIAPIPE_CLIENT_CAPABILITIES, MEDIAPIPE_DEFAULT_THRESHOLDS } from './constants';
import type {
    EvaluateMediaPipeSignalDispatchArgs,
    EvaluateMediaPipeSignalDispatchResult,
    MediaPipeFrameAnalysis,
    MediaPipeRuntimeEnabledArgs,
    MediaPipeMultipleFacesConfirmationState,
    MediaPipeSignalTrackerState,
    MediaPipeSupportedEventType,
    MediaPipeThresholdResolution,
    ResolveMediaPipeThresholdsArgs,
} from './types';
import { clamp } from './landmarks';

export function resolveMediaPipeThresholds({
    sandbox,
    ruleOverrides,
}: ResolveMediaPipeThresholdsArgs): Record<
    MediaPipeSupportedEventType,
    MediaPipeThresholdResolution
> {
    return {
        GAZE_OFF_SCREEN: {
            eventType: 'GAZE_OFF_SCREEN',
            confidenceThreshold:
                ruleOverrides?.GAZE_OFF_SCREEN?.confidenceThreshold ?? sandbox.confidenceThreshold,
            durationThresholdMs:
                ruleOverrides?.GAZE_OFF_SCREEN?.durationThresholdMs ?? sandbox.offScreenDurationMs,
            repeatThreshold: ruleOverrides?.GAZE_OFF_SCREEN?.repeatThreshold ?? null,
        },
        NO_FACE_DETECTED: {
            eventType: 'NO_FACE_DETECTED',
            confidenceThreshold:
                ruleOverrides?.NO_FACE_DETECTED?.confidenceThreshold ?? sandbox.confidenceThreshold,
            durationThresholdMs:
                ruleOverrides?.NO_FACE_DETECTED?.durationThresholdMs ??
                MEDIAPIPE_DEFAULT_THRESHOLDS.noFaceDurationMs,
            repeatThreshold: ruleOverrides?.NO_FACE_DETECTED?.repeatThreshold ?? null,
        },
        MULTIPLE_FACES: {
            eventType: 'MULTIPLE_FACES',
            confidenceThreshold:
                ruleOverrides?.MULTIPLE_FACES?.confidenceThreshold ?? sandbox.confidenceThreshold,
            durationThresholdMs: null,
            repeatThreshold: ruleOverrides?.MULTIPLE_FACES?.repeatThreshold ?? null,
        },
    };
}

export function createMediaPipeSignalTrackerState(): MediaPipeSignalTrackerState {
    return {
        activeSignal: null,
        activeSinceMs: null,
        lastObservedAtMs: null,
        lastEmittedAtMs: null,
        occurrenceCount: 0,
    };
}

export function createMediaPipeMultipleFacesConfirmationState(): MediaPipeMultipleFacesConfirmationState {
    return {
        consecutiveMultipleFacesFrames: 0,
    };
}

export function evaluateMediaPipeMultipleFacesConfirmation(args: {
    analysis: MediaPipeFrameAnalysis;
    state: MediaPipeMultipleFacesConfirmationState;
    minimumConsecutiveFrames?: number;
}): {
    analysis: MediaPipeFrameAnalysis;
    state: MediaPipeMultipleFacesConfirmationState;
    isConfirmed: boolean;
} {
    const minimumConsecutiveFrames = Math.max(1, args.minimumConsecutiveFrames ?? 2);

    if (args.analysis.status !== 'multiple-faces' || args.analysis.faceCount <= 1) {
        return {
            analysis: args.analysis,
            state: createMediaPipeMultipleFacesConfirmationState(),
            isConfirmed: false,
        };
    }

    const consecutiveMultipleFacesFrames = args.state.consecutiveMultipleFacesFrames + 1;
    const isConfirmed = consecutiveMultipleFacesFrames >= minimumConsecutiveFrames;

    if (!isConfirmed) {
        return {
            analysis: {
                ...args.analysis,
                status: 'ready',
                signal: null,
                reasons: [
                    ...args.analysis.reasons,
                    'Multiple faces were detected in the active camera frame. Waiting for a second consecutive frame before confirming the incident.',
                ],
            },
            state: {
                consecutiveMultipleFacesFrames,
            },
            isConfirmed: false,
        };
    }

    return {
        analysis: args.analysis,
        state: {
            consecutiveMultipleFacesFrames,
        },
        isConfirmed: true,
    };
}

export function evaluateMediaPipeSignalDispatch({
    currentSignal,
    tracker,
    nowMs,
    thresholds,
    signalGapGraceMs = 0,
}: EvaluateMediaPipeSignalDispatchArgs): EvaluateMediaPipeSignalDispatchResult {
    if (!currentSignal) {
        const hasGraceWindow =
            tracker.activeSignal !== null &&
            tracker.lastObservedAtMs !== null &&
            nowMs - tracker.lastObservedAtMs <= signalGapGraceMs;

        if (hasGraceWindow) {
            return {
                tracker,
                shouldEmit: false,
            };
        }

        return {
            tracker: createMediaPipeSignalTrackerState(),
            shouldEmit: false,
        };
    }

    const isSameSignal = tracker.activeSignal === currentSignal;
    const activeSinceMs =
        isSameSignal && tracker.activeSinceMs !== null ? tracker.activeSinceMs : nowMs;
    const occurrenceCount = isSameSignal ? tracker.occurrenceCount + 1 : 1;
    const durationMs = Math.max(0, nowMs - activeSinceMs);
    const threshold = thresholds[currentSignal];
    const durationThresholdMs = threshold.durationThresholdMs;
    const repeatThreshold = threshold.repeatThreshold;
    const lastEmittedAtMs = isSameSignal ? tracker.lastEmittedAtMs : null;
    const nextTracker = {
        activeSignal: currentSignal,
        activeSinceMs,
        lastObservedAtMs: nowMs,
        lastEmittedAtMs,
        occurrenceCount,
    };

    if (durationThresholdMs !== null && durationMs < durationThresholdMs) {
        if (
            repeatThreshold !== null &&
            occurrenceCount >= repeatThreshold &&
            lastEmittedAtMs === null
        ) {
            return {
                tracker: {
                    ...nextTracker,
                    lastEmittedAtMs: nowMs,
                },
                shouldEmit: true,
                aggregation: {
                    trigger: 'repeat-threshold',
                    occurrenceCount,
                    threshold: repeatThreshold,
                },
            };
        }

        return {
            tracker: nextTracker,
            shouldEmit: false,
        };
    }

    if (
        lastEmittedAtMs !== null &&
        durationThresholdMs !== null &&
        nowMs - lastEmittedAtMs < durationThresholdMs
    ) {
        return {
            tracker: nextTracker,
            shouldEmit: false,
        };
    }

    if (repeatThreshold !== null) {
        if (occurrenceCount < repeatThreshold || lastEmittedAtMs !== null) {
            return {
                tracker: nextTracker,
                shouldEmit: false,
            };
        }

        return {
            tracker: {
                ...nextTracker,
                lastEmittedAtMs: nowMs,
            },
            shouldEmit: true,
            aggregation: {
                trigger: 'repeat-threshold',
                occurrenceCount,
                threshold: repeatThreshold,
            },
        };
    }

    if (lastEmittedAtMs !== null) {
        return {
            tracker: nextTracker,
            shouldEmit: false,
        };
    }

    return {
        tracker: {
            ...nextTracker,
            lastEmittedAtMs: nowMs,
        },
        shouldEmit: true,
        durationMs: durationThresholdMs === null ? undefined : durationMs,
        aggregation: {
            trigger: durationThresholdMs === null ? 'immediate' : 'duration-threshold',
            occurrenceCount,
            windowSeconds:
                durationThresholdMs === null ? undefined : Math.round(durationThresholdMs / 1000),
            threshold: durationThresholdMs ?? undefined,
        },
    };
}

export function isMediaPipeRuntimeEnabled({
    sandbox,
    configuration,
    stage,
    hasCameraStream,
    runtimeAccessAllowed,
}: MediaPipeRuntimeEnabledArgs) {
    if (!sandbox?.enabled || !configuration) {
        return false;
    }

    const hasAnyAIRule =
        configuration.aiRules.gaze_tracking ||
        configuration.aiRules.face_detection ||
        configuration.aiRules.multiple_faces_detection;

    // If no AI rules are enabled and it's not a checkup that requires capture, it's disabled.
    if (!hasAnyAIRule && (stage !== 'checkup' || !sandbox.captureDuringCheckup)) {
        return false;
    }

    if (stage === 'checkup' && !sandbox.captureDuringCheckup) {
        return false;
    }

    if (stage === 'attempt' && !sandbox.emitDuringExam) {
        return false;
    }

    if (stage === 'attempt' && runtimeAccessAllowed === false) {
        return false;
    }

    if (hasCameraStream === false) {
        return false;
    }

    return true;
}

export function getMediaPipeClientCapabilities() {
    return [...MEDIAPIPE_CLIENT_CAPABILITIES];
}

export function normalizeMediaPipeConfidenceScore(score?: number | null) {
    if (score === null || score === undefined || Number.isNaN(score)) {
        return null;
    }

    return clamp(score, 0, 1);
}
