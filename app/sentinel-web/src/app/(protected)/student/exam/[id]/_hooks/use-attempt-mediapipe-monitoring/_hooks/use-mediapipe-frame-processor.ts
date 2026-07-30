import { useCallback } from 'react';
import type { FaceLandmarker } from '@mediapipe/tasks-vision';
import {
    analyzeMediaPipeFrame,
    evaluateMediaPipeSignalDispatch,
    resolveMediaPipeThresholds,
} from '@sentinel/shared';
import type { MediaPipeFrameAnalysis } from '@sentinel/shared';
import type { ExamConfig } from '@sentinel/shared/types';
import {
    isMediaPipeTelemetryEventEnabled,
    writeMonitoringEventTrace,
} from '@/app/(protected)/student/exam/[id]/_lib/web-telemetry-client';
import type { MediaPipeAttemptIncident, ResolvedMediaPipeSandbox } from '../_types';
import {
    mapNormalizedLandmarksToMediaPipeLandmarks,
    normalizeAttemptMediaPipeAnalysis,
} from '../_utils';
import type { MediapipeRuntimeEligibility } from './use-mediapipe-runtime-eligibility';
import { buildAttemptMediaPipeDevelopmentDiagnostics } from './use-mediapipe-runtime-thresholds';

export type MediapipeSignalThresholds = ReturnType<typeof resolveMediaPipeThresholds>;

export type UseMediaPipeFrameProcessorArgs = {
    activeSandbox: ResolvedMediaPipeSandbox | undefined;
    calibrationProfile: any;
    configuration: ExamConfig | undefined;
    thresholds: MediapipeSignalThresholds;
    trackerRef: React.MutableRefObject<
        ReturnType<typeof import('@sentinel/shared').createMediaPipeSignalTrackerState>
    >;
    setAnalysis: (analysis: MediaPipeFrameAnalysis | null) => void;
    dispatchIncidentRef: React.MutableRefObject<(args: any) => Promise<void>>;
    eligibility: MediapipeRuntimeEligibility;
    attemptId?: string;
    examSessionId?: string;
    studentId?: string;
    setActiveIncident: (incident: MediaPipeAttemptIncident | null) => void;
};

export type UseMediaPipeFrameProcessorResult = {
    processFrame: (
        now: number,
        videoElement: HTMLVideoElement,
        faceLandmarker: FaceLandmarker,
    ) => void;
};

/**
 * Custom hook to process a single MediaPipe frame.
 * Conducts landmark analysis, resolves telemetry signal configuration, evaluates
 * signal-dispatch criteria (cooldowns & thresholds), and handles event dispatching.
 */
export function useMediaPipeFrameProcessor({
    activeSandbox,
    calibrationProfile,
    configuration,
    thresholds,
    trackerRef,
    setAnalysis,
    dispatchIncidentRef,
    eligibility,
    attemptId,
    examSessionId,
    studentId,
    setActiveIncident,
}: UseMediaPipeFrameProcessorArgs): UseMediaPipeFrameProcessorResult {
    const processFrame = useCallback(
        (now: number, videoElement: HTMLVideoElement, faceLandmarker: FaceLandmarker): void => {
            const currentSandbox = activeSandbox;
            const tolerateDownwardGaze = true;

            if (!currentSandbox || !configuration || !examSessionId || !studentId) {
                return;
            }

            const detectionResult = faceLandmarker.detectForVideo(videoElement, now);

            const landmarksByFace = mapNormalizedLandmarksToMediaPipeLandmarks(
                detectionResult.faceLandmarks ?? [],
            );

            const frameAnalysis = analyzeMediaPipeFrame({
                landmarksByFace,
                confidenceThreshold: currentSandbox.confidenceThreshold,
                calibrationProfile,
                tolerateDownwardGaze,
            });

            const normalizedAnalysis = normalizeAttemptMediaPipeAnalysis({
                analysis: frameAnalysis,
                configuration,
            });

            // Only dispatch telemetry for signals that are enabled for this exam.
            const telemetrySignal =
                normalizedAnalysis.signal &&
                isMediaPipeTelemetryEventEnabled(configuration, normalizedAnalysis.signal)
                    ? normalizedAnalysis.signal
                    : null;

            setAnalysis(normalizedAnalysis);

            const detectionTime = new Date(Date.now()).toISOString();
            const developmentDiagnostics = buildAttemptMediaPipeDevelopmentDiagnostics({
                activeSandbox: currentSandbox,
                thresholds,
                hasCalibrationProfile: Boolean(calibrationProfile),
                tolerateDownwardGaze,
            });

            const dispatch = evaluateMediaPipeSignalDispatch({
                currentSignal: telemetrySignal,
                tracker: trackerRef.current,
                nowMs: Date.now(),
                thresholds,
                signalGapGraceMs: currentSandbox.frameIntervalMs,
            });

            trackerRef.current = dispatch.tracker;

            if (telemetrySignal && !dispatch.shouldEmit) {
                writeMonitoringEventTrace({
                    detectorSource: 'mediapipe',
                    eventType: telemetrySignal,
                    eventSubtype: normalizedAnalysis.status,
                    detectionTime,
                    disposition: 'suppressed',
                    reason:
                        dispatch.tracker.lastEmittedAtMs !== null
                            ? 'dispatch-cooldown-active'
                            : 'awaiting-duration-threshold',
                    developmentContext: {
                        ...developmentDiagnostics,
                        analysisStatus: normalizedAnalysis.status,
                        confidenceScore: normalizedAnalysis.confidenceScore ?? undefined,
                        trackedSignal: dispatch.tracker.activeSignal ?? undefined,
                        activeSinceMs: dispatch.tracker.activeSinceMs ?? undefined,
                    },
                });
            }

            if (dispatch.shouldEmit && telemetrySignal) {
                void dispatchIncidentRef.current({
                    telemetrySignal,
                    normalizedAnalysis,
                    detectionTime,
                    developmentDiagnostics,
                    dispatch,
                    videoElement,
                    eligibility,
                    attemptId,
                    sessionId: examSessionId,
                    resolvedStudentId: studentId,
                    resolvedConfiguration: configuration,
                    sandbox: currentSandbox,
                    setActiveIncident,
                });
            }
        },
        [
            activeSandbox,
            calibrationProfile,
            configuration,
            thresholds,
            trackerRef,
            setAnalysis,
            dispatchIncidentRef,
            eligibility,
            attemptId,
            examSessionId,
            studentId,
            setActiveIncident,
        ],
    );

    return { processFrame };
}
