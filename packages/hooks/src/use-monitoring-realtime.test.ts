import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useMonitoringRealtime } from './use-monitoring-realtime';

const mockSubscribe = vi.fn();
const mockRemoveChannel = vi.fn();
const mockSend = vi.fn();
const mockChannelOn = vi.fn();

let eventHandlers: Record<string, (res: any) => void> = {};

const mockChannel = {
    on: mockChannelOn,
    subscribe: mockSubscribe,
    send: mockSend,
};

const mockSupabaseChannel = vi.fn(() => mockChannel);
const mockUseAuth = vi.fn(() => ({
    supabase: {
        channel: mockSupabaseChannel,
        removeChannel: mockRemoveChannel,
    },
    user: { id: 'user-1' },
}));

vi.mock('./auth-provider', () => ({
    useAuth: () => mockUseAuth(),
}));

describe('useMonitoringRealtime Hook', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        eventHandlers = {};
        mockChannelOn.mockImplementation((type: string, filter: { event: string }, callback: (res: any) => void) => {
            if (filter?.event) {
                eventHandlers[filter.event] = callback;
            }
            return mockChannel;
        });
    });

    it('subscribes to exam:${examId}:monitoring and registers listeners', () => {
        const examId = 'exam-123';
        const onProgressUpdate = vi.fn();
        const onStudentSubmitted = vi.fn();

        const { unmount } = renderHook(() =>
            useMonitoringRealtime({
                examId,
                onProgressUpdate,
                onStudentSubmitted,
            }),
        );

        expect(mockSupabaseChannel).toHaveBeenCalledWith(`exam:${examId}:monitoring`);
        expect(mockChannelOn).toHaveBeenCalledWith(
            'broadcast',
            { event: 'student:progress' },
            expect.any(Function),
        );
        expect(mockChannelOn).toHaveBeenCalledWith(
            'broadcast',
            { event: 'student:submitted' },
            expect.any(Function),
        );
        expect(mockSubscribe).toHaveBeenCalled();

        unmount();
        expect(mockRemoveChannel).toHaveBeenCalledWith(mockChannel);
    });

    it('dispatches student:progress broadcast payloads to onProgressUpdate callback', () => {
        const onProgressUpdate = vi.fn();
        renderHook(() =>
            useMonitoringRealtime({
                examId: 'exam-123',
                onProgressUpdate,
            }),
        );

        const payload = {
            studentId: 'student-99',
            answeredCount: 5,
            totalQuestions: 10,
            progress: 50,
        };

        act(() => {
            eventHandlers['student:progress']?.({ payload });
        });

        expect(onProgressUpdate).toHaveBeenCalledWith(payload);
    });

    it('dispatches student:submitted broadcast payloads to onStudentSubmitted callback', () => {
        const onStudentSubmitted = vi.fn();
        renderHook(() =>
            useMonitoringRealtime({
                examId: 'exam-123',
                onStudentSubmitted,
            }),
        );

        const payload = {
            studentId: 'student-99',
            submittedAt: '2026-09-06T12:00:00.000Z',
        };

        act(() => {
            eventHandlers['student:submitted']?.({ payload });
        });

        expect(onStudentSubmitted).toHaveBeenCalledWith(payload);
    });

    it('does not subscribe if enabled is false', () => {
        renderHook(() =>
            useMonitoringRealtime({
                examId: 'exam-123',
                enabled: false,
            }),
        );

        expect(mockSupabaseChannel).not.toHaveBeenCalled();
    });

    it('allows broadcasting student progress and submission through return functions', () => {
        const { result } = renderHook(() =>
            useMonitoringRealtime({
                examId: 'exam-123',
            }),
        );

        const progressPayload = {
            studentId: 'student-99',
            answeredCount: 8,
            totalQuestions: 10,
            progress: 80,
        };

        act(() => {
            result.current.broadcastProgress(progressPayload);
        });

        expect(mockSend).toHaveBeenCalledWith({
            type: 'broadcast',
            event: 'student:progress',
            payload: progressPayload,
        });

        const submittedPayload = {
            studentId: 'student-99',
            submittedAt: '2026-09-06T12:05:00.000Z',
        };

        act(() => {
            result.current.broadcastSubmitted(submittedPayload);
        });

        expect(mockSend).toHaveBeenCalledWith({
            type: 'broadcast',
            event: 'student:submitted',
            payload: submittedPayload,
        });
    });
});
