'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type {
    FaceLandmarker,
    FaceLandmarkerResult,
    NormalizedLandmark,
} from '@mediapipe/tasks-vision';
import {
    analyzeMediaPipeFrame,
    buildMediaPipeCalibrationProfile,
    calculateMediaPipeFaceBounds,
    createMediaPipeMultipleFacesConfirmationState,
    createMediaPipeCalibrationSample,
    evaluateMediaPipeCalibrationCandidate,
    evaluateMediaPipeMultipleFacesConfirmation,
    getMediaPipeClientCapabilities,
    isMediaPipeRuntimeEnabled,
    type MediaPipeCalibrationProfile,
    type MediaPipeCalibrationSample,
    type MediaPipeFrameAnalysis,
    type MediaPipeLandmark,
    type TelemetrySettings,
} from '@sentinel/shared';
import type { ExamConfiguration } from '@sentinel/shared/types';

const MEDIAPIPE_WASM_PATH = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.34/wasm';
const MEDIAPIPE_MODEL_PATH =
    'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
const REQUIRED_CALIBRATION_READY_FRAMES = 6; // Approx 3 seconds at 500ms intervals

function drawOverlay(args: {
    canvas: HTMLCanvasElement | null;
    video: HTMLVideoElement | null;
    landmarksByFace: MediaPipeLandmark[][];
    analysis: MediaPipeFrameAnalysis | null;
    debugEnabled: boolean;
    isCalibrated: boolean;
}) {
    const { canvas, video, landmarksByFace, analysis, debugEnabled, isCalibrated } = args;

    if (!canvas || !video) {
        return;
    }

    const width = video.videoWidth;
    const height = video.videoHeight;

    if (!width || !height) {
        return;
    }

    if (canvas.width !== width) {
        canvas.width = width;
    }

    if (canvas.height !== height) {
        canvas.height = height;
    }

    const context = canvas.getContext('2d');

    if (!context) {
        return;
    }

    context.clearRect(0, 0, width, height);

    // Draw alignment guide if not calibrated
    if (!isCalibrated) {
        context.save();
        context.beginPath();
        context.setLineDash([8, 4]);
        context.ellipse(width * 0.5, height * 0.45, width * 0.22, height * 0.32, 0, 0, Math.PI * 2);
        context.lineWidth = 3;
        context.strokeStyle = analysis?.status === 'ready' ? '#22c55e' : 'rgba(255, 255, 255, 0.4)';
        context.stroke();

        // Label
        context.fillStyle = 'rgba(15, 23, 42, 0.7)';
        const labelText = analysis?.status === 'ready' ? 'Hold still...' : 'Align face in guide';
        const labelWidth = context.measureText(labelText).width + 24;
        context.roundRect(
            width * 0.5 - labelWidth / 2,
            height * 0.45 + height * 0.28 + 15,
            labelWidth,
            28,
            6,
        );
        context.fill();
        context.fillStyle = '#fff';
        context.font = 'bold 13px sans-serif';
        context.textAlign = 'center';
        context.fillText(labelText, width * 0.5, height * 0.45 + height * 0.28 + 34);
        context.restore();
    }

    if (!debugEnabled) {
        return;
    }

    context.lineWidth = 2;
    context.strokeStyle =
        analysis?.status === 'off-screen'
            ? '#f59e0b'
            : analysis?.status === 'multiple-faces'
              ? '#ef4444'
              : '#22c55e';
    context.fillStyle = context.strokeStyle;

    landmarksByFace.forEach((landmarks) => {
        landmarks.forEach((landmark, index) => {
            if (index % 6 !== 0) {
                return;
            }

            context.beginPath();
            context.arc(landmark.x * width, landmark.y * height, 1.5, 0, Math.PI * 2);
            context.fill();
        });

        const bounds = calculateMediaPipeFaceBounds(landmarks);

        if (!bounds) {
            return;
        }

        context.strokeRect(
            bounds.minX * width,
            bounds.minY * height,
            bounds.width * width,
            bounds.height * height,
        );
    });
}

type UseCheckupMediaPipeArgs = {
    videoRef: RefObject<HTMLVideoElement | null>;
    streamActive: boolean;
    configuration: ExamConfiguration;
    mediaPipeSandbox: TelemetrySettings['mediaPipeSandbox'];
};

