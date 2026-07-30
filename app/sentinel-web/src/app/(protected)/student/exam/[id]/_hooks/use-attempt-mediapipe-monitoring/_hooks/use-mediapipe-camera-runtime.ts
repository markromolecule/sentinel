import { useCallback, useEffect, useRef, useState } from 'react';
import { createMediaPipeSignalTrackerState, resolveMediaPipeThresholds } from '@sentinel/shared';
import type { MediaPipeFrameAnalysis } from '@sentinel/shared';
import type { ExamConfig } from '@sentinel/shared/types';
import { useStudentExamMediaPipeStream } from '@/app/(protected)/student/exam/[id]/_components/student-exam-mediapipe-provider';
import type { MediaPipeAttemptIncident, ResolvedMediaPipeSandbox } from '../_types';
import type { MediapipeRuntimeEligibility } from './use-mediapipe-runtime-eligibility';
import { useCameraStream } from './use-camera-stream';
import { useMediapipeFaceLandmarker } from './use-mediapipe-face-landmarker';
import { useIncidentTelemetryDispatcher } from './use-incident-telemetry-dispatcher';
import { useMediaPipeFrameProcessor } from './use-mediapipe-frame-processor';

export type MediapipeSignalThresholds = ReturnType<typeof resolveMediaPipeThresholds>;

export type UseMediapipeCameraRuntimeArgs = {
    examId: string;
    examSessionId?: string;
    attemptId?: string;
    studentId?: string;
    configuration?: ExamConfig;
    activeSandbox: ResolvedMediaPipeSandbox | undefined;
    thresholds: MediapipeSignalThresholds;
    eligibility: MediapipeRuntimeEligibility;
    setActiveIncident: (incident: MediaPipeAttemptIncident | null) => void;
};

export type UseMediapipeCameraRuntimeResult = {
    videoRef: React.RefObject<HTMLVideoElement | null>;
    analysis: MediaPipeFrameAnalysis | null;
    phase: 'idle' | 'starting' | 'running' | 'error';
    errorMessage: string | null;
};

/**
 * Owns the entire camera lifecycle for MediaPipe monitoring during an exam attempt:
 *
 * - Acquires the camera stream (shared or owned).
 * - Initialises the MediaPipe FaceLandmarker.
 * - Runs the per-frame analysis tick loop.
 * - Dispatches telemetry events and raises incidents when signal thresholds are exceeded.
 * - Tears everything down cleanly on unmount or when eligibility is lost.
 */
