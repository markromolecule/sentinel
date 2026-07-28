import { useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { useApi } from '@sentinel/hooks';
import type { MediaPipeFrameAnalysis, evaluateMediaPipeSignalDispatch } from '@sentinel/shared';
import type { ExamConfig } from '@sentinel/shared/types';
import {
    emitMediaPipeEvidenceCandidate,
    emitMediaPipeTelemetryEvent,
    writeMonitoringEventTrace,
} from '@/app/(protected)/student/exam/[id]/_lib/web-telemetry-client';
import {
    EVIDENCE_DECISION_TIMEOUT_MS,
    MAX_PENDING_EVIDENCE_DECISIONS,
} from '../_constants';
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
    inFlightEvidenceDecisionsRef: React.MutableRefObject<Map<string, AbortController>>;
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
    const inFlightEvidenceDecisionsRef = useRef<Map<string, AbortController>>(new Map());

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
        const developmentContext = {
            ...developmentDiagnostics,
            analysisStatus: normalizedAnalysis.status,
            confidenceScore: normalizedAnalysis.confidenceScore ?? undefined,
            durationMs: dispatch.durationMs ?? undefined,
        };

        writeMonitoringEventTrace({
            detectorSource: 'mediapipe',
            eventType: telemetrySignal,
            eventSubtype: normalizedAnalysis.status,
            detectionTime,
            emissionTime,
            disposition: 'emitting',
            developmentContext,
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

        const emitFallbackTelemetry = (reason: string) => {
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
                        reason,
                        developmentContext,
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
                        developmentContext,
                    });
                    console.error('Failed to emit MediaPipe telemetry event.', {
                        error,
                    });
                });
        };

        const canAttemptEvidenceCapture =
            eligibility.isEnabled && Boolean(attemptId) && videoElement !== null;

        if (!canAttemptEvidenceCapture || !attemptId || !videoElement) {
            emitFallbackTelemetry('telemetry-only');
            return;
        }

        if (inFlightEvidenceDecisionsRef.current.size >= MAX_PENDING_EVIDENCE_DECISIONS) {
            emitFallbackTelemetry('evidence-pending-limit');
            return;
        }

        const decisionController = new AbortController();
        const timeoutId = window.setTimeout(() => {
            decisionController.abort(new DOMException('Evidence decision timed out.', 'AbortError'));
        }, EVIDENCE_DECISION_TIMEOUT_MS);
        inFlightEvidenceDecisionsRef.current.set(eventId, decisionController);

        void (async () => {
            let candidateTelemetryPersisted = false;

            try {
                const capturedFrame = await captureIncidentEvidenceFrame(videoElement);
                const decision = await emitMediaPipeEvidenceCandidate(apiClient, {
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
                    capture: {
                        capturedAt: clientActionAt,
                        mimeType: capturedFrame.mimeType,
                        sizeBytes: capturedFrame.blob.size,
                    },
                    signal: decisionController.signal,
                });

                if (decision === false) {
                    emitFallbackTelemetry('candidate-suppressed');
                    return;
                }

                candidateTelemetryPersisted = true;

                if (decision.evidenceDecision === 'UPLOAD' && decision.upload) {
                    if (decisionController.signal.aborted) {
                        return;
                    }

                    await startIncidentEvidenceUpload({
                        apiClient,
                        upload: decision.upload,
                        blob: capturedFrame.blob,
                    });

                    writeMonitoringEventTrace({
                        detectorSource: 'mediapipe',
                        eventType: telemetrySignal,
                        eventSubtype: normalizedAnalysis.status,
                        detectionTime,
                        emissionTime,
                        disposition: 'accepted',
                        reason: `evidence:${decision.telemetryDisposition}:upload`,
                        developmentContext,
                    });
                    return;
                }

                if (decision.evidenceDecision === 'UPLOAD') {
                    writeMonitoringEventTrace({
                        detectorSource: 'mediapipe',
                        eventType: telemetrySignal,
                        eventSubtype: normalizedAnalysis.status,
                        detectionTime,
                        emissionTime,
                        disposition: 'failed',
                        reason: 'candidate-missing-upload-target',
                        developmentContext,
                    });
                    return;
                }

                writeMonitoringEventTrace({
                    detectorSource: 'mediapipe',
                    eventType: telemetrySignal,
                    eventSubtype: normalizedAnalysis.status,
                    detectionTime,
                    emissionTime,
                    disposition: 'accepted',
                    reason: `evidence:${decision.telemetryDisposition}:${decision.evidenceDecision.toLowerCase()}`,
                    developmentContext,
                });
            } catch (error) {
                if (decisionController.signal.aborted) {
                    if (
                        decisionController.signal.reason instanceof DOMException &&
                        decisionController.signal.reason.message === 'Evidence decision timed out.'
                    ) {
                        emitFallbackTelemetry('candidate-timeout');
                        return;
                    }

                    writeMonitoringEventTrace({
                        detectorSource: 'mediapipe',
                        eventType: telemetrySignal,
                        eventSubtype: normalizedAnalysis.status,
                        detectionTime,
                        emissionTime,
                        disposition: 'suppressed',
                        reason: 'candidate-aborted',
                        developmentContext,
                    });
                    return;
                }

                const reasonPrefix =
                    error instanceof Error && error.message.includes('capture')
                        ? 'evidence-capture'
                        : 'candidate-failure';

                if (candidateTelemetryPersisted) {
                    writeMonitoringEventTrace({
                        detectorSource: 'mediapipe',
                        eventType: telemetrySignal,
                        eventSubtype: normalizedAnalysis.status,
                        detectionTime,
                        emissionTime,
                        disposition: 'failed',
                        reason: error instanceof Error
                            ? `${reasonPrefix}:${error.message}`
                            : `${reasonPrefix}:unknown-error`,
                        developmentContext,
                    });
                    return;
                }

                emitFallbackTelemetry(
                    error instanceof Error
                        ? `${reasonPrefix}:${error.message}`
                        : `${reasonPrefix}:unknown-error`,
                );
            } finally {
                window.clearTimeout(timeoutId);
                inFlightEvidenceDecisionsRef.current.delete(eventId);
            }
        })();
    }, [apiClient, startIncidentEvidenceUpload]);

    const clearInFlightEvents = useCallback(() => {
        for (const controller of inFlightEvidenceDecisionsRef.current.values()) {
            controller.abort(new DOMException('Evidence decision aborted during cleanup.', 'AbortError'));
        }
        inFlightEvidenceDecisionsRef.current.clear();
    }, []);

    return {
        inFlightEvidenceDecisionsRef,
        dispatchIncident,
        clearInFlightEvents,
    };
}
