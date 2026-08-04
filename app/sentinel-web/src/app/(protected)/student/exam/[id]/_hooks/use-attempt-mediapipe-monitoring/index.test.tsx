import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    buildMediaPipeCalibrationProfile,
    createMediaPipeCalibrationSample,
} from '@sentinel/shared';
import type { ExamConfig, ExamRuntimeAccess } from '@sentinel/shared/types';
import { useAttemptMediaPipeMonitoring } from './index';
import { patchStoredStudentExamFlow } from '../../_lib/student-exam-flow';

const EXAM_ID = '123e4567-e89b-12d3-a456-426614174999';

const {
    mockApiClient,
    mockEmitMediaPipeEvidenceCandidate,
    mockEmitMediaPipeTelemetryEvent,
    mockWriteMonitoringEventTrace,
    mockStartIncidentEvidenceUpload,
    mockCaptureIncidentEvidenceFrame,
    mockTrackStop,
    mockFaceLandmarkerClose,
    mockDetectForVideo,
    mockCreateFromOptions,
    mockForVisionTasks,
} = vi.hoisted(() => ({
    mockApiClient: vi.fn(),
    mockEmitMediaPipeEvidenceCandidate: vi.fn().mockResolvedValue(false),
    mockEmitMediaPipeTelemetryEvent: vi.fn().mockResolvedValue(true),
    mockWriteMonitoringEventTrace: vi.fn(),
    mockStartIncidentEvidenceUpload: vi.fn().mockResolvedValue(undefined),
    mockCaptureIncidentEvidenceFrame: vi.fn().mockResolvedValue({
        blob: new Blob(['frame'], { type: 'image/webp' }),
        mimeType: 'image/webp',
        width: 1280,
        height: 720,
    }),
    mockTrackStop: vi.fn(),
    mockFaceLandmarkerClose: vi.fn(),
    mockDetectForVideo: vi.fn(),
    mockCreateFromOptions: vi.fn(),
    mockForVisionTasks: vi.fn(),
}));

vi.mock('@sentinel/hooks', () => ({
    useApi: () => mockApiClient,
    useAuth: () => ({
        user: {
            id: '123e4567-e89b-12d3-a456-426614174001',
        },
    }),
}));

vi.mock('../../_lib/web-telemetry-client', () => ({
    emitMediaPipeEvidenceCandidate: mockEmitMediaPipeEvidenceCandidate,
    emitMediaPipeTelemetryEvent: mockEmitMediaPipeTelemetryEvent,
    writeMonitoringEventTrace: mockWriteMonitoringEventTrace,
    isMediaPipeTelemetryEventEnabled: (
        configuration: ExamConfig | undefined,
        eventType: 'GAZE_OFF_SCREEN' | 'NO_FACE_DETECTED' | 'MULTIPLE_FACES',
    ) => {
        if (!configuration) {
            return false;
        }

        if (eventType === 'GAZE_OFF_SCREEN') {
            return configuration.aiRules.gaze_tracking;
        }

        if (eventType === 'NO_FACE_DETECTED') {
            return configuration.aiRules.face_detection;
        }

        return configuration.aiRules.multiple_faces_detection;
    },
}));

vi.mock('./_hooks/use-incident-evidence-upload', () => ({
    useIncidentEvidenceUpload: () => ({
        startIncidentEvidenceUpload: mockStartIncidentEvidenceUpload,
    }),
}));

vi.mock('./_utils/capture-incident-evidence-frame', () => ({
    captureIncidentEvidenceFrame: mockCaptureIncidentEvidenceFrame,
}));

vi.mock('@mediapipe/tasks-vision', () => ({
    FilesetResolver: {
        forVisionTasks: mockForVisionTasks,
    },
    FaceLandmarker: {
        createFromOptions: mockCreateFromOptions,
    },
}));

function createExamConfiguration(overrides: Partial<ExamConfig> = {}): ExamConfig {
    return {
        lobbyAdmissionMode: 'AUTOMATIC',
        maxReconnectAttempts: 3,
        strictMode: true,
        screenLock: true,
        cameraRequired: true,
        micRequired: true,
        autoSubmitTimeoutMinutes: 5,
        aiRules: {
            gaze_tracking: true,
            face_detection: true,
            audio_anomaly_detection: false,
            multiple_faces_detection: true,
        },
        webSecurity: {
            tab_switching_monitor: true,
            full_screen_required: true,
            clipboard_control: true,
            right_click_disable: true,
            print_screen_disable: true,
        },
        mobileSecurity: {
            app_pinning_required: true,
            prevent_backgrounding: true,
            notification_block: true,
            screenshot_block: true,
            root_jailbreak_detection: false,
        },
        ...overrides,
    };
}

