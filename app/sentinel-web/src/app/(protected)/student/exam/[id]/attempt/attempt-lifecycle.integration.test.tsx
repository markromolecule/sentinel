import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildMediaPipeCalibrationProfile } from '@sentinel/shared';
import type { ExamConfig, ExamRuntimeAccess } from '@sentinel/shared/types';
import { patchStoredStudentExamFlow } from '../_lib/student-exam-flow';
import { useIncidentTelemetryDispatcher } from '../_hooks/use-attempt-mediapipe-monitoring/_hooks/use-incident-telemetry-dispatcher';
import { useStudentExamAttempt } from './_hooks/use-student-exam-attempt';

const EXAM_ID = '123e4567-e89b-12d3-a456-426614174999';

const {
    mockRouterReplace,
    mockUseApi,
    mockUseAuth,
    mockUseAudioSettingsQuery,
    mockUseExamSessionStatusQuery,
    mockUseStudentExamData,
    mockUseExamSession,
    mockUseAttemptMonitoring,
    mockUseExamInterruption,
    mockUseAudioAnomalyWorker,
    mockUseCheckupAudio,
    mockUseStudentExamMediaPipeStream,
    mockPrepareExamSession,
    mockSyncExamProgress,
    mockWriteStoredExamTurnInPreview,
    mockTerminateStudentAttempt,
    mockEmitMediaPipeEvidenceCandidate,
    mockEmitMediaPipeTelemetryEvent,
    mockWriteMonitoringEventTrace,
    mockCaptureIncidentEvidenceFrame,
    mockStartIncidentEvidenceUpload,
    mockCompleteEvidenceUpload,
    mockUploadToSignedUrl,
    mockCreateSupabaseClient,
    mockForVisionTasks,
    mockCreateFromOptions,
    mockDetectForVideo,
    mockTrackStop,
    mockFaceLandmarkerClose,
} = vi.hoisted(() => ({
    mockRouterReplace: vi.fn(),
    mockUseApi: vi.fn(),
    mockUseAuth: vi.fn(),
    mockUseAudioSettingsQuery: vi.fn(),
    mockUseExamSessionStatusQuery: vi.fn(),
    mockUseStudentExamData: vi.fn(),
    mockUseExamSession: vi.fn(),
    mockUseAttemptMonitoring: vi.fn(),
    mockUseExamInterruption: vi.fn(),
    mockUseAudioAnomalyWorker: vi.fn(),
    mockUseCheckupAudio: vi.fn(),
    mockUseStudentExamMediaPipeStream: vi.fn(),
    mockPrepareExamSession: vi.fn(),
    mockSyncExamProgress: vi.fn(),
    mockWriteStoredExamTurnInPreview: vi.fn(),
    mockTerminateStudentAttempt: vi.fn(),
    mockEmitMediaPipeEvidenceCandidate: vi.fn(),
    mockEmitMediaPipeTelemetryEvent: vi.fn(),
    mockWriteMonitoringEventTrace: vi.fn(),
    mockCaptureIncidentEvidenceFrame: vi.fn(),
    mockStartIncidentEvidenceUpload: vi.fn(),
    mockCompleteEvidenceUpload: vi.fn(),
    mockUploadToSignedUrl: vi.fn(),
    mockCreateSupabaseClient: vi.fn(),
    mockForVisionTasks: vi.fn(),
    mockCreateFromOptions: vi.fn(),
    mockDetectForVideo: vi.fn(),
    mockTrackStop: vi.fn(),
    mockFaceLandmarkerClose: vi.fn(),
}));

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

vi.mock('next/navigation', () => ({
    useRouter: () => ({
        replace: mockRouterReplace,
    }),
}));

vi.mock('@sentinel/hooks', () => ({
    useApi: () => mockUseApi(),
    useAuth: () => mockUseAuth(),
    useAudioSettingsQuery: () => mockUseAudioSettingsQuery(),
    useExamSessionStatusQuery: (...args: unknown[]) => mockUseExamSessionStatusQuery(...args),
}));

vi.mock('@sentinel/services', () => ({
    prepareExamSession: (...args: unknown[]) => mockPrepareExamSession(...args),
    syncExamProgress: (...args: unknown[]) => mockSyncExamProgress(...args),
    completeEvidenceUpload: (...args: unknown[]) => mockCompleteEvidenceUpload(...args),
}));

