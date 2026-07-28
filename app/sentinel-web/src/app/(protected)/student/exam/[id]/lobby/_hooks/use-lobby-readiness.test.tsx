import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useLobbyReadiness } from './use-lobby-readiness';

const { mockReadStoredStudentExamFlow, mockUseStudentExamMediaPipeStream, mockUseCheckupAudio } =
    vi.hoisted(() => ({
        mockReadStoredStudentExamFlow: vi.fn(),
        mockUseStudentExamMediaPipeStream: vi.fn(),
        mockUseCheckupAudio: vi.fn(),
    }));

vi.mock('../../_lib/student-exam-flow', () => ({
    readStoredStudentExamFlow: (examId: string) => mockReadStoredStudentExamFlow(examId),
}));

vi.mock(
    '@/app/(protected)/student/exam/[id]/_components/student-exam-mediapipe-provider',
    () => ({
        useStudentExamMediaPipeStream: () => mockUseStudentExamMediaPipeStream(),
    }),
);

vi.mock('@/app/(protected)/student/exam/[id]/_components/student-exam-audio-provider', () => ({
    useCheckupAudio: () => mockUseCheckupAudio(),
}));

describe('useLobbyReadiness', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockReadStoredStudentExamFlow.mockReturnValue({
            privacyAccepted: true,
            checkupCompleted: true,
            mediaPipeActivatedAt: '2026-07-28T03:00:00.000Z',
            mediaPipeCalibrationCompletedAt: '2026-07-28T03:00:00.000Z',
            mediaPipeActivationSource: 'checkup',
            mediaPipeCalibrationProfile: null,
        });
        mockUseStudentExamMediaPipeStream.mockReturnValue({
            isCameraReady: () => false,
            isLandmarkerReady: () => false,
        });
        mockUseCheckupAudio.mockReturnValue({
            isAudioReady: () => false,
        });
    });

    it('keeps reconnecting active attempts ready even when live lobby device checks transiently reset', () => {
        const { result } = renderHook(() =>
            useLobbyReadiness({
                examId: 'exam-1',
                isMediaPipeValid: false,
                configuration: {
                    lobbyAdmissionMode: 'INSTRUCTOR_GATED',
                } as never,
                runtimeAccess: {
                    state: 'open',
                    reasonCode: 'OPEN',
                    message: 'Resume your exam.',
                    canStart: false,
                    canResume: true,
                    hasActiveAttempt: true,
                    startsAt: null,
                    endsAt: null,
                    reopenedUntil: null,
                },
            }),
        );

        expect(result.current.hasCompletedFlow).toBe(true);
    });

    it('still requires live readiness for non-reconnect lobby entry', () => {
        const { result } = renderHook(() =>
            useLobbyReadiness({
                examId: 'exam-1',
                isMediaPipeValid: false,
                configuration: {
                    lobbyAdmissionMode: 'INSTRUCTOR_GATED',
                } as never,
                runtimeAccess: {
                    state: 'lobby_approved',
                    reasonCode: 'LOBBY_APPROVED',
                    message: 'Approved for entry.',
                    canStart: true,
                    canResume: false,
                    hasActiveAttempt: false,
                    startsAt: null,
                    endsAt: null,
                    reopenedUntil: null,
                },
            }),
        );

        expect(result.current.hasCompletedFlow).toBe(false);
    });
});
