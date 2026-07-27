import { useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { useApi } from '@sentinel/hooks';
import type { MediaPipeFrameAnalysis, evaluateMediaPipeSignalDispatch } from '@sentinel/shared';
import type { ExamConfig } from '@sentinel/shared/types';
import {
    emitMediaPipeTelemetryEvent,
    writeMonitoringEventTrace,
} from '@/app/(protected)/student/exam/[id]/_lib/web-telemetry-client';
import type { MediaPipeAttemptIncident, ResolvedMediaPipeSandbox } from '../_types';
import { captureIncidentEvidenceFrame } from '../_utils/capture-incident-evidence-frame';
import { useIncidentEvidenceUpload } from './use-incident-evidence-upload';
import type { MediapipeRuntimeEligibility } from './use-mediapipe-runtime-eligibility';
import type { AttemptMediaPipeDevelopmentDiagnostics } from './use-mediapipe-runtime-thresholds';

export type DispatchIncidentArgs = {
    telemetrySignal: 'GAZE_OFF_SCREEN' | 'NO_FACE_DETECTED' | 'MULTIPLE_FACES';
    normalizedAnalysis: MediaPipeFrameAnalysis;
    detectionTime: string;
    developmentDiagnostics: AttemptMediaPipeDevelopmentDiagnostics;
    dispatch: ReturnType<typeof evaluateMediaPipeSignalDispatch>;
    videoElement: HTMLVideoElement | null;
    eligibility: MediapipeRuntimeEligibility;
    attemptId?: string;
    sessionId: string;
    resolvedStudentId: string;
    resolvedConfiguration: ExamConfig;
    sandbox: ResolvedMediaPipeSandbox;
    setActiveIncident: (incident: MediaPipeAttemptIncident | null) => void;
};

export type UseIncidentTelemetryDispatcherResult = {
    inFlightEvidenceEventIdsRef: React.MutableRefObject<Set<string>>;
    dispatchIncident: (args: DispatchIncidentArgs) => Promise<void>;
    clearInFlightEvents: () => void;
};

/**
 * Custom hook to dispatch incident details to backend telemetry and capture evidence.
 * Handles the async operations of Toast alerts, active incident state updates,
 * capturing webcam frames, uploading evidence to storage, and sending the API telemetry event.
 */
export function useIncidentTelemetryDispatcher(): UseIncidentTelemetryDispatcherResult {
    const apiClient = useApi();
    const { startIncidentEvidenceUpload } = useIncidentEvidenceUpload();
    const inFlightEvidenceEventIdsRef = useRef<Set<string>>(new Set());

    const dispatchIncident = useCallback(async ({
        telemetrySignal,
        normalizedAnalysis,
        detectionTime,
        developmentDiagnostics,
        dispatch,
        videoElement,
        eligibility,
        attemptId,
        sessionId,
        resolvedStudentId,
        resolvedConfiguration,
        sandbox,
        setActiveIncident,
    }: DispatchIncidentArgs): Promise<void> => {
        const emissionTime = new Date().toISOString();
        const clientActionAt = emissionTime;
        const eventId = crypto.randomUUID();
        const dedupeKey = `${sessionId}:${telemetrySignal}:${eventId}`;

        writeMonitoringEventTrace({
            detectorSource: 'mediapipe',
            eventType: telemetrySignal,
            eventSubtype: normalizedAnalysis.status,
            detectionTime,
            emissionTime,
            disposition: 'emitting',
            developmentContext: {
                ...developmentDiagnostics,
                analysisStatus: normalizedAnalysis.status,
                confidenceScore: normalizedAnalysis.confidenceScore ?? undefined,
                durationMs: dispatch.durationMs ?? undefined,
            },
        });

        // Show a contextual toast for each incident type.
        if (telemetrySignal === 'GAZE_OFF_SCREEN') {
            toast.warning('Please keep your eyes on the exam screen.', {
                description: 'Ensure your face is centered and you are looking at the content.',
            });
        } else if (telemetrySignal === 'NO_FACE_DETECTED') {
            toast.warning('Face not detected.', {
                description: 'Please make sure you are visible to the camera.',
            });
        } else if (telemetrySignal === 'MULTIPLE_FACES') {
            toast.warning('Multiple faces detected.', {
                description: 'Please ensure you are alone during the exam.',
            });
        }

        setActiveIncident({
            eventType: telemetrySignal,
            detectedAt: detectionTime,
            analysis: normalizedAnalysis,
        });

        const canAttemptEvidenceCapture =
            eligibility.isEnabled &&
            Boolean(attemptId) &&
            videoElement !== null &&
            !inFlightEvidenceEventIdsRef.current.has(eventId);

        if (canAttemptEvidenceCapture && attemptId && videoElement) {
            const resolvedAttemptId = attemptId;

            void (async () => {
                try {
                    const capturedFrame = await captureIncidentEvidenceFrame(videoElement);

                    inFlightEvidenceEventIdsRef.current.add(eventId);

                    await startIncidentEvidenceUpload({
                        apiClient,
                        attemptId: resolvedAttemptId,
                        eventId,
                        eventType: telemetrySignal,
                        capturedAt: clientActionAt,
                        blob: capturedFrame.blob,
                    });
                } catch (error) {
                    writeMonitoringEventTrace({
                        detectorSource: 'mediapipe',
                        eventType: telemetrySignal,
                        eventSubtype: normalizedAnalysis.status,
                        detectionTime,
                        emissionTime,
                        disposition: inFlightEvidenceEventIdsRef.current.has(eventId)
                            ? 'failed'
                            : 'suppressed',
                        reason: error instanceof Error
                            ? inFlightEvidenceEventIdsRef.current.has(eventId)
                                ? `evidence-upload:${error.message}`
                                : `evidence-capture:${error.message}`
                            : inFlightEvidenceEventIdsRef.current.has(eventId)
                                ? 'evidence-upload:unknown-error'
                                : 'evidence-capture:unknown-error',
                        developmentContext: developmentDiagnostics,
                    });
                } finally {
                    inFlightEvidenceEventIdsRef.current.delete(eventId);
                }
            })();
        }

        void emitMediaPipeTelemetryEvent(apiClient, {
            configuration: resolvedConfiguration,
            mediaPipeSandbox: sandbox,
            examSessionId: sessionId,
            studentId: resolvedStudentId,
            eventType: telemetrySignal,
            eventId,
            dedupeKey,
            clientActionAt,
            metadata: {
                durationMs: dispatch.durationMs,
                confidenceScore: normalizedAnalysis.confidenceScore ?? undefined,
                aggregation: dispatch.aggregation,
            },
        })
            .then((emitted) => {
                writeMonitoringEventTrace({
                    detectorSource: 'mediapipe',
                    eventType: telemetrySignal,
                    eventSubtype: normalizedAnalysis.status,
                    detectionTime,
                    emissionTime,
                    disposition: emitted ? 'accepted' : 'suppressed',
                    reason: emitted ? undefined : 'rule-disabled',
                    developmentContext: {
                        ...developmentDiagnostics,
                        analysisStatus: normalizedAnalysis.status,
                        confidenceScore: normalizedAnalysis.confidenceScore ?? undefined,
                        durationMs: dispatch.durationMs ?? undefined,
                    },
                });
            })
            .catch((error) => {
                writeMonitoringEventTrace({
                    detectorSource: 'mediapipe',
                    eventType: telemetrySignal,
                    eventSubtype: normalizedAnalysis.status,
                    detectionTime,
                    emissionTime,
                    disposition: 'failed',
                    reason: error instanceof Error ? error.message : 'unknown-error',
                    developmentContext: developmentDiagnostics,
                });
                console.error('Failed to emit MediaPipe telemetry event.', {
                    error,
                });
            });
    }, [apiClient, startIncidentEvidenceUpload]);

    const clearInFlightEvents = useCallback(() => {
        inFlightEvidenceEventIdsRef.current.clear();
    }, []);

    return {
        inFlightEvidenceEventIdsRef,
        dispatchIncident,
        clearInFlightEvents,
    };
}