vi.mock('@/data/supabase/client', () => ({
    createSupabaseClient: (...args: unknown[]) => mockCreateSupabaseClient(...args),
}));

vi.mock('../_hooks/use-student-exam-stage-guard', () => ({
    useStudentExamStageGuard: () => {
        const data = mockUseStudentExamData();
        return {
            ...data,
            isResolving: data?.isLoading ?? false,
            isLoading: data?.isLoading ?? false,
            resolution: {
                targetStage: 'attempt',
                reasonCode: 'ATTEMPT_ACTIVE',
                shouldRedirect: false,
            },
            storedFlow: { privacyAccepted: true, checkupCompleted: true },
        };
    },
}));

vi.mock('@/app/(protected)/student/exam/[id]/_hooks/use-exam-session', () => ({
    useExamSession: (args: unknown) => mockUseExamSession(args),
}));

vi.mock('@/app/(protected)/student/exam/[id]/_hooks/use-exam-monitoring', () => ({
    useExamMonitoring: (args: unknown) => mockUseAttemptMonitoring(args),
}));

vi.mock('@/app/(protected)/student/exam/[id]/_hooks/use-exam-interruption', () => ({
    useExamInterruption: (...args: unknown[]) => mockUseExamInterruption(...args),
}));

vi.mock('@/app/(protected)/student/exam/[id]/_hooks/use-turned-in-exam-redirect', () => ({
    useTurnedInExamRedirect: () => false,
}));

vi.mock('@/app/(protected)/student/exam/[id]/_hooks/use-checkup-audio', () => ({
    useCheckupAudio: () => mockUseCheckupAudio(),
}));

vi.mock('@/app/(protected)/student/exam/[id]/_components/student-exam-audio-provider', () => ({
    useCheckupAudio: () => mockUseCheckupAudio(),
}));

vi.mock('@/app/(protected)/student/exam/[id]/_components/student-exam-mediapipe-provider', () => ({
    useStudentExamMediaPipeStream: () => mockUseStudentExamMediaPipeStream(),
}));

vi.mock('@/hooks/use-audio-anomaly-worker', () => ({
    useAudioAnomalyWorker: () => mockUseAudioAnomalyWorker(),
}));

vi.mock('@/app/(protected)/student/exam/[id]/_lib/terminate-student-attempt', () => ({
    terminateStudentAttempt: (...args: unknown[]) => mockTerminateStudentAttempt(...args),
}));

vi.mock('@/app/(protected)/student/exam/[id]/_lib/exam-turn-in-storage', () => ({
    writeStoredExamTurnInPreview: (...args: unknown[]) => mockWriteStoredExamTurnInPreview(...args),
}));

vi.mock('@/app/(protected)/student/exam/[id]/_lib/exam-session-storage', () => ({
    readStoredExamSession: vi.fn(),
    readStoredExamAnswerDraft: vi.fn(),
    readStoredExamTurnInPreview: vi.fn(),
    readStoredLobbyEntryMarker: vi.fn(),
    clearStoredExamSession: vi.fn(),
    clearStoredExamTurnInPreview: vi.fn(),
    clearStoredLobbyEntryMarker: vi.fn(),
    consumeStoredLobbyEntry: vi.fn(),
    writeStoredExamSession: vi.fn(),
    writeStoredExamAnswerDraft: vi.fn(),
    writeStoredReconnectIntent: vi.fn(),
    reconcileExamAnswerDraft: vi.fn((local) => ({
        answers: local?.answers ?? {},
        elapsedSeconds: local?.elapsedSeconds ?? 0,
        source: local ? 'local' : 'empty',
    })),
}));

vi.mock('../_lib/web-telemetry-client', () => ({
    emitMediaPipeEvidenceCandidate: (...args: unknown[]) =>
        mockEmitMediaPipeEvidenceCandidate(...args),
    emitMediaPipeTelemetryEvent: (...args: unknown[]) =>
        mockEmitMediaPipeTelemetryEvent(...args),
    writeMonitoringEventTrace: (...args: unknown[]) => mockWriteMonitoringEventTrace(...args),
}));

vi.mock('../_hooks/use-attempt-mediapipe-monitoring/_hooks/use-incident-evidence-upload', () => ({
    useIncidentEvidenceUpload: () => ({
        startIncidentEvidenceUpload: mockStartIncidentEvidenceUpload,
    }),
}));

