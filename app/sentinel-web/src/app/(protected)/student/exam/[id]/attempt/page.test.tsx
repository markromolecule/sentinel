'use client';

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import StudentExamAttemptPage from './page';

const {
    mockRouterReplace,
    mockStudentExamData,
    mockExamSession,
    mockExamMonitoring,
    mockAttemptMediaPipeMonitoring,
    mockUseAudioAnomalyWorker,
    mockUseAudioSettingsQuery,
    mockUseExamSessionStatusQuery,
    mockStudentLiveInspectionBridge,
    mockPrepareExamSession,
} = vi.hoisted(() => ({
    mockRouterReplace: vi.fn(),
    mockStudentExamData: vi.fn(),
    mockExamSession: vi.fn(),
    mockExamMonitoring: vi.fn(),
    mockAttemptMediaPipeMonitoring: vi.fn(),
    mockUseAudioAnomalyWorker: vi.fn(),
    mockUseAudioSettingsQuery: vi.fn(),
    mockUseExamSessionStatusQuery: vi.fn(),
    mockStudentLiveInspectionBridge: vi.fn(() => null),
    mockPrepareExamSession: vi.fn(),
}));

vi.mock('next/navigation', () => ({
    useRouter: () => ({
        replace: mockRouterReplace,
    }),
}));

vi.mock('../_components/student-exam-loading-state', () => ({
    StudentExamLoadingState: () => <div>Loading...</div>,
}));

