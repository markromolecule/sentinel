import { vi, describe, it, expect, beforeEach } from 'vitest';
import * as React from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── React Mocking ───
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
        useEffect: (callback: () => void | (() => void), deps?: any[]) => {
            effectCallbacks.push(callback);
        },
        useCallback: (fn: any) => fn,
        useMemo: (fn: any) => fn(),
        useRef: (initialValue: any) => ({ current: initialValue }),
    };
});

// ─── Other External Mocks ───
vi.mock('react-native', () => ({
    useColorScheme: () => 'light',
    Alert: {
        alert: vi.fn(),
    },
}));

vi.mock('react-native-safe-area-context', () => ({
    useSafeAreaInsets: () => ({ top: 0, bottom: 0 }),
}));

vi.mock('expo-router', () => ({
    useRouter: () => ({
        back: vi.fn(),
        push: vi.fn(),
        replace: vi.fn(),
    }),
    useLocalSearchParams: () => ({ id: 'test-exam-id' }),
}));

vi.mock('@/constants/theme', () => ({
    Colors: {
        light: { primary: '#000', border: '#ccc', text: '#000', card: '#fff', background: '#fff' },
        dark: { primary: '#fff', border: '#444', text: '#fff', card: '#222', background: '#111' },
    },
}));

vi.mock('@react-navigation/native', () => ({
    useFocusEffect: vi.fn(),
}));

const mockAuth = vi.fn(() => ({
    supabase: {
        channel: () => ({
            on: () => ({
                subscribe: vi.fn(),
            }),
        }),
        removeChannel: vi.fn(),
    },
    session: { user: { id: 'test-user-id' } },
}));

const mockRuntimeAccess = vi.hoisted(() => ({
    value: {
        canStart: true,
        canResume: false,
        hasActiveAttempt: false,
        state: 'lobby_waiting',
    },
}));

const mockAdmissionStatus = vi.hoisted(() => ({
    value: { status: 'APPROVED' as const },
}));

vi.mock('@sentinel/hooks', () => ({
    useApi: () => ({}),
    useAuth: () => mockAuth(),
    useExamQuery: () => ({
        data: {
            id: 'test-exam-id',
            title: 'Test Exam',
            configuration: {
                cameraRequired: true,
                micRequired: true,
                lobbyAdmissionMode: 'INSTRUCTOR_GATED',
            },
            mediaPipeSandbox: {
                enabled: true,
                captureDuringCheckup: true,
            },
            runtimeAccess: mockRuntimeAccess.value,
        },
        refetch: vi.fn(),
    }),
    useExamLobbyCountQuery: () => ({
        data: { count: 3 },
        refetch: vi.fn(),
    }),
    useExamLobbyAdmissionStatusQuery: () => ({
        data: mockAdmissionStatus.value,
        refetch: vi.fn().mockResolvedValue({ data: mockAdmissionStatus.value }),
    }),
    useLobbyRealtime: vi.fn(),
}));

vi.mock('@sentinel/services', () => ({
    checkIntoExamLobby: vi.fn().mockResolvedValue({ status: 'APPROVED' }),
    startExamSession: vi.fn().mockResolvedValue({ sessionId: 'session-123' }),
}));

vi.mock('@/features/exam/lib/mobile-exam-adapter', () => ({
    adaptExamForMobile: (exam: any) => exam,
}));

vi.mock('@/features/exam/lib/mobile-exam-lobby', () => ({
    getMobileExamLobbyEntryLabel: () => 'Start',
}));

vi.mock('@/features/exam/lib/mobile-exam-storage', () => ({
    readStoredMobileCalibrationProfile: vi.fn(),
    writeStoredMobileExamSession: vi.fn(),
}));

// Now import the hook under test
import { useExamLobby } from './use-exam-lobby';

describe('useExamLobby hook', () => {
    beforeEach(() => {
        stateValues = [];
        stateIndex = 0;
        effectCallbacks = [];
        mockAdmissionStatus.value = { status: 'APPROVED' };
        mockRuntimeAccess.value = {
            canStart: true,
            canResume: false,
            hasActiveAttempt: false,
            state: 'lobby_waiting',
        };
        vi.clearAllMocks();
    });

    it('should block exam entry when MediaPipe is uncalibrated', async () => {
        // Mock state: isMediaPipeCalibrated = false, isAudioReady = true
        stateValues[2] = false; // isMediaPipeCalibrated
        stateValues[3] = true; // isAudioReady

        const result = useExamLobby();
        expect(result.canEnterExam).toBe(false);

        // Try to enter the exam
        await result.handleEnterExam();
        expect(Alert.alert).toHaveBeenCalledWith(
            'Checkup Incomplete',
            'Please complete the system checkup and calibration before entering the exam.',
            [{ text: 'OK' }],
        );
    });

    it('should allow exam entry when all requirements are satisfied', async () => {
        // Mock state: isMediaPipeCalibrated = true, isAudioReady = true
        stateValues[2] = true;
        stateValues[3] = true;

        const result = useExamLobby();
        expect(result.canEnterExam).toBe(true);

        // Try to enter the exam
        await result.handleEnterExam();
        expect(Alert.alert).not.toHaveBeenCalled();
    });

    it('should allow approved instructor-gated resume access when runtime access can resume', () => {
        stateValues[0] = false; // isStartingSession
        stateValues[2] = true; // isMediaPipeCalibrated
        stateValues[3] = true; // isAudioReady
        mockAdmissionStatus.value = { status: 'APPROVED' };
        mockRuntimeAccess.value = {
            canStart: false,
            canResume: true,
            hasActiveAttempt: true,
            state: 'lobby_approved',
        };

        const result = useExamLobby();

        expect(result.canEnterExam).toBe(true);
    });

    it('should display the correct student count using query or presence fallback', () => {
        // Mock state: presenceCount = 5
        stateValues[1] = 5;

        const result = useExamLobby();
        // Since useExamLobbyCountQuery returns count: 3, it prefers query count if available
        expect(result.readyCount).toBe(3);
    });
});
