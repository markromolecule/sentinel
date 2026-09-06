import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useExamSessionSync } from './use-exam-session-sync';

let effectCallbacks: Array<() => void | (() => void)> = [];

vi.mock('react', () => ({
    useEffect: (callback: () => void | (() => void)) => {
        effectCallbacks.push(callback);
    },
    useCallback: (fn: any) => fn,
    useRef: (initial: any) => ({ current: initial }),
}));

vi.mock('@sentinel/hooks', () => ({
    useAuth: () => ({
        supabase: null,
        session: { user: { id: 'student-mobile-1' } },
    }),
}));

vi.mock('@sentinel/services', () => ({
    syncExamProgress: vi.fn().mockResolvedValue(undefined),
}));

describe('useExamSessionSync', () => {
    beforeEach(() => {
        effectCallbacks = [];
        vi.clearAllMocks();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('broadcasts student:progress on answer change when monitoring channel is active', () => {
        const mockMonitoringChannel = {
            send: vi.fn(),
        };

        const answersRef = { current: { 'q-1': 'A', 'q-2': 'B' } };
        const questions: any[] = [
            { id: 'q-1', text: 'Q1' },
            { id: 'q-2', text: 'Q2' },
            { id: 'q-3', text: 'Q3' },
            { id: 'q-4', text: 'Q4' },
        ];

        useExamSessionSync({
            apiClient: {} as any,
            exam: { id: 'exam-1', duration: 60 } as any,
            sessionId: 'session-1',
            questions,
            answers: answersRef.current,
            answersRef,
            timeLeftRef: { current: 3600 },
            monitoringChannel: mockMonitoringChannel,
            studentId: 'student-mobile-1',
        });

        // Run the answer change effect
        effectCallbacks.forEach((cb) => cb());

        expect(mockMonitoringChannel.send).toHaveBeenCalledWith({
            type: 'broadcast',
            event: 'student:progress',
            payload: {
                studentId: 'student-mobile-1',
                answeredCount: 2,
                totalQuestions: 4,
                progress: 50,
            },
        });
    });

    it('broadcasts student:submitted on broadcastSubmitted() call', () => {
        const mockMonitoringChannel = {
            send: vi.fn(),
        };

        const { broadcastSubmitted } = useExamSessionSync({
            apiClient: {} as any,
            exam: { id: 'exam-1', duration: 60 } as any,
            sessionId: 'session-1',
            questions: [],
            answers: {},
            answersRef: { current: {} },
            timeLeftRef: { current: 3600 },
            monitoringChannel: mockMonitoringChannel,
            studentId: 'student-mobile-1',
        });

        broadcastSubmitted();

        expect(mockMonitoringChannel.send).toHaveBeenCalledWith({
            type: 'broadcast',
            event: 'student:submitted',
            payload: {
                studentId: 'student-mobile-1',
                submittedAt: expect.any(String),
            },
        });
    });
});