function mapNormalizedLandmarksToMediaPipeLandmarks(landmarksByFace: NormalizedLandmark[][]) {
    return landmarksByFace.map((landmarks) =>
        landmarks.map((landmark) => ({
            x: landmark.x,
            y: landmark.y,
            z: landmark.z,
        })),
    );
}

function isCalibrationSampleStable(args: {
    previousSample: MediaPipeCalibrationSample | null;
    nextSample: MediaPipeCalibrationSample;
}) {
    if (!args.previousSample) {
        return true;
    }

    const faceCenterDelta =
        Math.abs(args.nextSample.faceBounds.centerX - args.previousSample.faceBounds.centerX) +
        Math.abs(args.nextSample.faceBounds.centerY - args.previousSample.faceBounds.centerY);
    const headDelta =
        args.nextSample.gaze.headHorizontalOffset !== null &&
        args.previousSample.gaze.headHorizontalOffset !== null &&
        args.nextSample.gaze.headVerticalOffset !== null &&
        args.previousSample.gaze.headVerticalOffset !== null
            ? Math.abs(
                  args.nextSample.gaze.headHorizontalOffset -
                      args.previousSample.gaze.headHorizontalOffset,
              ) +
              Math.abs(
                  args.nextSample.gaze.headVerticalOffset -
                      args.previousSample.gaze.headVerticalOffset,
              )
            : 0;
    const irisDelta =
        args.nextSample.gaze.irisHorizontalOffset !== null &&
        args.previousSample.gaze.irisHorizontalOffset !== null &&
        args.nextSample.gaze.irisVerticalOffset !== null &&
        args.previousSample.gaze.irisVerticalOffset !== null
            ? Math.abs(
                  args.nextSample.gaze.irisHorizontalOffset -
                      args.previousSample.gaze.irisHorizontalOffset,
              ) +
              Math.abs(
                  args.nextSample.gaze.irisVerticalOffset -
                      args.previousSample.gaze.irisVerticalOffset,
              )
            : 0;

    return faceCenterDelta <= 0.08 && headDelta <= 0.12 && irisDelta <= 0.28;
}