export function useMediapipeCameraRuntime({
    examId,
    examSessionId,
    attemptId,
    studentId,
    configuration,
    activeSandbox,
    thresholds,
    eligibility,
    setActiveIncident,
}: UseMediapipeCameraRuntimeArgs): UseMediapipeCameraRuntimeResult {
    const { stream: sharedStream, faceLandmarker: preLoadedFaceLandmarker } =
        useStudentExamMediaPipeStream();

    const videoRef = useRef<HTMLVideoElement | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const lastFrameAtRef = useRef(0);
    const lastSessionIdRef = useRef<string | null>(null);
    const trackerRef = useRef(createMediaPipeSignalTrackerState());

    const [analysis, setAnalysis] = useState<MediaPipeFrameAnalysis | null>(null);
    const [phase, setPhase] = useState<'idle' | 'starting' | 'running' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const { startStream, stopStream } = useCameraStream();
    const { faceLandmarkerRef, initFaceLandmarker, closeFaceLandmarker } =
        useMediapipeFaceLandmarker();
    const { dispatchIncident, clearInFlightEvents } = useIncidentTelemetryDispatcher();

    const { baseRuntimeEnabled, activationState, isEnabled } = eligibility;

    // Use refs for callbacks that might change references to avoid restarting the useEffect runtime loop.
    const startStreamRef = useRef(startStream);
    const initFaceLandmarkerRef = useRef(initFaceLandmarker);
    const dispatchIncidentRef = useRef(dispatchIncident);

    useEffect(() => {
        startStreamRef.current = startStream;
        initFaceLandmarkerRef.current = initFaceLandmarker;
        dispatchIncidentRef.current = dispatchIncident;
    });

    const { processFrame } = useMediaPipeFrameProcessor({
        activeSandbox,
        calibrationProfile: activationState.storedFlow.mediaPipeCalibrationProfile,
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
    });

    const processFrameRef = useRef(processFrame);
    useEffect(() => {
        processFrameRef.current = processFrame;
    });

    // ---------------------------------------------------------------------------
    // Cleanup — stops the animation loop, closes the FaceLandmarker, and releases
    // the camera stream if this hook acquired it.
    // ---------------------------------------------------------------------------
    const stopRuntime = useCallback(() => {
        if (animationFrameRef.current !== null) {
            window.cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }

        closeFaceLandmarker(preLoadedFaceLandmarker);
        stopStream(videoRef.current);
        clearInFlightEvents();
        setActiveIncident(null);
    }, [
        closeFaceLandmarker,
        stopStream,
        clearInFlightEvents,
        preLoadedFaceLandmarker,
        setActiveIncident,
    ]);

    // ---------------------------------------------------------------------------
    // Main effect — starts the runtime when eligibility is satisfied and tears it
    // down when the component unmounts or any dependency changes.
    // ---------------------------------------------------------------------------
    useEffect(() => {
        if (
            !baseRuntimeEnabled ||
            !isEnabled ||
            !configuration ||
            !activeSandbox ||
            !examSessionId ||
            !studentId
        ) {
            stopRuntime();
            setPhase('idle');
            setAnalysis(null);
            setErrorMessage(
                baseRuntimeEnabled && !activationState.isValid
                    ? activationState.status === 'stale'
                        ? 'MediaPipe checkup activation expired before the attempt began. Return to checkup to reactivate monitoring.'
                        : 'MediaPipe must be activated from checkup before it can continue into the live attempt.'
                    : null,
            );
            trackerRef.current = createMediaPipeSignalTrackerState();
            lastFrameAtRef.current = 0;
            return;
        }

        const sandbox = activeSandbox;
        const sessionId = examSessionId;
        let disposed = false;

        async function start() {
            // Reset per-session tracking state when the session changes.
            if (examSessionId !== lastSessionIdRef.current) {
                trackerRef.current = createMediaPipeSignalTrackerState();
                lastFrameAtRef.current = 0;
                lastSessionIdRef.current = examSessionId ?? null;
            }

            setPhase('starting');
            setErrorMessage(null);

            try {
                const stream = await startStreamRef.current(sharedStream, videoRef.current);

                if (disposed) {
                    if (!sharedStream) {
                        stream.getTracks().forEach((track) => track.stop());
                    }
                    return;
                }

                const landmarker = await initFaceLandmarkerRef.current(
                    preLoadedFaceLandmarker,
                    sandbox,
                    () => disposed,
                );

                if (disposed || !landmarker) return;

                setPhase('running');

                // -----------------------------------------------------------------
                // Per-frame tick — runs on every animation frame, throttled by
                // `sandbox.frameIntervalMs`.
                // -----------------------------------------------------------------
                const tick = () => {
                    const currentSandbox = activeSandbox;

                    if (
                        disposed ||
                        !videoRef.current ||
                        !faceLandmarkerRef.current ||
                        !currentSandbox
                    ) {
                        return;
                    }

                    const now = performance.now();

                    if (now - lastFrameAtRef.current < currentSandbox.frameIntervalMs) {
                        animationFrameRef.current = window.requestAnimationFrame(tick);
                        return;
                    }

                    lastFrameAtRef.current = now;

                    if (videoRef.current.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
                        animationFrameRef.current = window.requestAnimationFrame(tick);
                        return;
                    }

                    processFrameRef.current(now, videoRef.current, faceLandmarkerRef.current);

                    animationFrameRef.current = window.requestAnimationFrame(tick);
                };

                animationFrameRef.current = window.requestAnimationFrame(tick);
            } catch (error) {
                console.error('Failed to start attempt MediaPipe monitoring.', error);
                stopRuntime();
                setPhase('error');
                setErrorMessage('MediaPipe monitoring could not start for this attempt.');
            }
        }

        void start();

        return () => {
            disposed = true;
            stopRuntime();
        };
    }, [
        examSessionId,
        attemptId,
        studentId,
        activationState.isValid,
        activationState.status,
        activationState.storedFlow.mediaPipeCalibrationProfile,
        isEnabled,
        baseRuntimeEnabled,
        configuration,
        examId,
        sharedStream,
        preLoadedFaceLandmarker,
        stopRuntime,
        activeSandbox,
        thresholds,
        setActiveIncident,
    ]);

    return { videoRef, analysis, phase, errorMessage };
}