vi.mock('@/app/(protected)/student/exam/[id]/_hooks/use-student-exam-stage-guard', () => ({
    useStudentExamStageGuard: () => {
        const data = mockStudentExamData();
        return {
            ...data,
            isResolving: data?.isLoading ?? false,
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
    useExamSession: () => mockExamSession(),
}));

vi.mock('@/app/(protected)/student/exam/[id]/_hooks/use-turned-in-exam-redirect', () => ({
    useTurnedInExamRedirect: () => false,
}));

vi.mock('@/app/(protected)/student/exam/[id]/_hooks/use-exam-monitoring', () => ({
    useExamMonitoring: (args: unknown) => mockExamMonitoring(args),
}));

vi.mock('@/app/(protected)/student/exam/[id]/_hooks/use-attempt-mediapipe-monitoring', () => ({
    useAttemptMediaPipeMonitoring: () => mockAttemptMediaPipeMonitoring(),
}));

vi.mock('@/app/(protected)/student/exam/[id]/_components/student-live-inspection-bridge', () => ({
    StudentLiveInspectionBridge: (props: unknown) => mockStudentLiveInspectionBridge(props),
}));

vi.mock('@/hooks/use-audio-anomaly-worker', () => ({
    useAudioAnomalyWorker: () => mockUseAudioAnomalyWorker(),
}));

vi.mock('@sentinel/hooks', () => ({
    useApi: () => ({ mockClient: true }),
    useAudioSettingsQuery: () => mockUseAudioSettingsQuery(),
    useExamSessionStatusQuery: (...args: unknown[]) => mockUseExamSessionStatusQuery(...args),
}));

vi.mock('@sentinel/services', () => ({
    prepareExamSession: (...args: unknown[]) => mockPrepareExamSession(...args),
}));

vi.mock('@/app/(protected)/student/exam/[id]/attempt/_lib/exam-turn-in-storage', () => ({
    writeStoredExamTurnInPreview: vi.fn(),
}));

vi.mock('@/lib/config', () => ({
    default: {
        isProduction: false,
        isDevelopment: true,
    },
    config: {
        isProduction: false,
        isDevelopment: true,
    },
}));

vi.mock('@sentinel/ui', async () => {
    const actual = await vi.importActual<typeof import('@sentinel/ui')>('@sentinel/ui');

    return {
        ...actual,
        Badge: ({ children, className }: { children: ReactNode; className?: string }) => (
            <span className={className}>{children}</span>
        ),
        AlertDialog: ({ children, open }: { children: ReactNode; open: boolean }) =>
            open ? <div>{children}</div> : null,
        AlertDialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
        AlertDialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
        AlertDialogTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
        AlertDialogDescription: ({ children }: { children: ReactNode }) => <div>{children}</div>,
        AlertDialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
        AlertDialogAction: ({
            children,
            onClick,
        }: {
            children: ReactNode;
            onClick?: () => void;
        }) => <button onClick={onClick}>{children}</button>,
    };
});

vi.mock('@/features/exams/_components/engine', () => ({
    ExamAttemptShell: ({
        title,
        status,
        toolbar,
        questionRail,
        passagePanel,
        footer,
        children,
    }: {
        title: string;
        status: ReactNode;
        toolbar: ReactNode;
        questionRail: ReactNode;
        passagePanel: ReactNode;
        footer: ReactNode;
        children: ReactNode;
    }) => (
        <div>
            <h1>{title}</h1>
            <div>{status}</div>
            <div>{toolbar}</div>
            <div>{questionRail}</div>
            <div>{passagePanel}</div>
            <div>{children}</div>
            <div>{footer}</div>
        </div>
    ),
    type: {},
    hasAnswer: (value: unknown) => value !== null && value !== undefined && value !== '',
    formatTimer: (seconds: number) => `${seconds}s`,
    getRuntimePassageDetails: ({
        questionPassageContent,
        questionPassageType,
    }: {
        questionPassageContent?: string | null;
        questionPassageType?: 'plain' | 'html' | null;
    }) => ({
        title: 'Passage',
        description: '',
        body:
            questionPassageType === 'plain'
                ? (questionPassageContent ?? '').replaceAll('\n', '<br />')
                : (questionPassageContent ?? ''),
    }),
    ExamAttemptRuntimeHeader: ({
        onSubmit,
        onTogglePassagePanel,
        showPassagePanel,
        hasPassage,
    }: {
        onSubmit: () => void;
        onTogglePassagePanel: () => void;
        showPassagePanel: boolean;
        hasPassage?: boolean;
    }) => (
        <div>
            {hasPassage ? (
                <button onClick={onTogglePassagePanel}>
                    {showPassagePanel ? 'Hide passage panel' : 'Show passage panel'}
                </button>
            ) : null}
            <button onClick={onSubmit}>Turn in exam</button>
        </div>
    ),
    ExamAttemptRuntimeFooter: ({
        currentQuestionIndex,
        totalQuestions,
        onMove,
    }: {
        currentQuestionIndex: number;
        totalQuestions: number;
        onMove: (direction: 'previous' | 'next') => void;
    }) => (
        <div>
            Question {totalQuestions ? currentQuestionIndex + 1 : 0} of {totalQuestions}
            <button onClick={() => onMove('next')}>Next question</button>
        </div>
    ),
    ExamAttemptRuntimeNavigation: ({
        questions,
        onQuestionSelect,
    }: {
        questions: Array<{ id: string; content: { prompt: string } }>;
        onQuestionSelect: (index: number) => void;
    }) => (
        <div>
            {questions.map((question, index) => (
                <button key={question.id} onClick={() => onQuestionSelect(index)}>
                    Go to {question.content.prompt}
                </button>
            ))}
        </div>
    ),
    ExamAttemptRuntimePassage: ({
        showPassagePanel,
        currentQuestion,
        currentContext,
    }: {
        showPassagePanel: boolean;
        currentQuestion: { id: string } | null;
        currentContext: { title: string; description: string; body: string };
    }) =>
        showPassagePanel && currentQuestion ? (
            <div>
                <div>{currentContext.title}</div>
                {currentContext.body ? (
                    <div
                        data-testid="runtime-passage-body"
                        dangerouslySetInnerHTML={{ __html: currentContext.body }}
                    />
                ) : (
                    <div>No passage is attached to this question yet.</div>
                )}
            </div>
        ) : null,
    ExamAttemptPassageSheet: () => null,
    ExamAttemptRuntimeSecurity: ({
        securityLockReason,
        onResumeExam,
    }: {
        securityLockReason: string | null;
        onResumeExam: () => void;
    }) => (
        <div>
            {securityLockReason ? (
                <div>
                    <span>Return to the secured exam view</span>
                    <button onClick={onResumeExam}>Resume Exam</button>
                </div>
            ) : (
                'Security'
            )}
        </div>
    ),
    ExamAttemptRuntimeQuestion: ({
        currentQuestion,
        onAnswerChange,
        isFlagged,
        onToggleFlag,
        crossOutEnabled,
        onToggleCrossOutMode,
    }: {
        currentQuestion: {
            content: {
                prompt: string;
            };
        };
        onAnswerChange: (value: string) => void;
        isFlagged: boolean;
        onToggleFlag: () => void;
        crossOutEnabled: boolean;
        onToggleCrossOutMode: () => void;
    }) => (
        <div>
            <div>{currentQuestion.content.prompt}</div>
            <button onClick={() => onAnswerChange('4')}>Answer 4</button>
            <button onClick={onToggleFlag}>{isFlagged ? 'Flagged' : 'Mark for review'}</button>
            <button onClick={onToggleCrossOutMode}>
                {crossOutEnabled ? 'Cross-out enabled' : 'Enable cross-out'}
            </button>
        </div>
    ),
}));

function createStudentExamData() {
    return {
        examId: '11111111-1111-1111-1111-111111111111',
        exam: {
            id: '11111111-1111-1111-1111-111111111111',
            title: 'MediaPipe attempt',
            description: 'Attempt description',
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
            maxReconnectAttempts: 3,
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
        },
        mediaPipeSandbox: {
            enabled: true,
            captureDuringCheckup: true,
            emitDuringExam: true,
            confidenceThreshold: 0.8,
            frameIntervalMs: 500,
            offScreenDurationMs: 3000,
            calibrationRequired: false,
            debugOverlayEnabled: false,
        },
        questions: [
            {
                id: 'question-1',
                content: {
                    prompt: 'What is 2 + 2?',
                    options: ['3', '4'],
                },
                passageType: 'plain',
                passageContent: 'First passage line 1\nFirst passage line 2',
                orderIndex: 0,
            },
        ],
        isLoading: false,
    };
}

describe('StudentExamAttemptPage', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    beforeEach(() => {
        cleanup();
        vi.clearAllMocks();
        Object.defineProperty(document, 'fullscreenElement', {
            value: null,
            configurable: true,
        });
        Object.defineProperty(document, 'exitFullscreen', {
            value: vi.fn().mockResolvedValue(undefined),
            configurable: true,
        });

        mockStudentExamData.mockReturnValue(createStudentExamData());
        mockExamSession.mockReturnValue({
            examSession: {
                sessionId: '22222222-2222-2222-2222-222222222222',
                configSnapshot: null,
            },
            isInitializingSession: false,
            elapsedSeconds: 120,
            secondsRemaining: 1800,
            saveAnswerDraft: vi.fn(),
            syncProgress: vi.fn(),
        });
        mockExamMonitoring.mockReturnValue({
            securityLockReason: null,
            isResumingExam: false,
            resumeSecuredExam: vi.fn(),
            fullScreenContainerRef: { current: null },
            suspendSecurityMonitoring: vi.fn(() => true),
        });
        mockAttemptMediaPipeMonitoring.mockReturnValue({
            videoRef: { current: null },
            analysis: {
                status: 'off-screen',
            },
            phase: 'running',
            errorMessage: null,
            activeIncident: null,
            dismissIncident: vi.fn(),
            isEnabled: true,
        });
        mockUseAudioAnomalyWorker.mockReturnValue({
            errorMessage: null,
            isEnabled: false,
            phase: 'idle',
        });
        mockUseAudioSettingsQuery.mockReturnValue({
            data: null,
            isLoading: false,
        });
        mockUseExamSessionStatusQuery.mockReturnValue({
            data: null,
            isLoading: false,
        });
        mockPrepareExamSession.mockResolvedValue({
            preparationToken: 'prep-token',
            score: 1,
            totalScore: 1,
            percentage: 100,
            answeredCount: 1,
            autoGradableQuestionCount: 1,
            manualReviewQuestionCount: 0,
            requiresManualReview: false,
        });
    });

    it('renders the active MediaPipe status badge inside the attempt shell', () => {
        render(<StudentExamAttemptPage />);

        expect(screen.getByText(/mediapipe off-screen/i)).toBeTruthy();
        expect(screen.getByRole('button', { name: /answer 4/i })).toBeTruthy();
    });

    it('defers the phone question count to the attempt footer', () => {
        render(<StudentExamAttemptPage />);

        const questionCounts = screen.getAllByText('Question 1 of 1');
        const headerCount = questionCounts.find((count) => count.className.includes('hidden'));

        expect(headerCount?.className).toContain('sm:inline-flex');
        expect(questionCounts.some((count) => !count.className.includes('hidden'))).toBe(true);
    });

    it('preserves passage availability, question state, and footer counting across navigation', () => {
        mockStudentExamData.mockReturnValue({
            ...createStudentExamData(),
            questions: [
                createStudentExamData().questions[0],
                {
                    id: 'question-2',
                    content: {
                        prompt: 'What is 5 + 5?',
                        options: ['9', '10'],
                    },
                    passageType: null,
                    passageContent: null,
                    orderIndex: 1,
                },
            ],
        });

        render(<StudentExamAttemptPage />);

        expect(screen.getByRole('button', { name: 'Hide passage panel' })).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: 'Mark for review' }));
        fireEvent.click(screen.getByRole('button', { name: 'Enable cross-out' }));

        expect(screen.getByRole('button', { name: 'Flagged' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Cross-out enabled' })).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: 'Next question' }));

        expect(
            screen.getByRole('button', { name: 'Next question' }).parentElement?.textContent,
        ).toContain('Question 2 of 2');
        expect(screen.getByText('What is 5 + 5?')).toBeTruthy();
        expect(screen.queryByRole('button', { name: /passage panel/i })).toBeNull();
    });

    it('renders the MediaPipe video element when MediaPipe monitoring is enabled', () => {
        render(<StudentExamAttemptPage />);

        const video = screen.getByTestId('attempt-mediapipe-video');

        expect(video.tagName).toBe('VIDEO');
        expect(video.className).not.toContain('hidden');
    });

    it('stays on the attempt view during normal answering flow', () => {
        render(<StudentExamAttemptPage />);

        fireEvent.click(screen.getByRole('button', { name: /answer 4/i }));

        expect(screen.getByRole('button', { name: /answer 4/i })).toBeTruthy();
        expect(screen.getByRole('button', { name: /turn in exam/i })).toBeTruthy();
        expect(screen.queryByText(/loading\.\.\./i)).toBeNull();
    });

    it('renders terminal blocked state without live inspection or question controls', () => {
        mockUseExamSessionStatusQuery.mockReturnValue({
            data: {
                sessionId: '22222222-2222-2222-2222-222222222222',
                attemptId: '33333333-3333-4333-8333-333333333333',
                examId: '11111111-1111-1111-1111-111111111111',
                status: 'IN_PROGRESS',
                lifecycleState: 'CLOSED',
                completedAt: null,
                closedReason: 'EXAM_WINDOW_ENDED',
                terminalMessage: 'This exam attempt has been closed.',
            },
            isLoading: false,
        });

        render(<StudentExamAttemptPage />);

        expect(screen.getByText('Exam Closed')).toBeTruthy();
        expect(screen.getByText('This exam attempt has been closed.')).toBeTruthy();
        expect(screen.queryByRole('button', { name: /answer 4/i })).toBeNull();
        expect(screen.queryByRole('button', { name: /turn in exam/i })).toBeNull();
        expect(mockStudentLiveInspectionBridge).not.toHaveBeenCalled();
    });

    it('updates the runtime passage content when navigating between questions without leaking prior content', () => {
        mockStudentExamData.mockReturnValue({
            ...createStudentExamData(),
            questions: [
                {
                    id: 'question-1',
                    content: {
                        prompt: 'What is 2 + 2?',
                        options: ['3', '4'],
                    },
                    passageType: 'plain',
                    passageContent: 'First passage line 1\nFirst passage line 2',
                    orderIndex: 0,
                },
                {
                    id: 'question-2',
                    content: {
                        prompt: 'What is 5 + 5?',
                        options: ['9', '10'],
                    },
                    passageType: null,
                    passageContent: null,
                    orderIndex: 1,
                },
            ],
        });

        render(<StudentExamAttemptPage />);

        expect(screen.getByTestId('runtime-passage-body').innerHTML).toContain(
            'First passage line 1',
        );
        expect(screen.queryByText(/No passage is attached to this question yet/i)).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: /go to what is 5 \+ 5\?/i }));

        expect(screen.queryByTestId('runtime-passage-body')).toBeNull();
        expect(screen.queryByText(/No passage is attached to this question yet/i)).toBeNull();
        expect(screen.queryByText(/First passage line 1/i)).toBeNull();
    });

    it('preserves explicit panel visibility changes across question navigation', () => {
        mockStudentExamData.mockReturnValue({
            ...createStudentExamData(),
            questions: [
                {
                    id: 'question-1',
                    content: {
                        prompt: 'What is 2 + 2?',
                        options: ['3', '4'],
                    },
                    passageType: 'plain',
                    passageContent: 'First passage line 1\nFirst passage line 2',
                    orderIndex: 0,
                },
                {
                    id: 'question-2',
                    content: {
                        prompt: 'What is 5 + 5?',
                        options: ['9', '10'],
                    },
                    passageType: null,
                    passageContent: null,
                    orderIndex: 1,
                },
            ],
        });

        render(<StudentExamAttemptPage />);

        fireEvent.click(screen.getByRole('button', { name: /hide passage panel/i }));

        expect(screen.queryByTestId('runtime-passage-body')).toBeNull();
        expect(screen.queryByText(/^Passage$/)).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: /go to what is 5 \+ 5\?/i }));

        expect(screen.queryByTestId('runtime-passage-body')).toBeNull();
        expect(screen.queryByText(/No passage is attached to this question yet/i)).toBeNull();

        expect(screen.queryByText(/No passage is attached to this question yet/i)).toBeNull();
        expect(screen.queryByText(/First passage line 1/i)).toBeNull();
        expect(screen.queryByRole('button', { name: /passage panel/i })).toBeNull();
    });

    it('shows a MediaPipe incident dialog when an actionable signal is raised', () => {
        mockAttemptMediaPipeMonitoring.mockReturnValue({
            videoRef: { current: null },
            analysis: {
                status: 'multiple-faces',
            },
            phase: 'running',
            errorMessage: null,
            activeIncident: {
                eventType: 'MULTIPLE_FACES',
                detectedAt: '2026-04-22T12:00:00.000Z',
                analysis: {
                    status: 'multiple-faces',
                    signal: 'MULTIPLE_FACES',
                    faceCount: 2,
                    confidenceScore: 0.91,
                    gazeDirection: null,
                    eyeState: 'unknown',
                    faceBounds: null,
                    reasons: ['More than one face was detected in the active camera frame.'],
                },
            },
            dismissIncident: vi.fn(),
            isEnabled: true,
        });

        render(<StudentExamAttemptPage />);

        expect(screen.getByText(/multiple faces detected/i)).toBeTruthy();
        expect(screen.getByText(/only you are visible/i)).toBeTruthy();
    });

    it('shows a non-blocking MediaPipe warning when monitoring fails but keeps the exam visible', () => {
        mockAttemptMediaPipeMonitoring.mockReturnValue({
            videoRef: { current: null },
            analysis: null,
            phase: 'error',
            errorMessage:
                'MediaPipe monitoring could not start for this attempt. Existing browser security monitoring remains active.',
            activeIncident: null,
            dismissIncident: vi.fn(),
            isEnabled: true,
        });

        render(<StudentExamAttemptPage />);

        expect(
            screen.getByText(/existing browser security monitoring remains active/i),
        ).toBeTruthy();
        expect(screen.getByText(/mediapipe error/i)).toBeTruthy();
        expect(screen.getByRole('button', { name: /answer 4/i })).toBeTruthy();
    });

    it('starts result navigation before exiting fullscreen on turn in', async () => {
        vi.useFakeTimers();
        const mockExitFullscreen = vi.fn().mockResolvedValue(undefined);
        const mockSuspendSecurityMonitoring = vi.fn(() => true);

        Object.defineProperty(document, 'fullscreenElement', {
            value: document.documentElement,
            configurable: true,
        });
        Object.defineProperty(document, 'exitFullscreen', {
            value: mockExitFullscreen,
            configurable: true,
        });
        mockExamMonitoring.mockReturnValue({
            securityLockReason: null,
            isResumingExam: false,
            resumeSecuredExam: vi.fn(),
            fullScreenContainerRef: { current: null },
            suspendSecurityMonitoring: mockSuspendSecurityMonitoring,
        });
        mockExamSession.mockReturnValue({
            examSession: {
                sessionId: '22222222-2222-4222-8222-222222222223',
                configSnapshot: null,
            },
            isInitializingSession: false,
            elapsedSeconds: 120,
            secondsRemaining: 1800,
            saveAnswerDraft: vi.fn(),
            syncProgress: vi.fn(),
        });

        render(<StudentExamAttemptPage />);

        fireEvent.click(screen.getByRole('button', { name: /answer 4/i }));
        fireEvent.click(screen.getByRole('button', { name: /turn in exam/i }));

        expect(mockSuspendSecurityMonitoring).toHaveBeenCalled();
        await act(async () => {
            await Promise.resolve();
        });
        expect(mockRouterReplace).toHaveBeenCalledWith(
            '/student/exam/11111111-1111-1111-1111-111111111111/result',
        );
        expect(mockExitFullscreen).not.toHaveBeenCalled();

        act(() => {
            vi.runOnlyPendingTimers();
        });

        expect(mockExitFullscreen).toHaveBeenCalled();
        expect(mockRouterReplace.mock.invocationCallOrder[0]).toBeLessThan(
            mockExitFullscreen.mock.invocationCallOrder[0],
        );
    });

    it('keeps the turn-in flow free of fullscreen lock side effects when fullscreenchange fires immediately', async () => {
        vi.useFakeTimers();
        const mockExitFullscreen = vi.fn().mockResolvedValue(undefined);
        const mockSuspendSecurityMonitoring = vi.fn(() => true);

        Object.defineProperty(document, 'fullscreenElement', {
            value: document.documentElement,
            configurable: true,
        });
        Object.defineProperty(document, 'exitFullscreen', {
            value: mockExitFullscreen,
            configurable: true,
        });
        mockExamMonitoring.mockReturnValue({
            securityLockReason: null,
            isResumingExam: false,
            resumeSecuredExam: vi.fn(),
            fullScreenContainerRef: { current: null },
            suspendSecurityMonitoring: mockSuspendSecurityMonitoring,
        });

        render(<StudentExamAttemptPage />);

        fireEvent.click(screen.getByRole('button', { name: /answer 4/i }));
        fireEvent.click(screen.getByRole('button', { name: /turn in exam/i }));
        act(() => {
            document.dispatchEvent(new Event('fullscreenchange'));
        });

        expect(mockSuspendSecurityMonitoring).toHaveBeenCalledTimes(1);
        await act(async () => {
            await Promise.resolve();
        });
        expect(mockRouterReplace).toHaveBeenCalledWith(
            '/student/exam/11111111-1111-1111-1111-111111111111/result',
        );
        expect(screen.queryByText(/return to the secured exam view/i)).toBeNull();
        expect(screen.queryByText(/loading\.\.\./i)).toBeNull();

        act(() => {
            vi.runOnlyPendingTimers();
        });

        expect(mockExitFullscreen).toHaveBeenCalledTimes(1);
    });

    it('displays the security lock overlay when a monitoring violation occurs', () => {
        // Mock a focus-loss lock state
        mockExamMonitoring.mockReturnValue({
            securityLockReason: 'focus-loss',
            isResumingExam: false,
            resumeSecuredExam: vi.fn(),
            fullScreenContainerRef: { current: null },
            suspendSecurityMonitoring: vi.fn(() => true),
        });

        render(<StudentExamAttemptPage />);

        // The text for focus-loss comes from ExamAttemptRuntimeSecurity
        expect(screen.getByText(/return to the secured exam view/i)).toBeTruthy();
        expect(screen.getByText(/resume exam/i)).toBeTruthy();
    });

    it('removes the security lock overlay and allows interaction after clicking resume', () => {
        const resumeSecuredExam = vi.fn();
        mockExamMonitoring.mockReturnValue({
            securityLockReason: 'focus-loss',
            isResumingExam: false,
            resumeSecuredExam,
            fullScreenContainerRef: { current: null },
            suspendSecurityMonitoring: vi.fn(() => true),
        });

        render(<StudentExamAttemptPage />);

        const resumeButton = screen.getByRole('button', { name: /resume exam/i });
        fireEvent.click(resumeButton);

        expect(resumeSecuredExam).toHaveBeenCalled();
    });

    it('sets monitoringPhase correctly when redirecting to result/turn in', () => {
        render(<StudentExamAttemptPage />);

        // Initially monitoringPhase is active
        expect(mockExamMonitoring).toHaveBeenCalledWith(
            expect.objectContaining({
                monitoringPhase: 'active',
            }),
        );

        // Turn in the exam
        fireEvent.click(screen.getByRole('button', { name: /answer 4/i }));
        fireEvent.click(screen.getByRole('button', { name: /turn in exam/i }));

        // It should call useExamMonitoring with phase 'submitting'
        expect(mockExamMonitoring).toHaveBeenLastCalledWith(
            expect.objectContaining({
                monitoringPhase: 'submitting',
            }),
        );
    });

    it('shows a recoverable audio warning when stream recovery fails', () => {
        mockUseAudioAnomalyWorker.mockReturnValue({
            errorMessage: 'No live audio tracks available.',
            isEnabled: true,
            phase: 'error',
        });

        render(<StudentExamAttemptPage />);

        expect(screen.getByText(/no live audio tracks available/i)).toBeTruthy();
    });

    it('covers active monitoring, browser lock, audio state, gaze incident, submission, and teardown in one regression flow', async () => {
        vi.useFakeTimers();
        const mockExitFullscreen = vi.fn().mockResolvedValue(undefined);
        const mockSuspendSecurityMonitoring = vi.fn(() => true);
        const dismissMediaPipeIncident = vi.fn();

        Object.defineProperty(document, 'fullscreenElement', {
            value: document.documentElement,
            configurable: true,
        });
        Object.defineProperty(document, 'exitFullscreen', {
            value: mockExitFullscreen,
            configurable: true,
        });

        let monitoringState = {
            securityLockReason: null as string | null,
            isResumingExam: false,
            resumeSecuredExam: vi.fn(),
            fullScreenContainerRef: { current: null },
            suspendSecurityMonitoring: mockSuspendSecurityMonitoring,
        };
        let mediaPipeState = {
            videoRef: { current: null },
            analysis: {
                status: 'off-screen',
            },
            phase: 'running' as const,
            errorMessage: null as string | null,
            activeIncident: null as unknown as unknown,
            dismissIncident: dismissMediaPipeIncident,
            isEnabled: true,
        };

        mockExamMonitoring.mockImplementation(() => monitoringState);
        mockAttemptMediaPipeMonitoring.mockImplementation(() => mediaPipeState);
        mockExamSession.mockReturnValue({
            examSession: {
                sessionId: '22222222-2222-4222-8222-222222222224',
                configSnapshot: null,
            },
            isInitializingSession: false,
            elapsedSeconds: 120,
            secondsRemaining: 1800,
            saveAnswerDraft: vi.fn(),
            syncProgress: vi.fn(),
        });

        mockUseAudioAnomalyWorker.mockReturnValue({
            errorMessage: null,
            isEnabled: true,
            phase: 'running',
        });

        const { rerender } = render(<StudentExamAttemptPage />);

        expect(screen.getByText(/mediapipe off-screen/i)).toBeTruthy();
        expect(screen.getByText(/audio running/i)).toBeTruthy();
        expect(screen.queryByText(/multiple faces detected/i)).toBeNull();

        monitoringState = {
            ...monitoringState,
            securityLockReason: 'right-click',
        };
        mediaPipeState = {
            ...mediaPipeState,
            activeIncident: {
                eventType: 'GAZE_OFF_SCREEN',
                detectedAt: '2026-07-11T08:00:00.000Z',
                analysis: {
                    status: 'off-screen',
                    signal: 'GAZE_OFF_SCREEN',
                    faceCount: 1,
                    confidenceScore: 0.81,
                    gazeDirection: 'left',
                    eyeState: 'open',
                    faceBounds: null,
                    reasons: ['Eye tracking indicates the student is looking away from center.'],
                },
            },
        };
        rerender(<StudentExamAttemptPage />);

        expect(screen.getByText(/return to the secured exam view/i)).toBeTruthy();
        expect(screen.getByText(/eyes off screen detected/i)).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: /resume exam/i }));

        monitoringState = {
            ...monitoringState,
            securityLockReason: null,
        };
        mediaPipeState = {
            ...mediaPipeState,
            activeIncident: null,
        };
        rerender(<StudentExamAttemptPage />);

        fireEvent.click(screen.getByRole('button', { name: /answer 4/i }));
        fireEvent.click(screen.getByRole('button', { name: /turn in exam/i }));

        expect(mockSuspendSecurityMonitoring).toHaveBeenCalledTimes(1);
        await act(async () => {
            await Promise.resolve();
        });
        expect(mockRouterReplace).toHaveBeenCalledWith(
            '/student/exam/11111111-1111-1111-1111-111111111111/result',
        );
        expect(screen.queryByText(/return to the secured exam view/i)).toBeNull();

        act(() => {
            document.dispatchEvent(new Event('fullscreenchange'));
            vi.runOnlyPendingTimers();
        });

        expect(mockExitFullscreen).toHaveBeenCalledTimes(1);
        expect(mockRouterReplace.mock.invocationCallOrder[0]).toBeLessThan(
            mockExitFullscreen.mock.invocationCallOrder[0],
        );
    });

    it('invokes the mocked security, MediaPipe, and audio monitoring integrations once rather than twice', () => {
        render(<StudentExamAttemptPage />);
        expect(mockExamMonitoring).toHaveBeenCalledTimes(1);
        expect(mockAttemptMediaPipeMonitoring).toHaveBeenCalledTimes(1);
        expect(mockUseAudioAnomalyWorker).toHaveBeenCalledTimes(1);
    });

    it('verifies the single monitoring owner calls suspendSecurityMonitoring() once before the turn-in transition and does not produce a fullscreen lock from another instance', () => {
        const mockSuspendSecurityMonitoring = vi.fn(() => true);
        mockExamMonitoring.mockReturnValue({
            securityLockReason: null,
            isResumingExam: false,
            resumeSecuredExam: vi.fn(),
            fullScreenContainerRef: { current: null },
            suspendSecurityMonitoring: mockSuspendSecurityMonitoring,
        });

        render(<StudentExamAttemptPage />);

        fireEvent.click(screen.getByRole('button', { name: /answer 4/i }));
        fireEvent.click(screen.getByRole('button', { name: /turn in exam/i }));

        expect(mockSuspendSecurityMonitoring).toHaveBeenCalledTimes(1);
    });
});
