import type {
    TelemetryMediaPipeSandboxSchemaValues,
    TelemetryPlatform,
    TelemetryRuleKey,
    TelemetryRuleOverrideSchemaValues,
    TelemetrySource,
} from '../schema';
import type { ExamConfiguration } from '../types';
import { MEDIAPIPE_SUPPORTED_EVENT_TYPES } from './constants';

export type MediaPipeSupportedEventType = (typeof MEDIAPIPE_SUPPORTED_EVENT_TYPES)[number];

export type MediaPipeLandmark = {
    x: number;
    y: number;
    z?: number;
};

export type MediaPipeFaceBounds = {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
    centerX: number;
    centerY: number;
};

export type MediaPipeGazeDirection = 'center' | 'left' | 'right' | 'up' | 'down';
export type MediaPipeEyeState = 'open' | 'closed' | 'unknown';

export type MediaPipeGazeOffsetSample = {
    irisHorizontalOffset: number | null;
    irisVerticalOffset: number | null;
    headHorizontalOffset: number | null;
    headVerticalOffset: number | null;
    eyeAspectRatio: number | null;
};

export type MediaPipeCalibrationProfile = {
    version: 1;
    createdAt: string;
    sampleCount: number;
    confidenceScore: number | null;
    faceBounds: MediaPipeFaceBounds;
    neutralGaze: MediaPipeGazeOffsetSample;
    thresholds: {
        irisHorizontalDelta: number;
        irisVerticalDeltaUp: number;
        irisVerticalDeltaDown: number;
        headHorizontalDelta: number;
        headVerticalDeltaUp: number;
        headVerticalDeltaDown: number;
    };
};

export type MediaPipeCalibrationSample = {
    landmarks: MediaPipeLandmark[];
    confidenceScore: number | null;
    faceBounds: MediaPipeFaceBounds;
    gaze: MediaPipeGazeOffsetSample;
};

export type MediaPipeAnalysisStatus =
    'ready' | 'no-face' | 'multiple-faces' | 'off-screen' | 'low-confidence' | 'unsupported';

export type MediaPipeFrameAnalysis = {
    status: MediaPipeAnalysisStatus;
    signal: MediaPipeSupportedEventType | null;
    faceCount: number;
    confidenceScore: number | null;
    gazeDirection: MediaPipeGazeDirection | null;
    eyeState: MediaPipeEyeState;
    faceBounds: MediaPipeFaceBounds | null;
    reasons: string[];
};

export type MediaPipeTelemetryAggregation = {
    trigger: 'immediate' | 'duration-threshold' | 'repeat-threshold' | 'confidence-threshold';
    occurrenceCount?: number;
    windowSeconds?: number;
    threshold?: number;
};

export type MediaPipeTelemetryMetadata = {
    durationMs?: number;
    confidenceScore?: number;
    aggregation?: MediaPipeTelemetryAggregation;
    eventId?: string;
    dedupeKey?: string;
    clientActionAt?: string;
};

export type MediaPipeTelemetrySessionContext = {
    browser?: string;
    os?: string;
    deviceType?: 'DESKTOP' | 'TABLET' | 'MOBILE';
    appVersion?: string;
    clientVersion?: string;
    clientCapabilities?: string[];
};

export type MediaPipeTelemetryPayload = {
    examSessionId: string;
    studentId: string;
    timestamp: string;
    eventType: MediaPipeSupportedEventType;
    platform: TelemetryPlatform;
    source: TelemetrySource;
    ruleKey: TelemetryRuleKey;
    metadata?: MediaPipeTelemetryMetadata;
    sessionContext?: MediaPipeTelemetrySessionContext;
};

export type MediaPipeThresholdResolution = {
    eventType: MediaPipeSupportedEventType;
    confidenceThreshold: number;
    durationThresholdMs: number | null;
    repeatThreshold: number | null;
};

export type MediaPipeRolloutStage = 'sandbox' | 'checkup' | 'attempt';

export type MediaPipeSignalTrackerState = {
    activeSignal: MediaPipeSupportedEventType | null;
    activeSinceMs: number | null;
    lastObservedAtMs: number | null;
    lastEmittedAtMs: number | null;
    occurrenceCount: number;
};

export type MediaPipeMultipleFacesConfirmationState = {
    consecutiveMultipleFacesFrames: number;
};

export type EvaluateMediaPipeSignalDispatchArgs = {
    currentSignal: MediaPipeSupportedEventType | null;
    tracker: MediaPipeSignalTrackerState;
    nowMs: number;
    thresholds: Record<MediaPipeSupportedEventType, MediaPipeThresholdResolution>;
    signalGapGraceMs?: number;
};

export type EvaluateMediaPipeSignalDispatchResult = {
    tracker: MediaPipeSignalTrackerState;
    shouldEmit: boolean;
    durationMs?: number;
    aggregation?: MediaPipeTelemetryAggregation;
};

export type AnalyzeMediaPipeFrameArgs = {
    landmarksByFace: MediaPipeLandmark[][];
    confidenceScores?: number[];
    confidenceThreshold: number;
    tolerateDownwardGaze?: boolean;
    calibrationProfile?: MediaPipeCalibrationProfile | null;
};

export type ResolveMediaPipeThresholdsArgs = {
    sandbox: TelemetryMediaPipeSandboxSchemaValues;
    ruleOverrides?: Partial<
        Record<MediaPipeSupportedEventType, TelemetryRuleOverrideSchemaValues | undefined>
    >;
};

export type MediaPipeRuntimeEnabledArgs = {
    sandbox: TelemetryMediaPipeSandboxSchemaValues | null | undefined;
    configuration: ExamConfiguration | null | undefined;
    stage: MediaPipeRolloutStage;
    hasCameraStream?: boolean;
    runtimeAccessAllowed?: boolean;
};

export type MediaPipeCalibrationCandidateReason =
    | 'accepted'
    | 'too-close'
    | 'too-far'
    | 'cropped'
    | 'off-center'
    | 'low-confidence'
    | 'eyes-closed';

export type MediaPipeCalibrationEvaluationResult = {
    isValid: boolean;
    reason: MediaPipeCalibrationCandidateReason;
    details?: string;
};
