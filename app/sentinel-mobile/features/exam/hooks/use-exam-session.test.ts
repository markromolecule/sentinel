import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Alert } from 'react-native';
import {
    writeStoredMobileExamPreview,
    clearStoredMobileExamSession,
} from '@/features/exam/lib/mobile-exam-storage';

// ─── React state mocks ───
let stateValues: any[] = [];
let stateIndex = 0;
let effectCallbacks: Array<() => void | (() => void)> = [];

vi.mock('react', () => {
    return {
        useState: (initialValue: any) => {
            const currentIndex = stateIndex;
            if (stateValues[currentIndex] === undefined) {
                stateValues[currentIndex] = initialValue;
            }
            const value = stateValues[currentIndex];
            const setValue = (newValue: any) => {
                if (typeof newValue === 'function') {
                    stateValues[currentIndex] = newValue(stateValues[currentIndex]);
                } else {
                    stateValues[currentIndex] = newValue;
                }
            };
            stateIndex++;
            return [value, setValue];
        },
        useEffect: (callback: () => void | (() => void)) => {
            effectCallbacks.push(callback);
        },
        useCallback: (fn: any) => fn,
        useMemo: (fn: any) => fn(),
        useRef: (initial: any) => ({ current: initial }),
    };
});

// ─── React Native Mocks ───
vi.mock('react-native', () => ({
    Alert: {
        alert: vi.fn(),
    },
    AppState: {
        currentState: 'active',
        addEventListener: vi.fn(() => ({ remove: vi.fn() })),
    },
    Platform: {
        OS: 'ios',
        select: (obj: any) => obj.ios || obj.default,
    },
    TurboModuleRegistry: {
        get: vi.fn(),
        getEnforcing: vi.fn(),
    },
}));

vi.mock('@/features/exam/lib/mobile-telemetry-client', () => ({
    emitMobileTelemetryEvent: vi.fn().mockResolvedValue(undefined),
}));

const mockCompleteExamSession = vi.fn();
const mockSyncExamProgress = vi.fn().mockResolvedValue(undefined);

vi.mock('@sentinel/services', () => ({
    completeExamSession: (api: any, payload: any) => mockCompleteExamSession(api, payload),
    syncExamProgress: (api: any, payload: any) => mockSyncExamProgress(api, payload),
}));

vi.mock('@sentinel/hooks', () => ({
    useApi: () => ({}),
    useAuth: () => ({ user: { id: 'student-789' } }),
    useExamQuery: () => ({
        data: {
            id: 'exam-123',
            title: 'Math Final',
            duration: 60,
            passingScore: 50,
            questions: [
                { id: 'q1', content: { prompt: 'Q1' }, type: 'MULTIPLE_CHOICE', points: 1 },
            ],
        },
    }),
}));

vi.mock('@/features/exam/lib/mobile-exam-storage', () => ({
    readStoredMobileExamSession: vi.fn().mockResolvedValue({ sessionId: 'session-456' }),
    writeStoredMobileExamPreview: vi.fn(),
    clearStoredMobileExamSession: vi.fn(),
}));

vi.mock('@/features/exam/lib/mobile-exam-reconnection', () => {
    return {
        MobileExamReconnection: class {
            startListening = vi.fn();
            stopListening = vi.fn();
            triggerNetworkDisruption = vi.fn();
        },
    };
});

const mockReplace = vi.fn();
vi.mock('expo-router', () => ({
    useRouter: () => ({
        replace: mockReplace,
    }),
    useLocalSearchParams: () => ({ id: 'exam-123', sessionId: 'session-456' }),
}));

import { useExamSession } from './use-exam-session';

describe('useExamSession Hook', () => {
    beforeEach(() => {
        stateValues = [];
        stateIndex = 0;
        effectCallbacks = [];
        vi.useFakeTimers();
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should initialize and adapt exam data correctly', () => {
        const { exam, questions, currentQuestion } = useExamSession();

        // Trigger useEffect callbacks (timer setup, readStoredMobileExamSession, AppState listeners)
        effectCallbacks.forEach((cb) => cb());

        expect(exam).toBeDefined();
        expect(exam?.title).toBe('Math Final');
        expect(questions).toHaveLength(1);
        expect(currentQuestion.id).toBe('q1');
    });

    it('should handle successful turn-in flow', async () => {
        const mockResult = {
            attemptId: 'attempt-789',
            completedAt: new Date().toISOString(),
            score: 1,
            totalScore: 1,
            percentage: 100,
        };
        mockCompleteExamSession.mockResolvedValue(mockResult);

        const session = useExamSession();

        // Trigger submission by calling handleNext on the last question
        session.handleNext();

        // Alert.alert should be called for confirmation
        const alertCalls = vi.mocked(Alert.alert).mock.calls;
        expect(alertCalls).toHaveLength(1);
        
        // Retrieve the "Submit" option callback and execute it
        const submitButton = alertCalls[0][2]?.find((btn: any) => btn.text === 'Submit');
        expect(submitButton).toBeDefined();

        await submitButton.onPress();

        expect(mockCompleteExamSession).toHaveBeenCalledWith(expect.any(Object), {
            sessionId: 'session-456',
            answers: {},
            elapsedSeconds: 0,
        });

        expect(writeStoredMobileExamPreview).toHaveBeenCalledWith('exam-123', {
            sessionId: 'session-456',
            answers: {},
            elapsedSeconds: 0,
            summary: mockResult,
        });
        expect(clearStoredMobileExamSession).toHaveBeenCalledWith('exam-123');
        expect(mockReplace).toHaveBeenCalledWith('/exam/exam-123/result');
    });

    it('should show alert on turn-in failure', async () => {
        mockCompleteExamSession.mockRejectedValue(new Error('API Error'));

        const session = useExamSession();
        session.handleNext();

        const alertCalls = vi.mocked(Alert.alert).mock.calls;
        const submitButton = alertCalls[0][2]?.find((btn: any) => btn.text === 'Submit');
        await submitButton.onPress();

        expect(Alert.alert).toHaveBeenCalledWith(
            'Submission Failed',
            'API Error'
        );
    });
});
