import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    useIncidentTelemetryDispatcher,
    type DispatchIncidentArgs,
} from './use-incident-telemetry-dispatcher';
import { EVIDENCE_DECISION_TIMEOUT_MS } from '../_constants';

const {
    mockApiClient,
    mockCaptureIncidentEvidenceFrame,
    mockEmitMediaPipeEvidenceCandidate,
    mockEmitMediaPipeTelemetryEvent,
    mockStartIncidentEvidenceUpload,
    mockWriteMonitoringEventTrace,
} = vi.hoisted(() => ({
    mockApiClient: vi.fn(),
    mockCaptureIncidentEvidenceFrame: vi.fn(),
    mockEmitMediaPipeEvidenceCandidate: vi.fn(),
    mockEmitMediaPipeTelemetryEvent: vi.fn(),
    mockStartIncidentEvidenceUpload: vi.fn(),
    mockWriteMonitoringEventTrace: vi.fn(),
}));

vi.mock('@sentinel/hooks', () => ({
    useApi: () => mockApiClient,
}));

vi.mock('./use-incident-evidence-upload', () => ({
    useIncidentEvidenceUpload: () => ({
        startIncidentEvidenceUpload: mockStartIncidentEvidenceUpload,
    }),
}));

vi.mock('../_utils/capture-incident-evidence-frame', () => ({
    captureIncidentEvidenceFrame: mockCaptureIncidentEvidenceFrame,
}));

vi.mock('@/app/(protected)/student/exam/[id]/_lib/web-telemetry-client', () => ({
    emitMediaPipeEvidenceCandidate: mockEmitMediaPipeEvidenceCandidate,
    emitMediaPipeTelemetryEvent: mockEmitMediaPipeTelemetryEvent,
    writeMonitoringEventTrace: mockWriteMonitoringEventTrace,
}));

describe('useIncidentTelemetryDispatcher', () => {
    const capturedBlob = new Blob(['captured-frame'], { type: 'image/webp' });
    const upload = {
        evidenceId: 'evidence-1',
        uploadUrl:
            'https://project.supabase.co/storage/v1/object/upload/sign/sentinel-proctoring-evidence/a/b/c.webp',
        uploadToken: 'upload-token',
        expiresAt: '2026-07-29T04:00:00.000Z',
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useRealTimers();
        vi.setSystemTime(new Date('2026-07-28T12:00:00.000Z'));
        mockApiClient.mockReturnValue(undefined);
        mockCaptureIncidentEvidenceFrame.mockResolvedValue({
            blob: capturedBlob,
            mimeType: 'image/webp',
            width: 1280,
            height: 720,
        });
        mockEmitMediaPipeTelemetryEvent.mockResolvedValue(true);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    function buildArgs(overrides: Partial<DispatchIncidentArgs> = {}): DispatchIncidentArgs {
        return {
            telemetrySignal: 'NO_FACE_DETECTED' as const,
            normalizedAnalysis: {
                status: 'offscreen',
                confidenceScore: 0.94,
            } as any,
            detectionTime: '2026-07-28T11:59:59.500Z',
            developmentDiagnostics: {
                confidenceThreshold: 0.8,
                durationThresholdMs: 1000,
                frameIntervalMs: 500,
                calibrationState: 'available',
                downwardGazePolicy: 'strict',
            },
            dispatch: {
                durationMs: 1500,
                aggregation: {
                    trigger: 'threshold',
                },
            } as any,
            videoElement: document.createElement('video'),
            eligibility: {
                isEnabled: true,
            } as any,
            sessionId: 'session-1',
            resolvedStudentId: 'student-1',
            resolvedConfiguration: {
                aiRules: {
                    face_detection: true,
                    multiple_faces_detection: true,
                    gaze_tracking: true,
                },
                cameraRequired: true,
            } as any,
            sandbox: {
                enabled: true,
                captureDuringCheckup: true,
                emitDuringExam: true,
                confidenceThreshold: 0.8,
                frameIntervalMs: 500,
                offScreenDurationMs: 1500,
                calibrationRequired: false,
                debugOverlayEnabled: false,
            } as any,
            setActiveIncident: vi.fn(),
            ...overrides,
        };
    }

    it('uploads the exact captured blob only when the server decision is UPLOAD', async () => {
        mockEmitMediaPipeEvidenceCandidate.mockResolvedValue({
            telemetryDisposition: 'aggregated',
            evidenceDecision: 'UPLOAD',
            upload,
        });

        const { result } = renderHook(() => useIncidentTelemetryDispatcher());

        await result.current.dispatchIncident(buildArgs());

        await waitFor(() => {
            expect(mockStartIncidentEvidenceUpload).toHaveBeenCalledTimes(1);
        });

        expect(mockStartIncidentEvidenceUpload).toHaveBeenCalledWith({
            apiClient: mockApiClient,
            upload,
            blob: capturedBlob,
            eventType: 'NO_FACE_DETECTED',
        });
        expect(mockEmitMediaPipeTelemetryEvent).not.toHaveBeenCalled();

        const tracePayloads = mockWriteMonitoringEventTrace.mock.calls.map(([trace]) => trace);
        expect(tracePayloads.some((trace) => JSON.stringify(trace).includes('upload-token'))).toBe(
            false,
        );
        expect(
            tracePayloads.some((trace) => JSON.stringify(trace).includes('/object/upload/')),
        ).toBe(false);
    });

    it('treats UNAVAILABLE as a terminal evidence decision without fallback telemetry', async () => {
        mockEmitMediaPipeEvidenceCandidate.mockResolvedValue({
            telemetryDisposition: 'aggregated',
            evidenceDecision: 'UNAVAILABLE',
        });

        const { result } = renderHook(() => useIncidentTelemetryDispatcher());

        await result.current.dispatchIncident(buildArgs());

        await waitFor(() => {
            expect(mockEmitMediaPipeEvidenceCandidate).toHaveBeenCalledTimes(1);
        });

        expect(mockStartIncidentEvidenceUpload).not.toHaveBeenCalled();
        expect(mockEmitMediaPipeTelemetryEvent).not.toHaveBeenCalled();
    });

    it('emits fallback telemetry once when the evidence decision times out and cleanup runs later', async () => {
        vi.useFakeTimers();
        mockEmitMediaPipeEvidenceCandidate.mockImplementation(
            (_apiClient, payload: { signal?: AbortSignal }) =>
                new Promise((_, reject) => {
                    payload.signal?.addEventListener(
                        'abort',
                        () => {
                            reject(
                                payload.signal?.reason ?? new DOMException('Aborted', 'AbortError'),
                            );
                        },
                        { once: true },
                    );
                }),
        );

        const { result } = renderHook(() => useIncidentTelemetryDispatcher());

        await result.current.dispatchIncident(buildArgs());
        await vi.advanceTimersByTimeAsync(EVIDENCE_DECISION_TIMEOUT_MS + 1);
        await Promise.resolve();

        expect(mockEmitMediaPipeTelemetryEvent).toHaveBeenCalledTimes(1);

        result.current.clearInFlightEvents();
        result.current.clearInFlightEvents();

        expect(mockEmitMediaPipeTelemetryEvent).toHaveBeenCalledTimes(1);
    });
});
