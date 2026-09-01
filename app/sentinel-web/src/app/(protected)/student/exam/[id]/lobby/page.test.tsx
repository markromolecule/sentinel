'use client';

import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import StudentExamLobbyPage from './page';

const { mockLobbyCountQuery, mockLobbyPresence, mockStudentExamData, mockLobbyState } = vi.hoisted(
    () => ({
        mockLobbyCountQuery: vi.fn(),
        mockLobbyPresence: vi.fn(),
        mockStudentExamData: vi.fn(),
        mockLobbyState: vi.fn(),
    }),
);

vi.mock('@sentinel/hooks', () => ({
    useExamLobbyCountQuery: (examId: string) => mockLobbyCountQuery(examId),
}));

vi.mock('../_components/student-exam-loading-state', () => ({
    StudentExamLoadingState: () => <div>Loading...</div>,
}));

vi.mock('../_components/student-flow-shell', () => ({
    StudentFlowShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('../_components/monitoring-preloader', () => ({
    MonitoringPreloader: () => null,
}));

vi.mock('../_hooks/use-student-exam-stage-guard', () => ({
    useStudentExamStageGuard: () => {
        const data = mockStudentExamData();
        return {
            ...data,
            isResolving: data?.isLoading ?? false,
            resolution: {
                targetStage: 'lobby',
                reasonCode: 'AUTOMATIC_ADMISSION',
                shouldRedirect: false,
            },
            storedFlow: { privacyAccepted: true, checkupCompleted: true },
        };
    },
}));

vi.mock('../_hooks/use-turned-in-exam-redirect', () => ({
    useTurnedInExamRedirect: () => false,
}));

vi.mock('./_hooks/use-lobby-presence', () => ({
    useLobbyPresence: (examId: string) => mockLobbyPresence(examId),
}));

vi.mock('./_hooks/use-lobby-state', () => ({
    useLobbyState: () => mockLobbyState(),
}));

describe('StudentExamLobbyPage', () => {
    afterEach(() => {
        cleanup();
    });

    beforeEach(() => {
        vi.clearAllMocks();

        mockStudentExamData.mockReturnValue({
            examId: 'exam-1',
            blockedState: {
                isBlocked: false,
                message: null,
            },
            exam: {
                duration: 60,
                runtimeAccess: {
                    state: 'lobby_waiting',
                    reasonCode: 'LOBBY_WAITING',
                    message: 'Waiting for approval.',
                    canStart: false,
                    canResume: false,
                    hasActiveAttempt: false,
                    reconnectAttemptsRemaining: 2,
                    totalReconnectAttempts: 3,
                },
            },
            configuration: {
                maxReconnectAttempts: 3,
            },
            mediaPipeSandbox: null,
            refetchExam: vi.fn(),
            isLoading: false,
        });
        mockLobbyState.mockImplementation(() => ({
            countdownLabel: '00:10:00',
            hasCompletedFlow: true,
            runtimeAccess: {
                state: 'lobby_waiting',
                reasonCode: 'LOBBY_WAITING',
                message: 'Waiting for approval.',
                canStart: false,
                canResume: false,
                hasActiveAttempt: false,
                reconnectAttemptsRemaining: 2,
                totalReconnectAttempts: 3,
            },
            canEnterExam: false,
            reopenedUntil: null,
            storedSession: null,
            mediaPipeLobbyMessage: null,
            admissionStatus: 'WAITING',
            presenceCount: mockLobbyPresence()?.presenceCount ?? 0,
            isStartingSession: false,
            isAdmissionPendingRefresh: false,
            handleEnterExam: vi.fn(),
        }));
    });

    it('uses the higher count between API and presence and shows reconnect used versus remaining', () => {
        const refetch = vi.fn();
        mockLobbyCountQuery.mockReturnValue({
            data: { count: 3 },
            isLoading: false,
            refetch,
        });
        mockLobbyPresence.mockReturnValue({
            presenceCount: 7,
        });

        render(<StudentExamLobbyPage />);

        expect(screen.getByText('7 students')).toBeTruthy();
        expect(screen.queryByText('3 students')).toBeNull();
        expect(screen.getByText('1 used • 2 left')).toBeTruthy();
        expect(screen.getByText('Reconnect attempts used: 1 of 3. Remaining: 2.')).toBeTruthy();
        expect(
            screen.getByRole('button', { name: /waiting for approval/i }).hasAttribute('disabled'),
        ).toBe(true);
    });

    it('prefers higher API count over presence count', () => {
        mockLobbyCountQuery.mockReturnValue({
            data: { count: 8 },
            isLoading: false,
            refetch: vi.fn(),
        });
        mockLobbyPresence.mockReturnValue({
            presenceCount: 2,
        });

        render(<StudentExamLobbyPage />);

        expect(screen.getByText('8 students')).toBeTruthy();
        expect(screen.queryByText('2 students')).toBeNull();
    });

    it('falls back to presence only when the API count is unavailable', () => {
        mockLobbyCountQuery.mockReturnValue({
            data: undefined,
            isLoading: false,
            refetch: vi.fn(),
        });
        mockLobbyPresence.mockReturnValue({
            presenceCount: 4,
        });

        render(<StudentExamLobbyPage />);

        expect(screen.getByText('4 students')).toBeTruthy();
    });

    it('uses presence count immediately while the API count is still loading', () => {
        mockLobbyCountQuery.mockReturnValue({
            data: undefined,
            isLoading: true,
            refetch: vi.fn(),
        });
        mockLobbyPresence.mockReturnValue({
            presenceCount: 5,
        });

        render(<StudentExamLobbyPage />);

        expect(screen.getByText('5 students')).toBeTruthy();
        expect(screen.queryByText('Syncing')).toBeNull();
    });

    it('shows a syncing count fallback when neither API nor presence count is available', () => {
        mockLobbyCountQuery.mockReturnValue({
            data: undefined,
            isLoading: true,
            refetch: vi.fn(),
        });
        mockLobbyPresence.mockReturnValue({
            presenceCount: 0,
        });

        render(<StudentExamLobbyPage />);

        expect(screen.getByText('Syncing')).toBeTruthy();
    });

    it('falls back to configured reconnect policy when runtime access has placeholder zero values', () => {
        mockLobbyCountQuery.mockReturnValue({
            data: { count: 2 },
            isError: false,
            refetch: vi.fn(),
        });
        mockLobbyPresence.mockReturnValue({
            presenceCount: 2,
        });
        mockLobbyState.mockReturnValue({
            countdownLabel: '00:10:00',
            hasCompletedFlow: true,
            runtimeAccess: {
                state: 'lobby_waiting',
                reasonCode: 'LOBBY_WAITING',
                message: 'Waiting for approval.',
                canStart: false,
                canResume: false,
                hasActiveAttempt: false,
                reconnectAttemptsRemaining: 0,
                totalReconnectAttempts: 0,
            },
            canEnterExam: false,
            reopenedUntil: null,
            storedSession: null,
            mediaPipeLobbyMessage: null,
            admissionStatus: 'WAITING',
            isStartingSession: false,
            isAdmissionPendingRefresh: false,
            handleEnterExam: vi.fn(),
        });

        render(<StudentExamLobbyPage />);

        expect(screen.getByText('0 used • 3 left')).toBeTruthy();
        expect(screen.getByText('Reconnect attempts used: 0 of 3. Remaining: 3.')).toBeTruthy();
        expect(screen.queryByText('0 used • 0 left')).toBeNull();
        expect(screen.queryByText('Reconnect attempts used: 0 of 0. Remaining: 0.')).toBeNull();
    });

    it('enables continue when runtime access allows entry', () => {
        mockLobbyCountQuery.mockReturnValue({
            data: { count: 2 },
            isError: false,
            refetch: vi.fn(),
        });
        mockLobbyPresence.mockReturnValue({
            presenceCount: 2,
        });
        mockLobbyState.mockReturnValue({
            countdownLabel: '00:10:00',
            hasCompletedFlow: true,
            runtimeAccess: {
                state: 'lobby_approved',
                reasonCode: 'LOBBY_APPROVED',
                message: 'Approved for entry.',
                canStart: true,
                canResume: false,
                hasActiveAttempt: false,
                reconnectAttemptsRemaining: 2,
                totalReconnectAttempts: 3,
            },
            canEnterExam: true,
            reopenedUntil: null,
            storedSession: null,
            mediaPipeLobbyMessage: null,
            admissionStatus: 'APPROVED',
            isStartingSession: false,
            isAdmissionPendingRefresh: false,
            handleEnterExam: vi.fn(),
        });

        render(<StudentExamLobbyPage />);

        expect(
            screen.getByRole('button', { name: /continue to attempt/i }).hasAttribute('disabled'),
        ).toBe(false);
    });

    it('keeps continue enabled when approved admission outruns stale lobby runtime access', () => {
        mockLobbyCountQuery.mockReturnValue({
            data: { count: 2 },
            isError: false,
            refetch: vi.fn(),
        });
        mockLobbyPresence.mockReturnValue({
            presenceCount: 2,
        });
        mockLobbyState.mockReturnValue({
            countdownLabel: '00:10:00',
            hasCompletedFlow: true,
            runtimeAccess: {
                state: 'lobby_waiting',
                reasonCode: 'LOBBY_WAITING',
                message: 'Waiting for approval.',
                canStart: false,
                canResume: false,
                hasActiveAttempt: false,
                reconnectAttemptsRemaining: 2,
                totalReconnectAttempts: 3,
            },
            canEnterExam: true,
            reopenedUntil: null,
            storedSession: null,
            mediaPipeLobbyMessage: null,
            admissionStatus: 'APPROVED',
            isStartingSession: false,
            isAdmissionPendingRefresh: true,
            handleEnterExam: vi.fn(),
        });

        render(<StudentExamLobbyPage />);

        expect(
            screen.getByRole('button', { name: /continue to attempt/i }).hasAttribute('disabled'),
        ).toBe(false);
    });

    it('keeps the primary action disabled when admission is waiting despite stale start access', () => {
        mockLobbyCountQuery.mockReturnValue({
            data: { count: 2 },
            isError: false,
            refetch: vi.fn(),
        });
        mockLobbyPresence.mockReturnValue({
            presenceCount: 2,
        });
        mockLobbyState.mockReturnValue({
            countdownLabel: '00:10:00',
            hasCompletedFlow: true,
            runtimeAccess: {
                state: 'open',
                reasonCode: 'OPEN',
                message: 'Exam is open.',
                canStart: true,
                canResume: false,
                hasActiveAttempt: false,
                reconnectAttemptsRemaining: 2,
                totalReconnectAttempts: 3,
            },
            canEnterExam: true,
            reopenedUntil: null,
            storedSession: null,
            mediaPipeLobbyMessage: null,
            admissionStatus: 'WAITING',
            isStartingSession: false,
            isAdmissionPendingRefresh: false,
            handleEnterExam: vi.fn(),
        });

        render(<StudentExamLobbyPage />);

        expect(
            screen.getByRole('button', { name: /waiting for approval/i }).hasAttribute('disabled'),
        ).toBe(true);
        expect(screen.queryByRole('button', { name: /continue to attempt/i })).toBeNull();
    });

    it('keeps the primary action disabled for exhausted reconnects waiting in the lobby', () => {
        mockLobbyCountQuery.mockReturnValue({
            data: { count: 2 },
            isError: false,
            refetch: vi.fn(),
        });
        mockLobbyPresence.mockReturnValue({
            presenceCount: 2,
        });
        mockLobbyState.mockReturnValue({
            countdownLabel: '00:10:00',
            hasCompletedFlow: true,
            runtimeAccess: {
                state: 'open',
                reasonCode: 'OPEN',
                message: 'Reconnect limit reached.',
                canStart: true,
                canResume: false,
                hasActiveAttempt: true,
                reconnectAttemptsRemaining: 0,
                totalReconnectAttempts: 3,
            },
            canEnterExam: false,
            reopenedUntil: null,
            storedSession: null,
            mediaPipeLobbyMessage: null,
            admissionStatus: 'WAITING',
            isStartingSession: false,
            isAdmissionPendingRefresh: false,
            handleEnterExam: vi.fn(),
        });

        render(<StudentExamLobbyPage />);

        expect(
            screen.getByRole('button', { name: /waiting for approval/i }).hasAttribute('disabled'),
        ).toBe(true);
    });

    it('shows the lifecycle block message when a locked attempt reaches the lobby shell', () => {
        mockLobbyCountQuery.mockReturnValue({
            data: { count: 1 },
            isError: false,
            refetch: vi.fn(),
        });
        mockLobbyPresence.mockReturnValue({
            presenceCount: 1,
        });
        mockStudentExamData.mockReturnValue({
            examId: 'exam-1',
            blockedState: {
                isBlocked: true,
                message: 'This exam attempt is locked right now.',
            },
            exam: {
                duration: 60,
                runtimeAccess: {
                    state: 'locked',
                    reasonCode: 'LOCKED',
                    message: 'Stale message',
                    canStart: false,
                    canResume: false,
                    hasActiveAttempt: true,
                },
            },
            configuration: {
                maxReconnectAttempts: 3,
            },
            mediaPipeSandbox: null,
            refetchExam: vi.fn(),
            isLoading: false,
        });
        mockLobbyState.mockReturnValue({
            countdownLabel: '00:10:00',
            hasCompletedFlow: true,
            runtimeAccess: {
                state: 'locked',
                reasonCode: 'LOCKED',
                message: 'Stale message',
                canStart: false,
                canResume: false,
                hasActiveAttempt: true,
                reconnectAttemptsRemaining: 2,
                totalReconnectAttempts: 3,
            },
            canEnterExam: false,
            reopenedUntil: null,
            storedSession: null,
            mediaPipeLobbyMessage: null,
            admissionStatus: null,
            isStartingSession: false,
            isAdmissionPendingRefresh: false,
            handleEnterExam: vi.fn(),
        });

        render(<StudentExamLobbyPage />);

        expect(screen.getByText('This exam attempt is locked right now.')).toBeTruthy();
        expect(screen.queryByRole('button', { name: /continue to attempt/i })).toBeNull();
    });
});
