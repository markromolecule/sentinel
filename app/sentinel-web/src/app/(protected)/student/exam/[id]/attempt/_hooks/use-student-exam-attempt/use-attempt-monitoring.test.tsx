import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_AUDIO_ANOMALY_CONFIG } from '@sentinel/shared';
import { useAttemptMonitoring } from './use-attempt-monitoring';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: mockPush,
    }),
}));

const {
    mockEnsureAudioAccess,
    mockStopAudioStream,
    mockStopStream,
    mockSuspendSecurityMonitoring,
    mockUseAudioAnomalyWorker,
} = vi.hoisted(() => ({
    mockEnsureAudioAccess: vi.fn().mockResolvedValue(undefined),
    mockStopAudioStream: vi.fn(),
    mockStopStream: vi.fn(),
    mockSuspendSecurityMonitoring: vi.fn(),
    mockUseAudioAnomalyWorker: vi.fn(),
}));

vi.mock('@/app/(protected)/student/exam/[id]/_components/student-exam-audio-provider', () => ({
    useCheckupAudio: () => ({
        audioStream: null,
        worker: null,
        ensureAudioAccess: mockEnsureAudioAccess,
        stopAudioStream: mockStopAudioStream,
    }),
}));

vi.mock('@/app/(protected)/student/exam/[id]/_components/student-exam-mediapipe-provider', () => ({
    useStudentExamMediaPipeStream: () => ({
        stopStream: mockStopStream,
    }),
}));

vi.mock('@/app/(protected)/student/exam/[id]/_hooks/use-exam-monitoring', () => ({
    useExamMonitoring: () => ({
        securityLockReason: null,
        isResumingExam: false,
        resumeSecuredExam: vi.fn(),
        fullScreenContainerRef: { current: null },
        suspendSecurityMonitoring: mockSuspendSecurityMonitoring,
    }),
}));

vi.mock('@/app/(protected)/student/exam/[id]/_hooks/use-attempt-mediapipe-monitoring', () => ({
    useAttemptMediaPipeMonitoring: () => ({
        videoRef: { current: null },
        analysis: null,
        phase: 'idle',
        errorMessage: null,
        activeIncident: null,
        dismissIncident: vi.fn(),
        isEnabled: false,
    }),
}));

vi.mock('@/hooks/use-audio-anomaly-worker', () => ({
    useAudioAnomalyWorker: (args: unknown) => mockUseAudioAnomalyWorker(args),
}));

describe('useAttemptMonitoring', () => {
    beforeEach(() => {
        cleanup();
        vi.clearAllMocks();
        mockUseAudioAnomalyWorker.mockReturnValue({
            errorMessage: null,
            isEnabled: false,
            phase: 'idle',
        });
        mockSuspendSecurityMonitoring.mockReturnValue(true);
    });

    it('invokes ensureAudioAccess when mic is required', async () => {
        const configuration = {
            micRequired: true,
            aiRules: {
                audio_anomaly_detection: false,
            },
        } as any;

        renderHook(() =>
            useAttemptMonitoring({
                examId: 'exam-1',
                configuration,
                isRedirectingToTurnIn: false,
            }),
        );

        await waitFor(() => {
            expect(mockEnsureAudioAccess).toHaveBeenCalledWith(configuration);
        });
    });

    it('invokes ensureAudioAccess when audio anomaly detection is enabled', async () => {
        const configuration = {
            micRequired: false,
            aiRules: {
                audio_anomaly_detection: true,
            },
        } as any;

        renderHook(() =>
            useAttemptMonitoring({
                examId: 'exam-1',
                configuration,
                isRedirectingToTurnIn: false,
            }),
        );

        await waitFor(() => {
            expect(mockEnsureAudioAccess).toHaveBeenCalledWith(configuration);
        });
    });

    it('does not invoke ensureAudioAccess when redirection to turn-in is active', async () => {
        const configuration = {
            micRequired: true,
            aiRules: {
                audio_anomaly_detection: true,
            },
        } as any;

        renderHook(() =>
            useAttemptMonitoring({
                examId: 'exam-1',
                configuration,
                isRedirectingToTurnIn: true,
            }),
        );

        await new Promise((resolve) => setTimeout(resolve, 100));
        expect(mockEnsureAudioAccess).not.toHaveBeenCalled();
    });

    it('passes through a null runtime config while audio settings are still loading', () => {
        const configuration = {
            micRequired: false,
            aiRules: {
                audio_anomaly_detection: true,
            },
        } as any;

        renderHook(() =>
            useAttemptMonitoring({
                examId: 'exam-1',
                configuration,
                audioSettings: null,
                examSessionId: 'session-1',
                isRedirectingToTurnIn: false,
            }),
        );

        expect(mockUseAudioAnomalyWorker).toHaveBeenCalledWith(
            expect.objectContaining({
                runtimeConfig: null,
            }),
        );
    });

    it('passes the persisted runtime config into the audio worker when settings are available', () => {
        const configuration = {
            micRequired: false,
            aiRules: {
                audio_anomaly_detection: true,
            },
        } as any;

        renderHook(() =>
            useAttemptMonitoring({
                examId: 'exam-1',
                configuration,
                audioSettings: DEFAULT_AUDIO_ANOMALY_CONFIG,
                examSessionId: 'session-1',
                isRedirectingToTurnIn: false,
            }),
        );

        expect(mockUseAudioAnomalyWorker).toHaveBeenCalledWith(
            expect.objectContaining({
                runtimeConfig: DEFAULT_AUDIO_ANOMALY_CONFIG,
            }),
        );
    });

    it('stops browser, audio, and MediaPipe monitoring exactly once for terminal attempts', () => {
        const configuration = {
            micRequired: true,
            aiRules: {
                audio_anomaly_detection: true,
            },
        } as any;

        const { rerender } = renderHook(
            ({ isTerminalAttempt }) =>
                useAttemptMonitoring({
                    examId: 'exam-1',
                    configuration,
                    isRedirectingToTurnIn: false,
                    isTerminalAttempt,
                }),
            {
                initialProps: { isTerminalAttempt: true },
            },
        );

        rerender({ isTerminalAttempt: true });

        expect(mockSuspendSecurityMonitoring).toHaveBeenCalledTimes(1);
        expect(mockStopAudioStream).toHaveBeenCalledTimes(1);
        expect(mockStopStream).toHaveBeenCalledTimes(1);
        expect(mockEnsureAudioAccess).not.toHaveBeenCalled();
        expect(mockUseAudioAnomalyWorker).toHaveBeenCalledWith(
            expect.objectContaining({
                isSuspended: true,
            }),
        );
    });
});
