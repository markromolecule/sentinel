'use client';

import { useAuth } from '@sentinel/hooks';
import {
    UseAttemptMediaPipeMonitoringArgs,
    UseAttemptMediaPipeMonitoringResult,
    MediaPipeAttemptIncident,
} from './_types';
export type {
    UseAttemptMediaPipeMonitoringArgs,
    UseAttemptMediaPipeMonitoringResult,
    MediaPipeAttemptIncident,
};
import { useMediapipeSandboxConfig } from './_hooks/use-mediapipe-sandbox-config';
import { useMediapipeRuntimeEligibility } from './_hooks/use-mediapipe-runtime-eligibility';
import { useMediapipeRuntimeThresholds } from './_hooks/use-mediapipe-runtime-thresholds';
import { useMediapipeIncidentState } from './_hooks/use-mediapipe-incident-state';
import { useMediapipeCameraRuntime } from './_hooks/use-mediapipe-camera-runtime';

/**
 * Orchestrates MediaPipe face tracking and gaze analysis during an active exam attempt.
 *
 * Delegates each responsibility to a focused sub-hook:
 * - `useMediapipeSandboxConfig`      — resolves raw sandbox props into a stable object.
 * - `useMediapipeRuntimeEligibility` — determines if monitoring is allowed to run.
 * - `useMediapipeRuntimeThresholds`  — computes signal-dispatch thresholds.
 * - `useMediapipeIncidentState`      — manages the active incident lifecycle.
 * - `useMediapipeCameraRuntime`      — owns the camera stream, FaceLandmarker, and tick loop.
 */
export function useAttemptMediaPipeMonitoring({
    examId,
    configuration,
    mediaPipeSandbox,
    examSessionId,
    attemptId,
    isRedirectingToTurnIn,
    isTerminalAttempt,
    runtimeAccess,
}: UseAttemptMediaPipeMonitoringArgs): UseAttemptMediaPipeMonitoringResult {
    const { user } = useAuth();
    const studentId = user?.id;

    const activeSandbox = useMediapipeSandboxConfig({ mediaPipeSandbox });

    const eligibility = useMediapipeRuntimeEligibility({
        examId,
        examSessionId,
        studentId,
        configuration,
        activeSandbox,
        isRedirectingToTurnIn,
        isTerminalAttempt,
        runtimeAccess,
    });

    const thresholds = useMediapipeRuntimeThresholds({ activeSandbox });

    const { activeIncident, setActiveIncident, dismissIncident } = useMediapipeIncidentState();

    const { videoRef, analysis, phase, errorMessage } = useMediapipeCameraRuntime({
        examId,
        examSessionId,
        attemptId,
        studentId,
        configuration,
        activeSandbox,
        thresholds,
        eligibility,
        setActiveIncident,
    });

    return {
        videoRef,
        analysis,
        phase,
        errorMessage,
        activeIncident,
        dismissIncident,
        isEnabled: eligibility.isEnabled,
    };
}