function createRuntimeAccess(overrides: Partial<ExamRuntimeAccess> = {}): ExamRuntimeAccess {
    return {
        canStart: true,
        canResume: false,
        hasActiveAttempt: true,
        state: 'open',
        reasonCode: 'OPEN',
        message: 'Attempt active.',
        startsAt: null,
        endsAt: null,
        reopenedUntil: null,
        ...overrides,
    };
}

function createSandbox(
    overrides: Partial<{
        enabled: boolean;
        captureDuringCheckup: boolean;
        emitDuringExam: boolean;
        confidenceThreshold: number;
        frameIntervalMs: number;
        offScreenDurationMs: number;
        calibrationRequired: boolean;
        debugOverlayEnabled: boolean;
    }> = {},
) {
    return {
        enabled: true,
        captureDuringCheckup: true,
        emitDuringExam: true,
        confidenceThreshold: 0.6,
        frameIntervalMs: 500,
        offScreenDurationMs: 3000,
        calibrationRequired: false,
        debugOverlayEnabled: false,
        ...overrides,
    };
}

function buildCenteredFace() {
    const landmarks = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5, z: 0 }));

    landmarks[1] = { x: 0.5, y: 0.48, z: 0 };
    landmarks[33] = { x: 0.4, y: 0.46, z: 0 };
    landmarks[133] = { x: 0.46, y: 0.46, z: 0 };
    landmarks[263] = { x: 0.6, y: 0.46, z: 0 };
    landmarks[362] = { x: 0.54, y: 0.46, z: 0 };
    landmarks[160] = { x: 0.41, y: 0.452, z: 0 };
    landmarks[159] = { x: 0.43, y: 0.451, z: 0 };
    landmarks[158] = { x: 0.45, y: 0.452, z: 0 };
    landmarks[144] = { x: 0.41, y: 0.468, z: 0 };
    landmarks[145] = { x: 0.43, y: 0.469, z: 0 };
    landmarks[153] = { x: 0.45, y: 0.468, z: 0 };
    landmarks[387] = { x: 0.55, y: 0.452, z: 0 };
    landmarks[386] = { x: 0.57, y: 0.451, z: 0 };
    landmarks[385] = { x: 0.59, y: 0.452, z: 0 };
    landmarks[373] = { x: 0.55, y: 0.468, z: 0 };
    landmarks[374] = { x: 0.57, y: 0.469, z: 0 };
    landmarks[380] = { x: 0.59, y: 0.468, z: 0 };
    landmarks[168] = { x: 0.5, y: 0.35, z: 0 };
    landmarks[152] = { x: 0.5, y: 0.7, z: 0 };
    [468, 469, 470, 471, 472].forEach((index) => {
        landmarks[index] = { x: 0.43, y: 0.46, z: 0 };
    });
    [473, 474, 475, 476, 477].forEach((index) => {
        landmarks[index] = { x: 0.57, y: 0.46, z: 0 };
    });

    return landmarks;
}

function buildOffscreenFace() {
    const landmarks = buildCenteredFace();

    [468, 469, 470, 471, 472].forEach((index) => {
        landmarks[index] = { x: 0.41, y: 0.46, z: 0 };
    });
    [473, 474, 475, 476, 477].forEach((index) => {
        landmarks[index] = { x: 0.55, y: 0.46, z: 0 };
    });

    return landmarks;
}

function buildLowConfidenceFace() {
    return buildCenteredFace().map((landmark) => ({
        x: 0.5 + (landmark.x - 0.5) * 0.75,
        y: 0.5 + (landmark.y - 0.5) * 0.75,
        z: landmark.z,
    }));
}

function buildPartialFaceLookingAwayFace() {
    return buildOffscreenFace().map((landmark) => ({
        x: landmark.x - 0.36,
        y: landmark.y,
        z: landmark.z,
    }));
}

function createVideoElement() {
    const video = document.createElement('video');

    Object.defineProperty(video, 'srcObject', {
        value: null,
        writable: true,
        configurable: true,
    });
    Object.defineProperty(video, 'readyState', {
        value: HTMLMediaElement.HAVE_CURRENT_DATA,
        configurable: true,
    });

    return video;
}