export function useCheckupMediaPipe({
    videoRef,
    streamActive,
    configuration,
    mediaPipeSandbox,
}: UseCheckupMediaPipeArgs) {
    const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const lastFrameAtRef = useRef(0);
    const runtimeGenerationRef = useRef(0);
    const multipleFacesConfirmationRef = useRef(
        createMediaPipeMultipleFacesConfirmationState(),
    );
    const [analysis, setAnalysis] = useState<MediaPipeFrameAnalysis | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [calibrationProgress, setCalibrationProgress] = useState(0);
    const [calibrationReadyFrames, setCalibrationReadyFrames] = useState(0);
    const [calibrationHoldSecondsRemaining, setCalibrationHoldSecondsRemaining] = useState(0);
    const [calibrationProfile, setCalibrationProfile] =
        useState<MediaPipeCalibrationProfile | null>(null);
    const [isCalibrated, setIsCalibrated] = useState(false);
    const [calibrationFeedback, setCalibrationFeedback] = useState<string | null>(null);

    const isEnabled = useMemo(
        () =>
            isMediaPipeRuntimeEnabled({
                sandbox: mediaPipeSandbox,
                configuration,
                stage: 'checkup',
                hasCameraStream: streamActive,
            }),
        [configuration, mediaPipeSandbox, streamActive],
    );

    useEffect(() => {
        const runtimeGeneration = ++runtimeGenerationRef.current;

        if (!isEnabled || !streamActive || !videoRef.current) {
            runtimeGenerationRef.current += 1;

            if (animationFrameRef.current !== null) {
                window.cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }

            if (
                faceLandmarkerRef.current &&
                typeof faceLandmarkerRef.current.close === 'function'
            ) {
                faceLandmarkerRef.current.close();
                faceLandmarkerRef.current = null;
            }

            setAnalysis(null);
            setErrorMessage(null);
            setCalibrationProgress(0);
            setCalibrationReadyFrames(0);
            setCalibrationHoldSecondsRemaining(0);
            setCalibrationProfile(null);
            setIsCalibrated(false);
            setCalibrationFeedback(null);
            lastFrameAtRef.current = 0;
            multipleFacesConfirmationRef.current =
                createMediaPipeMultipleFacesConfirmationState();
            drawOverlay({
                canvas: overlayCanvasRef.current,
                video: videoRef.current,
                landmarksByFace: [],
                analysis: null,
                debugEnabled: false,
                isCalibrated: false,
            });
            return;
        }

        let disposed = false;
        let calibrationSamples: MediaPipeCalibrationSample[] = [];
        let hasCompletedCalibration = false;
        let completedCalibrationProfile: MediaPipeCalibrationProfile | null = null;

        async function start() {
            try {
                lastFrameAtRef.current = 0;
                const visionModule = await import('@mediapipe/tasks-vision');
                const resolver =
                    await visionModule.FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_PATH);

                if (disposed) {
                    return;
                }

                faceLandmarkerRef.current = await visionModule.FaceLandmarker.createFromOptions(
                    resolver,
                    {
                        baseOptions: {
                            modelAssetPath: MEDIAPIPE_MODEL_PATH,
                        },
                        runningMode: 'VIDEO',
                        numFaces: 2,
                        outputFaceBlendshapes: false,
                        outputFacialTransformationMatrixes: false,
                        minFaceDetectionConfidence: Math.max(
                            0.35,
                            mediaPipeSandbox.confidenceThreshold - 0.2,
                        ),
                        minFacePresenceConfidence: Math.max(
                            0.35,
                            mediaPipeSandbox.confidenceThreshold - 0.2,
                        ),
                        minTrackingConfidence: Math.max(
                            0.35,
                            mediaPipeSandbox.confidenceThreshold - 0.2,
                        ),
                    },
                );

                const tick = () => {
                    if (
                        disposed ||
                        runtimeGeneration !== runtimeGenerationRef.current ||
                        !videoRef.current ||
                        !faceLandmarkerRef.current
                    ) {
                        return;
                    }

                    const now = performance.now();

                    if (now - lastFrameAtRef.current < mediaPipeSandbox.frameIntervalMs) {
                        animationFrameRef.current = window.requestAnimationFrame(tick);
                        return;
                    }

                    lastFrameAtRef.current = now;

                    if (videoRef.current.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
                        animationFrameRef.current = window.requestAnimationFrame(tick);
                        return;
                    }

                    const result: FaceLandmarkerResult = faceLandmarkerRef.current.detectForVideo(
                        videoRef.current,
                        now,
                    );
                    const landmarksByFace = mapNormalizedLandmarksToMediaPipeLandmarks(
                        result.faceLandmarks ?? [],
                    );

                    const activeConfidenceThreshold = Math.max(
                        0.35,
                        mediaPipeSandbox.confidenceThreshold - 0.15,
                    );
                    const nextAnalysis = analyzeMediaPipeFrame({
                        landmarksByFace,
                        confidenceThreshold: activeConfidenceThreshold,
                        tolerateDownwardGaze: true,
                        calibrationProfile: completedCalibrationProfile,
                    });
                    const multipleFacesConfirmation = evaluateMediaPipeMultipleFacesConfirmation({
                        analysis: nextAnalysis,
                        state: multipleFacesConfirmationRef.current,
                    });
                    multipleFacesConfirmationRef.current = multipleFacesConfirmation.state;
                    const stabilizedAnalysis = multipleFacesConfirmation.analysis;

                    setAnalysis(stabilizedAnalysis);

                    let currentFeedback: string | null = null;
                    if (!hasCompletedCalibration) {
                        const evaluation = evaluateMediaPipeCalibrationCandidate({
                            analysis: stabilizedAnalysis,
                            landmarks: landmarksByFace[0] ?? [],
                            confidenceThreshold: activeConfidenceThreshold,
                        });

                        if (!evaluation.isValid) {
                            currentFeedback = evaluation.details ?? 'Align face in guide';
                        }

                        const calibrationSample =
                            evaluation.isValid && landmarksByFace[0]
                                ? createMediaPipeCalibrationSample({
                                      landmarks: landmarksByFace[0],
                                      confidenceScore: stabilizedAnalysis.confidenceScore,
                                  })
                                : null;

                        if (
                            calibrationSample &&
                            isCalibrationSampleStable({
                                previousSample:
                                    calibrationSamples[calibrationSamples.length - 1] ?? null,
                                nextSample: calibrationSample,
                            })
                        ) {
                            calibrationSamples = [...calibrationSamples, calibrationSample].slice(
                                -REQUIRED_CALIBRATION_READY_FRAMES,
                            );
                        } else {
                            calibrationSamples = calibrationSamples.slice(
                                0,
                                Math.max(0, calibrationSamples.length - 2),
                            );
                        }

                        if (calibrationSamples.length >= REQUIRED_CALIBRATION_READY_FRAMES) {
                            completedCalibrationProfile = buildMediaPipeCalibrationProfile({
                                samples: calibrationSamples,
                            });
                            hasCompletedCalibration = true;
                        }
                    }

                    setCalibrationFeedback(currentFeedback);

                    const nextProgress = hasCompletedCalibration
                        ? 100
                        : Math.round(
                              (calibrationSamples.length / REQUIRED_CALIBRATION_READY_FRAMES) * 100,
                          );
                    const remainingReadyFrames = hasCompletedCalibration
                        ? 0
                        : Math.max(
                              REQUIRED_CALIBRATION_READY_FRAMES - calibrationSamples.length,
                              0,
                          );
                    const nextHoldSecondsRemaining = hasCompletedCalibration
                        ? 0
                        : Number(
                              (
                                  (remainingReadyFrames * mediaPipeSandbox.frameIntervalMs) /
                                  1000
                              ).toFixed(1),
                          );
                    setCalibrationProgress(nextProgress);
                    setCalibrationReadyFrames(
                        hasCompletedCalibration
                            ? REQUIRED_CALIBRATION_READY_FRAMES
                            : calibrationSamples.length,
                    );
                    setCalibrationHoldSecondsRemaining(nextHoldSecondsRemaining);
                    setCalibrationProfile(completedCalibrationProfile);
                    setIsCalibrated(hasCompletedCalibration);

                    drawOverlay({
                        canvas: overlayCanvasRef.current,
                        video: videoRef.current,
                        landmarksByFace,
                        analysis: stabilizedAnalysis,
                        debugEnabled: mediaPipeSandbox.debugOverlayEnabled,
                        isCalibrated: hasCompletedCalibration,
                    });

                    animationFrameRef.current = window.requestAnimationFrame(tick);
                };

                animationFrameRef.current = window.requestAnimationFrame(tick);
            } catch (error) {
                console.error('Failed to initialize checkup MediaPipe runtime.', error);
                setAnalysis(null);
                setCalibrationProgress(0);
                setCalibrationReadyFrames(0);
                setCalibrationHoldSecondsRemaining(0);
                setCalibrationProfile(null);
                setIsCalibrated(false);
                setCalibrationFeedback(null);
                setErrorMessage(
                    'MediaPipe could not start during checkup. Refresh the page or re-allow camera access to complete calibration.',
                );
            }
        }

        void start();

        return () => {
            disposed = true;
            runtimeGenerationRef.current += 1;

            if (animationFrameRef.current !== null) {
                window.cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }

            if (
                faceLandmarkerRef.current &&
                typeof faceLandmarkerRef.current.close === 'function'
            ) {
                faceLandmarkerRef.current.close();
                faceLandmarkerRef.current = null;
            }
            multipleFacesConfirmationRef.current =
                createMediaPipeMultipleFacesConfirmationState();
        };
    }, [configuration, isEnabled, mediaPipeSandbox, streamActive, videoRef]);

    return {
        overlayCanvasRef,
        analysis,
        errorMessage,
        calibrationFeedback,
        calibrationProgress,
        calibrationReadyFrames,
        calibrationHoldSecondsRemaining,
        calibrationProfile,
        requiredCalibrationReadyFrames: REQUIRED_CALIBRATION_READY_FRAMES,
        isCalibrated,
        isEnabled,
        clientCapabilities: getMediaPipeClientCapabilities(),
    };
}
