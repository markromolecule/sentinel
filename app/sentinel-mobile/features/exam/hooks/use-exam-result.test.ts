import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useExamResult } from './use-exam-result';

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

const mockReplace = vi.fn();
const mockCompleteSession = vi.fn();
const mockClearPreview = vi.fn();
const mockClearSession = vi.fn();
const mockReadPreview = vi.fn();

vi.mock('expo-router', () => ({
    useRouter: () => ({ replace: mockReplace }),
    useLocalSearchParams: () => ({ id: 'exam-123' }),
}));

vi.mock('react-native', () => ({
    useColorScheme: () => 'light',
    Alert: { alert: vi.fn() },
    Platform: {
        OS: 'ios',
        select: (obj: any) => obj.ios || obj.default,
    },
}));

vi.mock('react-native-safe-area-context', () => ({
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

vi.mock('@sentinel/hooks', () => ({
    useApi: () => vi.fn(),
    useExamQuery: () => ({ data: { id: 'exam-123', title: 'Sample Exam' } }),
}));

vi.mock('@sentinel/services', () => ({
    completeExamSession: (...args: any[]) => mockCompleteSession(...args),
}));

vi.mock('@/features/exam/lib/mobile-exam-adapter', () => ({
    adaptExamForMobile: (exam: any) => exam,
}));

vi.mock('@/features/exam/lib/mobile-exam-storage', () => ({
    readStoredMobileExamPreview: (...args: any[]) => mockReadPreview(...args),
    clearStoredMobileExamPreview: (...args: any[]) => mockClearPreview(...args),
    clearStoredMobileExamSession: (...args: any[]) => mockClearSession(...args),
}));

describe('useExamResult', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        stateValues = [];
        stateIndex = 0;
        effectCallbacks = [];

        mockReadPreview.mockResolvedValue({
            sessionId: 'session-456',
            answers: { 'q-1': 'A' },
            elapsedSeconds: 120,
            summary: { score: 10, totalScore: 10, percentage: 100 },
        });
        mockCompleteSession.mockResolvedValue({ success: true });
        mockClearPreview.mockResolvedValue(undefined);
        mockClearSession.mockResolvedValue(undefined);
    });

    it('navigates to the feedback screen with attemptId on successful turn in', async () => {
        // Pre-populate state for preview (state index 0)
        stateValues[0] = {
            sessionId: 'session-456',
            answers: { 'q-1': 'A' },
            elapsedSeconds: 120,
            summary: { score: 10, totalScore: 10, percentage: 100 },
        };
        stateValues[1] = false; // isTurningIn

        const result = useExamResult();
        await result.handleTurnIn();

        expect(mockCompleteSession).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                sessionId: 'session-456',
            }),
        );
        expect(mockClearPreview).toHaveBeenCalledWith('exam-123');
        expect(mockClearSession).toHaveBeenCalledWith('exam-123');
        expect(mockReplace).toHaveBeenCalledWith({
            pathname: '/exam/[id]/feedback',
            params: { id: 'exam-123', attemptId: 'session-456' },
        });
    });
});