let currentPerformanceNow = 0;
let currentWallClockNow = 0;
let rafQueue: FrameRequestCallback[] = [];

function advanceAnimationFrame(now: number) {
    currentPerformanceNow = now;
    currentWallClockNow = now;
    const callback = rafQueue.shift();

    if (!callback) {
        throw new Error(`No animation frame queued for ${now}.`);
    }

    act(() => {
        callback(now);
    });
}

describe('use-attempt-mediapipe-monitoring', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        currentPerformanceNow = 0;
        currentWallClockNow = 0;
        rafQueue = [];
        window.sessionStorage.clear();
        patchStoredStudentExamFlow(EXAM_ID, {
            checkupCompleted: true,
            mediaPipeActivatedAt: new Date().toISOString(),
            mediaPipeCalibrationCompletedAt: new Date().toISOString(),
            mediaPipeActivationSource: 'checkup',
        });

        mockForVisionTasks.mockResolvedValue({});
        mockDetectForVideo.mockReturnValue({
            faceLandmarks: [],
        });
        mockCreateFromOptions.mockResolvedValue({
            detectForVideo: mockDetectForVideo,
            close: mockFaceLandmarkerClose,
        });

        Object.defineProperty(window.navigator, 'mediaDevices', {
            value: {
                getUserMedia: vi.fn().mockResolvedValue({
                    getTracks: () => [
                        {
                            stop: mockTrackStop,
                        },
                    ],
                }),
            },
            configurable: true,
        });

        Object.defineProperty(HTMLMediaElement.prototype, 'play', {
            value: vi.fn().mockResolvedValue(undefined),
            configurable: true,
        });

        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        vi.spyOn(performance, 'now').mockImplementation(() => currentPerformanceNow);
        vi.spyOn(Date, 'now').mockImplementation(() => currentWallClockNow);
        vi.spyOn(window, 'requestAnimationFrame').mockImplementation(
            (callback: FrameRequestCallback) => {
                rafQueue.push(callback);
                return rafQueue.length;
            },
        );
        vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('starts when attempt MediaPipe is enabled and cleans up the camera runtime on unmount', async () => {
        const configuration = createExamConfiguration();
        const mediaPipeSandbox = createSandbox();
        const runtimeAccess = createRuntimeAccess();

        const { result, unmount } = renderHook(() =>
            useAttemptMediaPipeMonitoring({
                examId: EXAM_ID,
                configuration,
                mediaPipeSandbox,
                examSessionId: '123e4567-e89b-12d3-a456-426614174000',
                runtimeAccess,
            }),
        );

        act(() => {
            result.current.videoRef.current = createVideoElement();
        });

        await waitFor(() => {
            expect(result.current.phase).toBe('running');
        });

        expect(result.current.isEnabled).toBe(true);
        expect(mockCreateFromOptions).toHaveBeenCalledTimes(1);

        unmount();

        expect(mockFaceLandmarkerClose).toHaveBeenCalled();
        expect(mockTrackStop).toHaveBeenCalled();
    });

    it('does not get stuck in starting when the hidden video play promise never resolves', async () => {
        Object.defineProperty(HTMLMediaElement.prototype, 'play', {
            value: vi.fn().mockImplementation(() => new Promise<void>(() => undefined)),
            configurable: true,
        });

        const configuration = createExamConfiguration();
        const mediaPipeSandbox = createSandbox();
        const runtimeAccess = createRuntimeAccess();

        const { result } = renderHook(() =>
            useAttemptMediaPipeMonitoring({
                examId: EXAM_ID,
                configuration,
                mediaPipeSandbox,
                examSessionId: '123e4567-e89b-12d3-a456-426614174000',
                runtimeAccess,
            }),
        );

        act(() => {
            result.current.videoRef.current = createVideoElement();
        });

        await waitFor(() => {
            expect(result.current.phase).toBe('running');
        });
    });

    it('captures and uploads incident evidence even when the attempt id is unavailable', async () => {
        mockDetectForVideo.mockReturnValue({
            faceLandmarks: [buildOffscreenFace()],
        });
        mockEmitMediaPipeEvidenceCandidate.mockResolvedValue({
            telemetryDisposition: 'aggregated',
            evidenceDecision: 'UPLOAD',
            upload: {
                evidenceId: 'evidence-1',
                uploadUrl:
                    'https://project.supabase.co/storage/v1/object/upload/sign/sentinel-proctoring-evidence/a/b/c.webp',
                uploadToken: 'upload-token',
                expiresAt: '2026-07-29T04:00:00.000Z',
            },
        });

        const configuration = createExamConfiguration();
        const mediaPipeSandbox = createSandbox({
            offScreenDurationMs: 1000,
        });
        const runtimeAccess = createRuntimeAccess();

        const { result } = renderHook(() =>
            useAttemptMediaPipeMonitoring({
                examId: EXAM_ID,
                attemptId: 'attempt-123',
                configuration,
                mediaPipeSandbox,
                examSessionId: '123e4567-e89b-12d3-a456-426614174000',
                runtimeAccess,
            }),
        );

        act(() => {
            result.current.videoRef.current = createVideoElement();
        });

        await waitFor(() => {
            expect(result.current.phase).toBe('running');
        });

        [500, 1000, 1500, 2000].forEach((frameTime) => {
            advanceAnimationFrame(frameTime);
        });

        await waitFor(() => {
            expect(mockEmitMediaPipeEvidenceCandidate).toHaveBeenCalledTimes(1);
        });

        expect(mockCaptureIncidentEvidenceFrame).toHaveBeenCalledTimes(1);
        expect(mockStartIncidentEvidenceUpload).toHaveBeenCalledWith({
            apiClient: mockApiClient,
            upload: {
                evidenceId: 'evidence-1',
                uploadUrl:
                    'https://project.supabase.co/storage/v1/object/upload/sign/sentinel-proctoring-evidence/a/b/c.webp',
                uploadToken: 'upload-token',
                expiresAt: '2026-07-29T04:00:00.000Z',
            },
            blob: expect.any(Blob),
            eventType: 'GAZE_OFF_SCREEN',
        });
        expect(mockEmitMediaPipeTelemetryEvent).not.toHaveBeenCalled();
    });

    it('stays idle and avoids camera startup when attempt emission is disabled', async () => {
        const getUserMedia = vi.fn();
        const configuration = createExamConfiguration();
        const mediaPipeSandbox = createSandbox({
            emitDuringExam: false,
        });
        const runtimeAccess = createRuntimeAccess();

        Object.defineProperty(window.navigator, 'mediaDevices', {
            value: {
                getUserMedia,
            },
            configurable: true,
        });

        const { result } = renderHook(() =>
            useAttemptMediaPipeMonitoring({
                examId: EXAM_ID,
                configuration,
                mediaPipeSandbox,
                examSessionId: '123e4567-e89b-12d3-a456-426614174000',
                runtimeAccess,
            }),
        );

        await waitFor(() => {
            expect(result.current.phase).toBe('idle');
            expect(result.current.isEnabled).toBe(false);
        });

        expect(getUserMedia).not.toHaveBeenCalled();
        expect(mockEmitMediaPipeTelemetryEvent).not.toHaveBeenCalled();
    });

    it('does not start when runtime access is blocked', async () => {
        const getUserMedia = vi.fn();
        const configuration = createExamConfiguration();
        const mediaPipeSandbox = createSandbox();
        const runtimeAccess = createRuntimeAccess({
            canStart: false,
            canResume: false,
            hasActiveAttempt: false,
            state: 'locked',
            reasonCode: 'LOCKED',
            message: 'Exam access is locked.',
        });

        Object.defineProperty(window.navigator, 'mediaDevices', {
            value: {
                getUserMedia,
            },
            configurable: true,
        });

        const { result } = renderHook(() =>
            useAttemptMediaPipeMonitoring({
                examId: EXAM_ID,
                configuration,
                mediaPipeSandbox,
                examSessionId: '123e4567-e89b-12d3-a456-426614174000',
                runtimeAccess,
            }),
        );

        await waitFor(() => {
            expect(result.current.phase).toBe('idle');
            expect(result.current.isEnabled).toBe(false);
        });

        expect(getUserMedia).not.toHaveBeenCalled();
    });

    it('starts with a warning when a camera-required active attempt has no stored activation', async () => {
        window.sessionStorage.clear();
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        const configuration = createExamConfiguration();
        const mediaPipeSandbox = createSandbox();
        const runtimeAccess = createRuntimeAccess();

        const { result } = renderHook(() =>
            useAttemptMediaPipeMonitoring({
                examId: EXAM_ID,
                configuration,
                mediaPipeSandbox,
                examSessionId: '123e4567-e89b-12d3-a456-426614174000',
                runtimeAccess,
            }),
        );

        act(() => {
            result.current.videoRef.current = createVideoElement();
        });

        await waitFor(() => {
            expect(result.current.phase).toBe('running');
        });

        expect(result.current.isEnabled).toBe(true);
        expect(warnSpy).toHaveBeenCalledWith(
            'MediaPipe attempt monitoring started without a valid checkup activation.',
            expect.objectContaining({
                examId: EXAM_ID,
                status: 'missing',
            }),
        );
    });

    it('does not start while the attempt is redirecting to turn-in review', async () => {
        const getUserMedia = vi.fn();
        const configuration = createExamConfiguration();
        const mediaPipeSandbox = createSandbox();
        const runtimeAccess = createRuntimeAccess();

        Object.defineProperty(window.navigator, 'mediaDevices', {
            value: {
                getUserMedia,
            },
            configurable: true,
        });

        const { result } = renderHook(() =>
            useAttemptMediaPipeMonitoring({
                examId: EXAM_ID,
                configuration,
                mediaPipeSandbox,
                examSessionId: '123e4567-e89b-12d3-a456-426614174000',
                isRedirectingToTurnIn: true,
                runtimeAccess,
            }),
        );

        await waitFor(() => {
            expect(result.current.phase).toBe('idle');
            expect(result.current.isEnabled).toBe(false);
        });

        expect(getUserMedia).not.toHaveBeenCalled();
    });

    it('does not start when camera monitoring is not required for the exam', async () => {
        const getUserMedia = vi.fn();
        const configuration = createExamConfiguration({
            cameraRequired: false,
        });
        const mediaPipeSandbox = createSandbox();
        const runtimeAccess = createRuntimeAccess();

        Object.defineProperty(window.navigator, 'mediaDevices', {
            value: {
                getUserMedia,
            },
            configurable: true,
        });

        const { result } = renderHook(() =>
            useAttemptMediaPipeMonitoring({
                examId: EXAM_ID,
                configuration,
                mediaPipeSandbox,
                examSessionId: '123e4567-e89b-12d3-a456-426614174000',
                runtimeAccess,
            }),
        );

        await waitFor(() => {
            expect(result.current.phase).toBe('idle');
            expect(result.current.isEnabled).toBe(false);
        });

        expect(getUserMedia).not.toHaveBeenCalled();
    });

    it('emits duration-threshold gaze events and suppresses duplicate frames inside the threshold window', async () => {
        mockDetectForVideo.mockReturnValue({
            faceLandmarks: [buildOffscreenFace()],
        });
        const originalCreateElement = document.createElement.bind(document);
        vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
            if (tagName !== 'canvas') {
                return originalCreateElement(tagName);
            }

            return {
                width: 0,
                height: 0,
                getContext: () => ({
                    drawImage: vi.fn(),
                    clearRect: vi.fn(),
                }),
                toBlob: (callback: BlobCallback) =>
                    callback(new Blob(['frame'], { type: 'image/webp' })),
            } as unknown as HTMLCanvasElement;
        }) as typeof document.createElement);
        const configuration = createExamConfiguration();
        const mediaPipeSandbox = createSandbox({
            offScreenDurationMs: 1000,
        });
        const runtimeAccess = createRuntimeAccess();

        const { result } = renderHook(() =>
            useAttemptMediaPipeMonitoring({
                examId: EXAM_ID,
                configuration,
                mediaPipeSandbox,
                examSessionId: '123e4567-e89b-12d3-a456-426614174000',
                runtimeAccess,
            }),
        );

        act(() => {
            result.current.videoRef.current = createVideoElement();
        });

        await waitFor(() => {
            expect(result.current.phase).toBe('running');
        });

        [500, 1000, 1500, 2000].forEach((frameTime) => {
            advanceAnimationFrame(frameTime);
        });

        await waitFor(() => {
            expect(mockEmitMediaPipeEvidenceCandidate).toHaveBeenCalledTimes(1);
        });

        expect(result.current.activeIncident).toMatchObject({
            eventType: 'GAZE_OFF_SCREEN',
            analysis: expect.objectContaining({
                status: 'off-screen',
                signal: 'GAZE_OFF_SCREEN',
            }),
        });

        expect(mockEmitMediaPipeEvidenceCandidate).toHaveBeenNthCalledWith(
            1,
            mockApiClient,
            expect.objectContaining({
                examSessionId: '123e4567-e89b-12d3-a456-426614174000',
                studentId: '123e4567-e89b-12d3-a456-426614174001',
                eventType: 'GAZE_OFF_SCREEN',
                eventId: expect.any(String),
                dedupeKey: expect.stringContaining('GAZE_OFF_SCREEN'),
                clientActionAt: expect.any(String),
                metadata: expect.objectContaining({
                    durationMs: 1000,
                    aggregation: expect.objectContaining({
                        trigger: 'duration-threshold',
                        occurrenceCount: 3,
                        threshold: 1000,
                    }),
                }),
            }),
        );
        act(() => {
            result.current.dismissIncident();
        });

        expect(result.current.activeIncident).toBeNull();
    });

    it('uses the checkup calibration profile when classifying attempt gaze', async () => {
        const calibrationSample = createMediaPipeCalibrationSample({
            landmarks: buildOffscreenFace(),
            confidenceScore: 0.92,
        });
        const calibrationProfile = buildMediaPipeCalibrationProfile({
            samples: calibrationSample ? [calibrationSample] : [],
            createdAt: new Date().toISOString(),
        });

        patchStoredStudentExamFlow(EXAM_ID, {
            mediaPipeCalibrationProfile: calibrationProfile,
        });
        mockDetectForVideo.mockReturnValue({
            faceLandmarks: [buildOffscreenFace()],
        });

        const { result } = renderHook(() =>
            useAttemptMediaPipeMonitoring({
                examId: EXAM_ID,
                configuration: createExamConfiguration(),
                mediaPipeSandbox: createSandbox(),
                examSessionId: '123e4567-e89b-12d3-a456-426614174000',
                runtimeAccess: createRuntimeAccess(),
            }),
        );

        act(() => {
            result.current.videoRef.current = createVideoElement();
        });

        await waitFor(() => {
            expect(result.current.phase).toBe('running');
        });

        [500, 1000].forEach((frameTime) => {
            advanceAnimationFrame(frameTime);
        });

        await waitFor(() => {
            expect(result.current.analysis).toMatchObject({
                status: 'ready',
                signal: null,
                gazeDirection: 'center',
            });
        });
        expect(mockEmitMediaPipeTelemetryEvent).not.toHaveBeenCalled();
    });

    it('treats sustained low-confidence tracking as a no-face attempt incident', async () => {
        mockDetectForVideo.mockReturnValue({
            faceLandmarks: [buildLowConfidenceFace()],
        });
        const configuration = createExamConfiguration();
        const mediaPipeSandbox = createSandbox({ offScreenDurationMs: 1500 });
        const runtimeAccess = createRuntimeAccess();

        const { result } = renderHook(() =>
            useAttemptMediaPipeMonitoring({
                examId: EXAM_ID,
                attemptId: 'attempt-123',
                configuration,
                mediaPipeSandbox,
                examSessionId: '123e4567-e89b-12d3-a456-426614174000',
                runtimeAccess,
            }),
        );

        act(() => {
            result.current.videoRef.current = createVideoElement();
        });

        await waitFor(() => {
            expect(result.current.phase).toBe('running');
        });

        [500, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 5500, 6000].forEach(
            (frameTime) => {
                advanceAnimationFrame(frameTime);
            },
        );

        await waitFor(() => {
            expect(mockEmitMediaPipeEvidenceCandidate).toHaveBeenCalledTimes(1);
        });

        expect(result.current.analysis).toMatchObject({
            status: 'no-face',
            signal: 'NO_FACE_DETECTED',
        });
        expect(result.current.activeIncident).toMatchObject({
            eventType: 'NO_FACE_DETECTED',
            analysis: expect.objectContaining({
                status: 'no-face',
                signal: 'NO_FACE_DETECTED',
            }),
        });
        expect(mockEmitMediaPipeEvidenceCandidate).toHaveBeenNthCalledWith(
            1,
            mockApiClient,
            expect.objectContaining({
                eventType: 'NO_FACE_DETECTED',
                metadata: expect.objectContaining({
                    aggregation: expect.objectContaining({
                        trigger: 'duration-threshold',
                    }),
                }),
            }),
        );
    });

    it('treats a partial low-confidence face near the viewport edge as looking away', async () => {
        mockDetectForVideo.mockReturnValue({
            faceLandmarks: [buildPartialFaceLookingAwayFace()],
        });
        const configuration = createExamConfiguration();
        const mediaPipeSandbox = createSandbox({ offScreenDurationMs: 1500 });
        const runtimeAccess = createRuntimeAccess();

        const { result } = renderHook(() =>
            useAttemptMediaPipeMonitoring({
                examId: EXAM_ID,
                attemptId: 'attempt-123',
                configuration,
                mediaPipeSandbox,
                examSessionId: '123e4567-e89b-12d3-a456-426614174000',
                runtimeAccess,
            }),
        );

        act(() => {
            result.current.videoRef.current = createVideoElement();
        });

        await waitFor(() => {
            expect(result.current.phase).toBe('running');
        });

        [500, 1000, 1500, 2000].forEach((frameTime) => {
            advanceAnimationFrame(frameTime);
        });

        await waitFor(() => {
            expect(mockEmitMediaPipeEvidenceCandidate).toHaveBeenCalledTimes(1);
        });

        expect(result.current.analysis).toMatchObject({
            status: 'off-screen',
            signal: 'GAZE_OFF_SCREEN',
            gazeDirection: 'left',
        });
        expect(result.current.activeIncident).toMatchObject({
            eventType: 'GAZE_OFF_SCREEN',
            analysis: expect.objectContaining({
                status: 'off-screen',
                signal: 'GAZE_OFF_SCREEN',
            }),
        });
    });

    it('does not emit a looking-away incident when gaze tracking is disabled for the exam', async () => {
        mockDetectForVideo.mockReturnValue({
            faceLandmarks: [buildOffscreenFace()],
        });
        const configuration = createExamConfiguration({
            aiRules: {
                gaze_tracking: false,
                face_detection: true,
                audio_anomaly_detection: false,
                multiple_faces_detection: true,
            },
        });
        const mediaPipeSandbox = createSandbox();
        const runtimeAccess = createRuntimeAccess();

        const { result } = renderHook(() =>
            useAttemptMediaPipeMonitoring({
                examId: EXAM_ID,
                configuration,
                mediaPipeSandbox,
                examSessionId: '123e4567-e89b-12d3-a456-426614174000',
                runtimeAccess,
            }),
        );

        act(() => {
            result.current.videoRef.current = createVideoElement();
        });

        await waitFor(() => {
            expect(result.current.phase).toBe('running');
        });

        [500, 1000, 1500, 2000].forEach((frameTime) => {
            advanceAnimationFrame(frameTime);
        });

        expect(result.current.analysis).toMatchObject({
            status: 'off-screen',
            signal: 'GAZE_OFF_SCREEN',
        });
        expect(result.current.activeIncident).toBeNull();
        expect(mockEmitMediaPipeTelemetryEvent).not.toHaveBeenCalled();
    });

    it('preserves signal tracking across rerenders with an equivalent sandbox object', async () => {
        mockDetectForVideo.mockReturnValue({
            faceLandmarks: [buildLowConfidenceFace()],
        });
        const configuration = createExamConfiguration();
        const runtimeAccess = createRuntimeAccess();

        const { result, rerender } = renderHook(
            ({ mediaPipeSandbox }: { mediaPipeSandbox: ReturnType<typeof createSandbox> }) =>
                useAttemptMediaPipeMonitoring({
                    examId: EXAM_ID,
                    attemptId: 'attempt-123',
                    configuration,
                    mediaPipeSandbox,
                    examSessionId: '123e4567-e89b-12d3-a456-426614174000',
                    runtimeAccess,
                }),
            {
                initialProps: {
                    mediaPipeSandbox: createSandbox({ offScreenDurationMs: 1500 }),
                },
            },
        );

        act(() => {
            result.current.videoRef.current = createVideoElement();
        });

        await waitFor(() => {
            expect(result.current.phase).toBe('running');
        });

        advanceAnimationFrame(500);

        rerender({
            mediaPipeSandbox: createSandbox({ offScreenDurationMs: 1500 }),
        });

        [1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 5500, 6000].forEach((frameTime) => {
            advanceAnimationFrame(frameTime);
        });

        await waitFor(() => {
            expect(mockEmitMediaPipeEvidenceCandidate).toHaveBeenCalledTimes(1);
        });

        expect(result.current.activeIncident).toMatchObject({
            eventType: 'NO_FACE_DETECTED',
        });
    });

    it('keeps a sustained off-screen interval through a one-frame low-confidence interruption', async () => {
        const offscreenFace = buildOffscreenFace();
        const lowConfidenceFace = buildLowConfidenceFace();

        mockDetectForVideo
            .mockReturnValueOnce({
                faceLandmarks: [offscreenFace],
            })
            .mockReturnValueOnce({
                faceLandmarks: [lowConfidenceFace],
            })
            .mockReturnValue({
                faceLandmarks: [offscreenFace],
            });

        const configuration = createExamConfiguration({
            aiRules: {
                gaze_tracking: true,
                face_detection: false,
                audio_anomaly_detection: false,
                multiple_faces_detection: true,
            },
        });
        const mediaPipeSandbox = createSandbox({
            offScreenDurationMs: 1000,
        });
        const runtimeAccess = createRuntimeAccess();

        const { result } = renderHook(() =>
            useAttemptMediaPipeMonitoring({
                examId: EXAM_ID,
                attemptId: 'attempt-123',
                configuration,
                mediaPipeSandbox,
                examSessionId: '123e4567-e89b-12d3-a456-426614174000',
                runtimeAccess,
            }),
        );

        act(() => {
            result.current.videoRef.current = createVideoElement();
        });

        await waitFor(() => {
            expect(result.current.phase).toBe('running');
        });

        advanceAnimationFrame(500);
        expect(mockEmitMediaPipeEvidenceCandidate).not.toHaveBeenCalled();

        advanceAnimationFrame(1000);
        expect(result.current.analysis).toMatchObject({
            status: 'low-confidence',
            signal: null,
        });
        expect(mockEmitMediaPipeEvidenceCandidate).not.toHaveBeenCalled();

        advanceAnimationFrame(1500);

        await waitFor(() => {
            expect(mockEmitMediaPipeEvidenceCandidate).toHaveBeenCalledTimes(1);
        });

        expect(result.current.activeIncident).toMatchObject({
            eventType: 'GAZE_OFF_SCREEN',
            detectedAt: new Date(1500).toISOString(),
        });
        expect(mockEmitMediaPipeEvidenceCandidate).toHaveBeenNthCalledWith(
            1,
            mockApiClient,
            expect.objectContaining({
                eventType: 'GAZE_OFF_SCREEN',
                metadata: expect.objectContaining({
                    durationMs: 1000,
                }),
            }),
        );
    });

    it('uses configured duration thresholds without clamping them to ATTEMPT_MAX_SIGNAL_DURATION_MS', async () => {
        mockDetectForVideo.mockReturnValue({
            faceLandmarks: [buildOffscreenFace()],
        });
        const configuration = createExamConfiguration();
        const mediaPipeSandbox = createSandbox({ offScreenDurationMs: 4000 });
        const runtimeAccess = createRuntimeAccess();

        const { result } = renderHook(() =>
            useAttemptMediaPipeMonitoring({
                examId: EXAM_ID,
                attemptId: 'attempt-123',
                configuration,
                mediaPipeSandbox,
                examSessionId: '123e4567-e89b-12d3-a456-426614174000',
                runtimeAccess,
            }),
        );

        act(() => {
            result.current.videoRef.current = createVideoElement();
        });

        await waitFor(() => {
            expect(result.current.phase).toBe('running');
        });

        [500, 1000, 1500, 2000, 2500, 3000, 3500].forEach((frameTime) => {
            advanceAnimationFrame(frameTime);
        });

        expect(mockEmitMediaPipeEvidenceCandidate).not.toHaveBeenCalled();

        [4000, 4500].forEach((frameTime) => {
            advanceAnimationFrame(frameTime);
        });

        await waitFor(() => {
            expect(mockEmitMediaPipeEvidenceCandidate).toHaveBeenCalledTimes(1);
        });

        expect(mockEmitMediaPipeEvidenceCandidate).toHaveBeenNthCalledWith(
            1,
            mockApiClient,
            expect.objectContaining({
                eventType: 'GAZE_OFF_SCREEN',
                metadata: expect.objectContaining({
                    durationMs: 4000,
                }),
            }),
        );
    });

    it('cleans up the camera stream when MediaPipe startup fails after the stream is acquired', async () => {
        mockCreateFromOptions.mockRejectedValueOnce(new Error('Failed to initialize'));
        const configuration = createExamConfiguration();
        const mediaPipeSandbox = createSandbox();
        const runtimeAccess = createRuntimeAccess();

        const { result } = renderHook(() =>
            useAttemptMediaPipeMonitoring({
                examId: EXAM_ID,
                configuration,
                mediaPipeSandbox,
                examSessionId: '123e4567-e89b-12d3-a456-426614174000',
                runtimeAccess,
            }),
        );

        act(() => {
            result.current.videoRef.current = createVideoElement();
        });

        await waitFor(() => {
            expect(result.current.phase).toBe('error');
        });

        expect(mockTrackStop).toHaveBeenCalled();
    });
});
