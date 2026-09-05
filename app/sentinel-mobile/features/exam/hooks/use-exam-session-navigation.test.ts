import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Alert } from 'react-native';
import { useExamSessionNavigation } from './use-exam-session-navigation';
import type { MobileSessionQuestion } from '@/features/exam/lib/mobile-exam-adapter.types';

let stateValues: any[] = [];
let stateIndex = 0;

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
    useEffect: vi.fn(),
    useCallback: (fn: any) => fn,
    useMemo: (fn: any) => fn(),
    useRef: (initial: any) => ({ current: initial }),
}));

vi.mock('react-native', () => ({
    Alert: {
        alert: vi.fn(),
    },
}));

describe('useExamSessionNavigation', () => {
    beforeEach(() => {
        stateValues = [];
        stateIndex = 0;
        vi.clearAllMocks();
    });

    const mockQuestions: MobileSessionQuestion[] = [
        {
            id: 'q1',
            text: 'Question 1',
            type: 'MULTIPLE_CHOICE',
            points: 1,
            options: [{ id: 'A', text: 'Option A' }],
            originalContent: { prompt: 'Question 1' },
        },
        {
            id: 'q2',
            text: 'Question 2',
            type: 'MULTIPLE_CHOICE',
            points: 1,
            options: [{ id: 'B', text: 'Option B' }],
            originalContent: { prompt: 'Question 2' },
        },
    ];

    it('navigates next and previous correctly', () => {
        const onConfirmSubmit = vi.fn();
        const syncProgressNow = vi.fn().mockResolvedValue(undefined);

        const nav = useExamSessionNavigation({
            questions: mockQuestions,
            onConfirmSubmit,
            syncProgressNow,
        });

        expect(nav.currentIndex).toBe(0);
        expect(nav.isLastQuestion).toBe(false);

        nav.handleNext();
        expect(syncProgressNow).toHaveBeenCalled();

        nav.handlePrevious();
        expect(syncProgressNow).toHaveBeenCalledTimes(2);
    });

    it('shows confirmation dialog when handleNext is called on the last question', () => {
        stateValues[0] = 1; // currentIndex = 1 (last question)
        const onConfirmSubmit = vi.fn();
        const syncProgressNow = vi.fn().mockResolvedValue(undefined);

        const nav = useExamSessionNavigation({
            questions: mockQuestions,
            onConfirmSubmit,
            syncProgressNow,
        });

        expect(nav.isLastQuestion).toBe(true);
        nav.handleNext();

        expect(Alert.alert).toHaveBeenCalled();
        const alertCalls = vi.mocked(Alert.alert).mock.calls;
        const submitButton = alertCalls[0][2]?.find((btn: any) => btn.text === 'Submit');
        submitButton?.onPress?.();

        expect(onConfirmSubmit).toHaveBeenCalled();
    });
});
