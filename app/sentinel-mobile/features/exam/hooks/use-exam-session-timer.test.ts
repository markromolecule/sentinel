import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useExamSessionTimer } from './use-exam-session-timer';

let stateValues: any[] = [];
let stateIndex = 0;
let effectCallbacks: Array<() => void | (() => void)> = [];

vi.mock('react', () => ({
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
}));

describe('useExamSessionTimer', () => {
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

    it('formats time correctly for hours and minutes', () => {
        const onExpire = vi.fn();
        const { formatTime } = useExamSessionTimer({
            duration: 60,
            hasLoadedExam: true,
            isSubmitting: false,
            onExpire,
        });

        expect(formatTime(3665)).toBe('01:01:05');
        expect(formatTime(59)).toBe('00:59');
        expect(formatTime(600)).toBe('10:00');
    });

    it('triggers onExpire when timeLeft reaches 0 and duration was initialized', () => {
        const onExpire = vi.fn();
        stateValues[0] = 0; // timeLeft = 0

        useExamSessionTimer({
            duration: 30,
            hasLoadedExam: true,
            isSubmitting: false,
            onExpire,
        });

        // Run duration init effect and expiration effect
        effectCallbacks.forEach((cb) => cb());

        expect(onExpire).toHaveBeenCalled();
    });
});
