import { useEffect, useRef, useState } from 'react';
import {
    analyzeMediaPipeFrame,
    type MediaPipeCalibrationProfile,
    type MediaPipeFrameAnalysis,
    type MediaPipeLandmark,
} from '@sentinel/shared';
import type { ExamConfiguration, TelemetryMediaPipeSandboxSettings } from '@sentinel/shared/types';
import type { ApiClientType } from '@sentinel/services';
import { readStoredMobileCalibrationProfile } from '@/features/exam/lib/mobile-exam-storage';
import { emitMobileTelemetryEvent } from '@/features/exam/lib/mobile-telemetry-client';

/**
 * Arguments for useMobileMediaPipeMonitoring hook.
 */
export type UseMobileMediaPipeMonitoringArgs = {
    examId: string;
    apiClient?: ApiClientType;
    configuration?: ExamConfiguration;
    mediaPipeSandbox?: TelemetryMediaPipeSandboxSettings & {
        consecutiveFrameThreshold?: number;
        cooldownMs?: number;
    };
    examSessionId: string;
    studentId?: string;
    landmarksByFace: MediaPipeLandmark[][];
    onAnomalyDetected?: (
        eventType: 'GAZE_OFF_SCREEN' | 'MULTIPLE_FACES' | 'NO_FACE_DETECTED',
    ) => void | Promise<void>;
};

/**
 * Result returned by useMobileMediaPipeMonitoring hook.
 */
export type UseMobileMediaPipeMonitoringResult = {
    warningStatus:
    'Face not detected' | 'Multiple faces detected' | 'Looking away from screen' | null;
    isMonitoring: boolean;
    analysis: MediaPipeFrameAnalysis | null;
    calibrationProfile: MediaPipeCalibrationProfile | null;
};

/**
 * Custom React hook that runs real-time MediaPipe face, gaze, and multi-face monitoring
 * on face landmark frames during a mobile exam session. Emits telemetry events to the backend
 * and manages incident warning states.
 */
export function useMobileMediaPipeMonitoring({
    examId,
    apiClient,
    configuration,
    mediaPipeSandbox,
    examSessionId,
    studentId,
    landmarksByFace,
    onAnomalyDetected,
}: UseMobileMediaPipeMonitoringArgs): UseMobileMediaPipeMonitoringResult {
    const [calibrationProfile, setCalibrationProfile] =
        useState<MediaPipeCalibrationProfile | null>(null);
    const [warningStatus, setWarningStatus] =
        useState<UseMobileMediaPipeMonitoringResult['warningStatus']>(null);
    const [analysis, setAnalysis] = useState<MediaPipeFrameAnalysis | null>(null);

    const onAnomalyDetectedRef = useRef(onAnomalyDetected);
    onAnomalyDetectedRef.current = onAnomalyDetected;

    const consecutiveFrames = useRef<Record<string, number>>({
        GAZE_OFF_SCREEN: 0,
        MULTIPLE_FACES: 0,
        NO_FACE_DETECTED: 0,
    });

    const lastTriggeredAt = useRef<Record<string, number>>({
        GAZE_OFF_SCREEN: 0,
        MULTIPLE_FACES: 0,
        NO_FACE_DETECTED: 0,
    });

    const isMonitoring = Boolean(
        mediaPipeSandbox?.enabled &&
        mediaPipeSandbox?.emitDuringExam,
    );

    // 1. Load calibration profile on mount
    useEffect(() => {
        if (!examId) return;
        readStoredMobileCalibrationProfile(examId).then((profile) => {
            if (profile) {
                setCalibrationProfile((prev) => (prev === profile ? prev : profile));
            }
        });
    }, [examId]);

    // 2. Continuous frame analyzer loop
    useEffect(() => {
        if (!isMonitoring) {
            setWarningStatus((prev) => (prev === null ? null : null));
            setAnalysis((prev) => (prev === null ? null : null));
            return;
        }

        const sandbox = mediaPipeSandbox;
        const confidenceThreshold = sandbox?.confidenceThreshold ?? 0.6;
        const consecutiveThreshold = sandbox?.consecutiveFrameThreshold ?? 2;
        const cooldownMs = sandbox?.cooldownMs ?? 10000;

        const currentAnalysis = analyzeMediaPipeFrame({
            landmarksByFace,
            confidenceThreshold,
            tolerateDownwardGaze: true,
            calibrationProfile,
        });

        setAnalysis((prev) => {
            if (
                prev?.status === currentAnalysis.status &&
                prev?.signal === currentAnalysis.signal &&
                prev?.faceCount === currentAnalysis.faceCount &&
                prev?.confidenceScore === currentAnalysis.confidenceScore &&
                prev?.gazeDirection === currentAnalysis.gazeDirection &&
                prev?.eyeState === currentAnalysis.eyeState
            ) {
                return prev;
            }
            return currentAnalysis;
        });

        const now = Date.now();
        let activeSignal: 'GAZE_OFF_SCREEN' | 'MULTIPLE_FACES' | 'NO_FACE_DETECTED' | null = null;
        let activeWarning: UseMobileMediaPipeMonitoringResult['warningStatus'] = null;

        // Reset counts if frame is stable / ready
        if (currentAnalysis.status === 'ready') {
            consecutiveFrames.current.GAZE_OFF_SCREEN = 0;
            consecutiveFrames.current.MULTIPLE_FACES = 0;
            consecutiveFrames.current.NO_FACE_DETECTED = 0;
            setWarningStatus((prev) => (prev === null ? null : null));
            return;
        }

        if (currentAnalysis.status === 'no-face') {
            activeSignal = 'NO_FACE_DETECTED';
            activeWarning = 'Face not detected';
        } else if (currentAnalysis.status === 'multiple-faces') {
            activeSignal = 'MULTIPLE_FACES';
            activeWarning = 'Multiple faces detected';
        } else if (currentAnalysis.status === 'off-screen') {
            activeSignal = 'GAZE_OFF_SCREEN';
            activeWarning = 'Looking away from screen';
        }

        setWarningStatus((prev) => (prev === activeWarning ? prev : activeWarning));

        if (activeSignal) {
            // Reset other signals' consecutive frame counters
            Object.keys(consecutiveFrames.current).forEach((key) => {
                if (key !== activeSignal) {
                    consecutiveFrames.current[key] = 0;
                }
            });

            consecutiveFrames.current[activeSignal] += 1;

            if (consecutiveFrames.current[activeSignal] >= consecutiveThreshold) {
                const lastTrigger = lastTriggeredAt.current[activeSignal];
                const isOnCooldown = now - lastTrigger < cooldownMs;

                if (!isOnCooldown) {
                    lastTriggeredAt.current[activeSignal] = now;
                    consecutiveFrames.current[activeSignal] = 0; // reset counter after trigger

                    if (apiClient) {
                        void emitMobileTelemetryEvent({
                            apiClient,
                            configuration,
                            examSessionId,
                            studentId,
                            eventType: activeSignal,
                        }).catch((err) => {
                            console.error(
                                `Failed to emit mobile telemetry incident event ${activeSignal}`,
                                err,
                            );
                        });
                    }

                    if (onAnomalyDetectedRef.current) {
                        void onAnomalyDetectedRef.current(activeSignal);
                    }
                }
            }
        }
    }, [
        landmarksByFace,
        isMonitoring,
        calibrationProfile,
        configuration,
        mediaPipeSandbox,
        apiClient,
        examSessionId,
        studentId,
    ]);

    return {
        warningStatus,
        isMonitoring,
        analysis,
        calibrationProfile,
    };
}
