import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ExamConfiguration } from '@sentinel/shared/types';
import { useCheckupMediaPipe } from './use-checkup-mediapipe';

const { mockFaceLandmarkerClose, mockDetectForVideo, mockCreateFromOptions, mockForVisionTasks } =
    vi.hoisted(() => ({
        mockFaceLandmarkerClose: vi.fn(),
        mockDetectForVideo: vi.fn(),
        mockCreateFromOptions: vi.fn(),
        mockForVisionTasks: vi.fn(),
    }));

vi.mock('@mediapipe/tasks-vision', () => ({
    FilesetResolver: {
        forVisionTasks: mockForVisionTasks,
    },
    FaceLandmarker: {
        createFromOptions: mockCreateFromOptions,
    },
}));

function createExamConfiguration(): ExamConfiguration {
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
    };
}

function createSandbox(overrides: Partial<ReturnType<typeof baseSandbox>> = {}) {
    return {
        ...baseSandbox(),
        ...overrides,
    };
}

function baseSandbox() {
    return {
        enabled: true,
        captureDuringCheckup: true,
        emitDuringExam: false,
        confidenceThreshold: 0.6,
        frameIntervalMs: 500,
        offScreenDurationMs: 3000,
        calibrationRequired: true,
        debugOverlayEnabled: false,
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

function buildDownwardGazeFace() {
    const landmarks = buildCenteredFace();

    [468, 469, 470, 471, 472].forEach((index) => {
        landmarks[index] = { x: landmarks[index].x, y: 0.463, z: 0 };
    });
    [473, 474, 475, 476, 477].forEach((index) => {
        landmarks[index] = { x: landmarks[index].x, y: 0.463, z: 0 };
    });

    return landmarks;
}

function buildMultiFaceFrame() {
    return [buildCenteredFace(), buildCenteredFace()];
}

function createVideoElement() {
    const video = document.createElement('video');

    Object.defineProperty(video, 'readyState', {
        value: HTMLMediaElement.HAVE_CURRENT_DATA,
        configurable: true,
    });
    Object.defineProperty(video, 'videoWidth', {
        value: 1280,
        configurable: true,
    });
    Object.defineProperty(video, 'videoHeight', {
        value: 720,
        configurable: true,
    });

    return video;
}

let currentNow = 0;
let rafQueue: FrameRequestCallback[] = [];

function advanceAnimationFrame(now: number) {
    currentNow = now;
    const callback = rafQueue.shift();

    if (!callback) {
        throw new Error(`No animation frame queued for ${now}.`);
    }

    act(() => {
        callback(now);
    });
}

describe('use-checkup-mediapipe', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        currentNow = 0;
        rafQueue = [];

        mockForVisionTasks.mockResolvedValue({});
        mockDetectForVideo.mockReturnValue({
            faceLandmarks: [buildCenteredFace()],
        });
        mockCreateFromOptions.mockResolvedValue({
            detectForVideo: mockDetectForVideo,
            close: mockFaceLandmarkerClose,
        });

        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        vi.spyOn(performance, 'now').mockImplementation(() => currentNow);
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

    it('starts with an active stream and marks calibration complete after stable ready frames', async () => {
        const video = createVideoElement();
        const videoRef = { current: video };
        const configuration = createExamConfiguration();
        const mediaPipeSandbox = createSandbox();

        const { result } = renderHook(() =>
            useCheckupMediaPipe({
                videoRef,
                streamActive: true,
                configuration,
                mediaPipeSandbox,
            }),
        );

        await waitFor(() => {
            expect(mockCreateFromOptions).toHaveBeenCalledTimes(1);
            expect(result.current.isEnabled).toBe(true);
        });

        // Advance past the required stable-frame window.
        for (let i = 1; i <= 6; i++) {
            advanceAnimationFrame(i * 600);
        }

        await waitFor(() => {
            expect(result.current.analysis?.status).toBe('ready');
            expect(result.current.calibrationProgress).toBe(100);
            expect(result.current.calibrationReadyFrames).toBe(6);
            expect(result.current.calibrationHoldSecondsRemaining).toBe(0);
            expect(result.current.requiredCalibrationReadyFrames).toBe(6);
            expect(result.current.isCalibrated).toBe(true);
            expect(result.current.calibrationProfile).toMatchObject({
                version: 1,
                sampleCount: 6,
            });
        });
    });

    it('does not start without an active stream', async () => {
        const video = createVideoElement();
        const videoRef = { current: video };
        const configuration = createExamConfiguration();
        const mediaPipeSandbox = createSandbox();

        const { result } = renderHook(() =>
            useCheckupMediaPipe({
                videoRef,
                streamActive: false,
                configuration,
                mediaPipeSandbox,
            }),
        );

        await waitFor(() => {
            expect(result.current.isEnabled).toBe(false);
        });

        expect(mockCreateFromOptions).not.toHaveBeenCalled();
        expect(result.current.analysis).toBeNull();
        expect(result.current.calibrationProgress).toBe(0);
        expect(result.current.calibrationReadyFrames).toBe(0);
        expect(result.current.calibrationHoldSecondsRemaining).toBe(0);
    });

    it('treats a slight downward screen gaze as calibration-ready during checkup', async () => {
        mockDetectForVideo.mockReturnValue({
            faceLandmarks: [buildDownwardGazeFace()],
        });
        const video = createVideoElement();
        const videoRef = { current: video };
        const configuration = createExamConfiguration();
        const mediaPipeSandbox = createSandbox();

        const { result } = renderHook(() =>
            useCheckupMediaPipe({
                videoRef,
                streamActive: true,
                configuration,
                mediaPipeSandbox,
            }),
        );

        await waitFor(() => {
            expect(mockCreateFromOptions).toHaveBeenCalledTimes(1);
        });

        // Advance past the required stable-frame window.
        for (let i = 1; i <= 6; i++) {
            advanceAnimationFrame(i * 600);
        }

        await waitFor(() => {
            expect(result.current.analysis?.status).toBe('ready');
            expect(result.current.analysis?.gazeDirection).toBe('down');
            expect(result.current.isCalibrated).toBe(true);
        });
    });

    it('does not drop completed calibration after a brief non-ready frame', async () => {
        for (let i = 0; i < 6; i++) {
            mockDetectForVideo.mockReturnValueOnce({
                faceLandmarks: [buildCenteredFace()],
            });
        }

        mockDetectForVideo.mockReturnValue({
            faceLandmarks: [],
        });

        const video = createVideoElement();
        const videoRef = { current: video };
        const configuration = createExamConfiguration();
        const mediaPipeSandbox = createSandbox();

        const { result } = renderHook(() =>
            useCheckupMediaPipe({
                videoRef,
                streamActive: true,
                configuration,
                mediaPipeSandbox,
            }),
        );

        await waitFor(() => {
            expect(mockCreateFromOptions).toHaveBeenCalledTimes(1);
        });

        // Advance past the required stable-frame window.
        for (let i = 1; i <= 6; i++) {
            advanceAnimationFrame(i * 600);
        }

        await waitFor(() => {
            expect(result.current.isCalibrated).toBe(true);
            expect(result.current.calibrationProgress).toBe(100);
        });

        advanceAnimationFrame(4200);

        await waitFor(() => {
            expect(result.current.analysis?.status).toBe('no-face');
            expect(result.current.isCalibrated).toBe(true);
            expect(result.current.calibrationProgress).toBe(100);
        });
    });

    it('keeps a single duplicate-face frame transient until it repeats on the next frame', async () => {
        mockDetectForVideo
            .mockReturnValueOnce({
                faceLandmarks: buildMultiFaceFrame(),
            })
            .mockReturnValueOnce({
                faceLandmarks: buildMultiFaceFrame(),
            })
            .mockReturnValue({
                faceLandmarks: [buildCenteredFace()],
            });

        const video = createVideoElement();
        const videoRef = { current: video };
        const configuration = createExamConfiguration();
        const mediaPipeSandbox = createSandbox();

        const { result } = renderHook(() =>
            useCheckupMediaPipe({
                videoRef,
                streamActive: true,
                configuration,
                mediaPipeSandbox,
            }),
        );

        await waitFor(() => {
            expect(mockCreateFromOptions).toHaveBeenCalledTimes(1);
        });

        advanceAnimationFrame(600);

        await waitFor(() => {
            expect(result.current.analysis?.status).toBe('ready');
            expect(result.current.analysis?.faceCount).toBe(2);
        });

        advanceAnimationFrame(1200);

        await waitFor(() => {
            expect(result.current.analysis?.status).toBe('multiple-faces');
            expect(result.current.analysis?.faceCount).toBe(2);
        });
    });

    it('cleans up and resets calibration when the stream is disabled after startup', async () => {
        const video = createVideoElement();
        const videoRef = { current: video };
        const configuration = createExamConfiguration();
        const mediaPipeSandbox = createSandbox();

        const { result, rerender } = renderHook(
            ({ streamActive }: { streamActive: boolean }) =>
                useCheckupMediaPipe({
                    videoRef,
                    streamActive,
                    configuration,
                    mediaPipeSandbox,
                }),
            {
                initialProps: {
                    streamActive: true,
                },
            },
        );

        await waitFor(() => {
            expect(mockCreateFromOptions).toHaveBeenCalledTimes(1);
        });

        // Advance past the required stable-frame window.
        for (let i = 1; i <= 6; i++) {
            advanceAnimationFrame(i * 600);
        }

        await waitFor(() => {
            expect(result.current.isCalibrated).toBe(true);
        });

        rerender({ streamActive: false });

        await waitFor(() => {
            expect(result.current.isEnabled).toBe(false);
            expect(result.current.analysis).toBeNull();
            expect(result.current.calibrationProgress).toBe(0);
            expect(result.current.isCalibrated).toBe(false);
        });

        expect(mockFaceLandmarkerClose).toHaveBeenCalledTimes(1);
    });

    it('recovers after an initialization failure once the hook is re-enabled', async () => {
        const video = createVideoElement();
        const videoRef = { current: video };
        const configuration = createExamConfiguration();
        const mediaPipeSandbox = createSandbox();

        mockCreateFromOptions
            .mockRejectedValueOnce(new Error('Initialization failed'))
            .mockResolvedValueOnce({
                detectForVideo: mockDetectForVideo,
                close: mockFaceLandmarkerClose,
            });

        const { result, rerender } = renderHook(
            ({ streamActive }: { streamActive: boolean }) =>
                useCheckupMediaPipe({
                    videoRef,
                    streamActive,
                    configuration,
                    mediaPipeSandbox,
                }),
            {
                initialProps: {
                    streamActive: true,
                },
            },
        );

        await waitFor(() => {
            expect(result.current.errorMessage).toMatch(/could not start during checkup/i);
        });

        rerender({ streamActive: false });

        await waitFor(() => {
            expect(result.current.errorMessage).toBeNull();
        });

        rerender({ streamActive: true });

        await waitFor(() => {
            expect(mockCreateFromOptions).toHaveBeenCalledTimes(2);
        });

        advanceAnimationFrame(600);

        await waitFor(() => {
            expect(result.current.analysis?.status).toBe('ready');
            expect(result.current.errorMessage).toBeNull();
        });
    });

    it('resets duplicate-face confirmation when the hook is torn down and started again', async () => {
        const video = createVideoElement();
        const videoRef = { current: video };
        const configuration = createExamConfiguration();
        const mediaPipeSandbox = createSandbox();

        mockDetectForVideo
            .mockReturnValueOnce({
                faceLandmarks: buildMultiFaceFrame(),
            })
            .mockReturnValueOnce({
                faceLandmarks: buildMultiFaceFrame(),
            })
            .mockReturnValue({
                faceLandmarks: [buildCenteredFace()],
            });

        const { result, rerender } = renderHook(
            ({ streamActive }: { streamActive: boolean }) =>
                useCheckupMediaPipe({
                    videoRef,
                    streamActive,
                    configuration,
                    mediaPipeSandbox,
                }),
            {
                initialProps: {
                    streamActive: true,
                },
            },
        );

        await waitFor(() => {
            expect(mockCreateFromOptions).toHaveBeenCalledTimes(1);
        });

        advanceAnimationFrame(600);
        advanceAnimationFrame(1200);

        await waitFor(() => {
            expect(result.current.analysis?.status).toBe('multiple-faces');
        });

        rerender({ streamActive: false });

        await waitFor(() => {
            expect(result.current.isEnabled).toBe(false);
        });

        rerender({ streamActive: true });

        mockDetectForVideo.mockReset();
        mockDetectForVideo.mockReturnValue({
            faceLandmarks: [buildCenteredFace()],
        });

        await waitFor(() => {
            expect(mockCreateFromOptions).toHaveBeenCalledTimes(2);
        });

        expect(result.current.isEnabled).toBe(true);
        expect(result.current.analysis).toBeNull();
        expect(result.current.calibrationProgress).toBe(0);
        expect(mockFaceLandmarkerClose).toHaveBeenCalledTimes(1);
    });
});
