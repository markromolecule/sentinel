import type { RefObject } from 'react';
import type { MediaPipeFrameAnalysis, TelemetrySettings } from '@sentinel/shared';
import type { ExamConfig, ExamRuntimeAccess } from '@sentinel/shared/types';

/**
 * Fully-resolved sandbox configuration — all fields are guaranteed to be
 * defined. Derived from the raw `TelemetrySettings['mediaPipeSandbox']` prop
 * by `useMediapipeSandboxConfig`.
 */
export type ResolvedMediaPipeSandbox = Required<NonNullable<TelemetrySettings['mediaPipeSandbox']>>;

export type UseAttemptMediaPipeMonitoringArgs = {
    examId: string;
    configuration?: ExamConfig;
    mediaPipeSandbox?: TelemetrySettings['mediaPipeSandbox'];
    examSessionId?: string;
    attemptId?: string;
    isRedirectingToTurnIn?: boolean;
    isTerminalAttempt?: boolean;
    runtimeAccess?: ExamRuntimeAccess | null;
};

export type MediaPipeAttemptIncident = {
    eventType: 'GAZE_OFF_SCREEN' | 'NO_FACE_DETECTED' | 'MULTIPLE_FACES';
    detectedAt: string;
    analysis: MediaPipeFrameAnalysis;
};

export type UseAttemptMediaPipeMonitoringResult = {
    videoRef: RefObject<HTMLVideoElement | null>;
    analysis: MediaPipeFrameAnalysis | null;
    phase: 'idle' | 'starting' | 'running' | 'error';
    errorMessage: string | null;
    activeIncident: MediaPipeAttemptIncident | null;
    dismissIncident: () => void;
    isEnabled: boolean;
};