vi.mock('../_hooks/use-attempt-mediapipe-monitoring/_utils/capture-incident-evidence-frame', () => ({
    captureIncidentEvidenceFrame: (...args: unknown[]) => mockCaptureIncidentEvidenceFrame(...args),
}));

vi.mock('@mediapipe/tasks-vision', () => ({
    FilesetResolver: {
        forVisionTasks: (...args: unknown[]) => mockForVisionTasks(...args),
    },
    FaceLandmarker: {
        createFromOptions: (...args: unknown[]) => mockCreateFromOptions(...args),
    },
}));

function createQuestions(count: number) {
    return Array.from({ length: count }, (_, index) => ({
        id: `question-${index + 1}`,
        questionId: `question-${index + 1}`,
        orderIndex: index,
        points: 1,
        type: 'MULTIPLE_CHOICE',
        content: {
            prompt: `Question ${index + 1}`,
            options: ['A', 'B', 'C', 'D'],
        },
        passageType: index === 0 ? 'plain' : null,
        passageContent: index === 0 ? 'Passage 1' : null,
    }));
}

function createStudentExamData() {
    return {
        examId: EXAM_ID,
        exam: {
            id: EXAM_ID,
            title: 'Integration attempt',
            description: 'Lifecycle regression fixture',
            duration: 60,
            status: 'available',
            runtimeAccess: {
                canStart: true,
                canResume: false,
                hasActiveAttempt: true,
            },
        },
        configuration: {
            cameraRequired: true,
            micRequired: true,
            strictMode: true,
            screenLock: true,
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
        } satisfies ExamConfig,
        mediaPipeSandbox: {
            enabled: true,
            captureDuringCheckup: true,
            emitDuringExam: true,
            confidenceThreshold: 0.8,
            frameIntervalMs: 500,
            offScreenDurationMs: 1000,
            calibrationRequired: false,
            debugOverlayEnabled: false,
        },
        questions: createQuestions(28),
        isLoading: false,
    };
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

function buildOffscreenFace() {
    const landmarks = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5, z: 0 }));

    landmarks[33] = { x: 0.38, y: 0.46, z: 0 };
    landmarks[133] = { x: 0.44, y: 0.46, z: 0 };
    landmarks[263] = { x: 0.62, y: 0.46, z: 0 };
    landmarks[362] = { x: 0.56, y: 0.46, z: 0 };
    [468, 469, 470, 471, 472].forEach((index) => {
        landmarks[index] = { x: 0.4, y: 0.46, z: 0 };
    });
    [473, 474, 475, 476, 477].forEach((index) => {
        landmarks[index] = { x: 0.58, y: 0.46, z: 0 };
    });

    return landmarks;
}

describe('attempt lifecycle integration', () => {
    const originalEnv = { ...process.env };
    let sessionStatusData: unknown = null;

    beforeEach(() => {
        vi.clearAllMocks();
        process.env = { ...originalEnv };
        process.env.NODE_ENV = 'test';

        mockRouterReplace.mockReset();
        mockUseApi.mockReturnValue({});
        mockUseAuth.mockReturnValue({
            user: {
                id: 'student-1',
            },
        });
        mockUseAudioSettingsQuery.mockReturnValue({
            data: null,
            isLoading: false,
        });
        mockUseExamSessionStatusQuery.mockImplementation(() => ({
            data: sessionStatusData,
            isLoading: false,
        }));
        mockUseStudentExamData.mockReturnValue(createStudentExamData());
        mockUseExamSession.mockReturnValue({
            examSession: {
                sessionId: 'session-1',
                configSnapshot: null,
            },
            isInitializingSession: false,
            elapsedSeconds: 0,
            elapsedSecondsRef: { current: 0 },
            secondsRemaining: 3600,
            saveAnswerDraft: vi.fn(),
            syncProgress: mockSyncExamProgress,
        });
        mockUseAttemptMonitoring.mockReturnValue({
            securityLockReason: null,
            isResumingExam: false,
            resumeSecuredExam: vi.fn(),
            fullScreenContainerRef: { current: null },
            suspendSecurityMonitoring: vi.fn(() => true),
        });
        mockUseExamInterruption.mockReturnValue(undefined);
        mockUseAudioAnomalyWorker.mockReturnValue({
            errorMessage: null,
            isEnabled: false,
            phase: 'idle',
        });
        mockUseCheckupAudio.mockReturnValue({
            audioStream: null,
            worker: null,
            ensureAudioAccess: vi.fn().mockResolvedValue(undefined),
            stopAudioStream: vi.fn(),
        });
        mockUseStudentExamMediaPipeStream.mockReturnValue({
            stopStream: vi.fn(),
        });
        mockPrepareExamSession.mockResolvedValue({
            preparationToken: 'prep-token',
            score: 28,
            totalScore: 28,
            percentage: 100,
            answeredCount: 28,
            autoGradableQuestionCount: 28,
            manualReviewQuestionCount: 0,
            requiresManualReview: false,
        });
        mockSyncExamProgress.mockResolvedValue({
            message: 'synced',
        });
        mockWriteStoredExamTurnInPreview.mockReturnValue(undefined);
        mockTerminateStudentAttempt.mockReturnValue(undefined);

        mockForVisionTasks.mockResolvedValue({});
        mockCreateFromOptions.mockResolvedValue({
            detectForVideo: mockDetectForVideo,
            close: mockFaceLandmarkerClose,
        });
        mockDetectForVideo.mockReturnValue({
            faceLandmarks: [],
        });
        mockTrackStop.mockReset();
        mockFaceLandmarkerClose.mockReset();
        mockEmitMediaPipeEvidenceCandidate.mockReset();
        mockEmitMediaPipeTelemetryEvent.mockReset();
        mockWriteMonitoringEventTrace.mockReset();
        mockCaptureIncidentEvidenceFrame.mockReset();
        mockStartIncidentEvidenceUpload.mockReset();
        mockCompleteEvidenceUpload.mockReset();
        mockUploadToSignedUrl.mockReset();
        mockCreateSupabaseClient.mockReset();

        mockCreateSupabaseClient.mockReturnValue({
            storage: {
                from: vi.fn(() => ({
                    uploadToSignedUrl: mockUploadToSignedUrl,
                })),
            },
        });
        mockCaptureIncidentEvidenceFrame.mockResolvedValue({
            blob: new Blob(['frame'], { type: 'image/webp' }),
            mimeType: 'image/webp',
            width: 1280,
            height: 720,
        });
        mockUploadToSignedUrl.mockResolvedValue({ error: null });
        mockCompleteEvidenceUpload.mockResolvedValue({
            evidenceId: 'evidence-1',
            state: 'AVAILABLE',
            expiresAt: '2026-08-03T12:00:00.000Z',
        });

        sessionStatusData = null;
        window.sessionStorage.clear();
        patchStoredStudentExamFlow(EXAM_ID, {
            checkupCompleted: true,
            mediaPipeActivatedAt: new Date().toISOString(),
            mediaPipeCalibrationCompletedAt: new Date().toISOString(),
            mediaPipeCalibrationProfile: buildMediaPipeCalibrationProfile({
                createdAt: new Date().toISOString(),
                samples: [
                    {
                        landmarks: [{ x: 0.5, y: 0.5, z: 0 }],
                        confidenceScore: 0.92,
                        faceBounds: {
                            minX: 0.42,
                            minY: 0.41,
                            maxX: 0.58,
                            maxY: 0.59,
                            width: 0.16,
                            height: 0.18,
                            centerX: 0.5,
                            centerY: 0.5,
                        },
                        gaze: {
                            irisHorizontalOffset: 0.02,
                            irisVerticalOffset: 0.01,
                            headHorizontalOffset: 0.01,
                            headVerticalOffset: 0.01,
                            eyeAspectRatio: 0.31,
                        },
                    },
                ],
            }),
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

        currentPerformanceNow = 0;
        currentWallClockNow = 0;
        rafQueue = [];
        vi.spyOn(performance, 'now').mockImplementation(() => currentPerformanceNow);
        vi.spyOn(Date, 'now').mockImplementation(() => currentWallClockNow);
        vi.spyOn(window, 'requestAnimationFrame').mockImplementation(
            (callback: FrameRequestCallback) => {
                rafQueue.push(callback);
                return rafQueue.length;
            },
        );
        vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('captures a threshold-crossing MediaPipe candidate and queues one evidence upload', async () => {
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

        const { result } = renderHook(() => useIncidentTelemetryDispatcher());

        await result.current.dispatchIncident({
            telemetrySignal: 'NO_FACE_DETECTED',
            normalizedAnalysis: {
                status: 'offscreen',
                confidenceScore: 0.94,
            } as never,
            detectionTime: '2026-07-28T11:59:59.500Z',
            developmentDiagnostics: {
                confidenceThreshold: 0.8,
                durationThresholdMs: 1500,
                frameIntervalMs: 500,
                calibrationState: 'available',
                downwardGazePolicy: 'strict',
            },
            dispatch: {
                durationMs: 1500,
                aggregation: {
                    trigger: 'duration-threshold',
                },
            } as never,
            videoElement: document.createElement('video'),
            eligibility: {
                isEnabled: true,
            } as never,
            sessionId: 'session-1',
            resolvedStudentId: 'student-1',
            resolvedConfiguration: {
                aiRules: {
                    gaze_tracking: true,
                    face_detection: true,
                    audio_anomaly_detection: false,
                    multiple_faces_detection: true,
                },
                cameraRequired: true,
            } as never,
            sandbox: {
                enabled: true,
                captureDuringCheckup: true,
                emitDuringExam: true,
                confidenceThreshold: 0.8,
                frameIntervalMs: 500,
                offScreenDurationMs: 1500,
                calibrationRequired: false,
                debugOverlayEnabled: false,
            } as never,
            setActiveIncident: vi.fn(),
        });

        await waitFor(() => {
            expect(mockEmitMediaPipeEvidenceCandidate).toHaveBeenCalledTimes(1);
        });

        expect(mockStartIncidentEvidenceUpload).toHaveBeenCalledTimes(1);
        expect(mockEmitMediaPipeTelemetryEvent).not.toHaveBeenCalled();
    });

    it('tracks progress from 1/28 to 21/28 and latches terminal close before redirecting', async () => {
        sessionStatusData = {
            sessionId: 'session-1',
            attemptId: 'attempt-1',
            examId: EXAM_ID,
            status: 'IN_PROGRESS',
            lifecycleState: null,
            completedAt: null,
            closedReason: null,
            terminalMessage: null,
        };

        const { result, rerender } = renderHook(() => useStudentExamAttempt());

        act(() => {
            result.current.handleAnswerChange('question-1', 'A');
        });

        expect(result.current.answeredCount).toBe(1);
        expect(result.current.progress).toBe(4);

        act(() => {
            for (let index = 2; index <= 21; index += 1) {
                result.current.handleAnswerChange(`question-${index}`, 'A');
            }
        });

        expect(result.current.answeredCount).toBe(21);
        expect(result.current.progress).toBe(75);

        sessionStatusData = {
            ...sessionStatusData,
            status: 'COMPLETED',
            lifecycleState: 'SUBMITTED',
            terminalMessage: 'This exam attempt has been submitted.',
        };
        rerender();

        await waitFor(() => {
            expect(result.current.isTerminalAttempt).toBe(true);
        });

        expect(mockUseAttemptMonitoring).toHaveBeenLastCalledWith(
            expect.objectContaining({
                isMonitoringSuspended: true,
                monitoringPhase: 'suspended',
            }),
        );
        expect(mockUseExamSession).toHaveBeenLastCalledWith(
            expect.objectContaining({
                isAttemptActive: false,
                isTerminalAttempt: true,
            }),
        );
        expect(mockTerminateStudentAttempt).toHaveBeenCalledWith({ examId: EXAM_ID });
        expect(mockRouterReplace).toHaveBeenCalledWith('/student/history/attempts/attempt-1');
    });

    it('submits a fully answered control attempt through the turn-in bridge exactly once', async () => {
        sessionStatusData = {
            sessionId: 'session-1',
            attemptId: 'attempt-1',
            examId: EXAM_ID,
            status: 'IN_PROGRESS',
            lifecycleState: null,
            completedAt: null,
            closedReason: null,
            terminalMessage: null,
        };

        const { result } = renderHook(() => useStudentExamAttempt());

        act(() => {
            result.current.questions.forEach((question) => {
                result.current.handleAnswerChange(question.id, 'A');
            });
        });

        await act(async () => {
            await result.current.proceedToTurnInReview();
        });

        expect(mockPrepareExamSession).toHaveBeenCalledTimes(1);
        expect(mockWriteStoredExamTurnInPreview).toHaveBeenCalledTimes(1);
        expect(mockRouterReplace).toHaveBeenCalledWith('/student/exam/123e4567-e89b-12d3-a456-426614174999/result');
    });
});
