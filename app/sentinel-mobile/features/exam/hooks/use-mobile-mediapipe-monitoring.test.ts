import { vi, describe, it, expect, beforeEach } from 'vitest';
import * as React from 'react';

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
        useRef: (initial: any) => ({ current: initial }),
    };
});

// Mock telemetry client
const mockEmitTelemetry = vi.fn().mockResolvedValue(true);
vi.mock('@/features/exam/lib/mobile-telemetry-client', () => ({
    emitMobileTelemetryEvent: (args: any) => mockEmitTelemetry(args),
}));

// Mock storage
vi.mock('@/features/exam/lib/mobile-exam-storage', () => ({
    readStoredMobileCalibrationProfile: vi.fn().mockResolvedValue(null),
}));

// Mock shared
const mockAnalyzeFrame = vi.fn();
vi.mock('@sentinel/shared', () => ({
    analyzeMediaPipeFrame: (args: any) => mockAnalyzeFrame(args),
}));

import { useMobileMediaPipeMonitoring } from './use-mobile-mediapipe-monitoring';

describe('useMobileMediaPipeMonitoring', () => {
    beforeEach(() => {
        stateValues = [];
        stateIndex = 0;
        effectCallbacks = [];
        vi.clearAllMocks();
    });

    it('should disable monitoring when sandbox is off', () => {
        const sandbox = {
            enabled: false,
            emitDuringExam: false,
        };

        const result = useMobileMediaPipeMonitoring({
            examId: 'exam-1',
            mediaPipeSandbox: sandbox as any,
            examSessionId: 'session-1',
            landmarksByFace: [],
        });

        expect(result.isMonitoring).toBe(false);
        // Effect callbacks
        effectCallbacks.forEach((cb) => cb());
        expect(mockAnalyzeFrame).not.toHaveBeenCalled();
    });

    it('should run monitoring when enabled and map analysis status to warning', () => {
        const sandbox = {
            enabled: true,
            emitDuringExam: true,
            consecutiveFrameThreshold: 2,
            cooldownMs: 5000,
        };

        mockAnalyzeFrame.mockReturnValue({
            status: 'off-screen',
            signal: 'GAZE_OFF_SCREEN',
            faceCount: 1,
            confidenceScore: 0.9,
        });

        // First call to mount and register effect
        useMobileMediaPipeMonitoring({
            examId: 'exam-1',
            mediaPipeSandbox: sandbox as any,
            examSessionId: 'session-1',
            landmarksByFace: [[]],
        });

        // Run effects
        effectCallbacks.forEach((cb) => cb());

        expect(mockAnalyzeFrame).toHaveBeenCalled();
        // warningStatus is the 2nd state variable (index 1)
        expect(stateValues[1]).toBe('Looking away from screen');
    });

    it('should trigger telemetry event after consecutive threshold frames', async () => {
        const sandbox = {
            enabled: true,
            emitDuringExam: true,
            consecutiveFrameThreshold: 1, // trigger immediately on 1 frame
            cooldownMs: 5000,
        };
        const config = {
            aiRules: {
                face_detection: true,
            },
        };

        mockAnalyzeFrame.mockReturnValue({
            status: 'no-face',
            signal: 'NO_FACE_DETECTED',
            faceCount: 0,
        });

        const onAnomaly = vi.fn();
        const mockApiClient = {};

        useMobileMediaPipeMonitoring({
            examId: 'exam-1',
            apiClient: mockApiClient as any,
            configuration: config as any,
            mediaPipeSandbox: sandbox as any,
            examSessionId: 'session-1',
            landmarksByFace: [],
            onAnomalyDetected: onAnomaly,
        });

        // Run effects
        effectCallbacks.forEach((cb) => cb());

        expect(mockEmitTelemetry).toHaveBeenCalledWith(
            expect.objectContaining({
                eventType: 'NO_FACE_DETECTED',
            }),
        );
        expect(onAnomaly).toHaveBeenCalledWith('NO_FACE_DETECTED');
    });

    it('requires consecutive frames to meet threshold before triggering anomaly', () => {
        const sandbox = {
            enabled: true,
            emitDuringExam: true,
            consecutiveFrameThreshold: 2,
            cooldownMs: 10000,
        };
        const config = {
            aiRules: {
                multiple_faces_detection: true,
            },
        };

        mockAnalyzeFrame.mockReturnValue({
            status: 'multiple-faces',
            signal: 'MULTIPLE_FACES',
            faceCount: 2,
        });

        const onAnomaly = vi.fn();
        const mockApiClient = {};

        useMobileMediaPipeMonitoring({
            examId: 'exam-1',
            apiClient: mockApiClient as any,
            configuration: config as any,
            mediaPipeSandbox: sandbox as any,
            examSessionId: 'session-1',
            landmarksByFace: [[], []],
            onAnomalyDetected: onAnomaly,
        });

        // 1st frame: consecutive frame count = 1 (< 2), no telemetry yet
        effectCallbacks[effectCallbacks.length - 1]();
        expect(mockEmitTelemetry).not.toHaveBeenCalled();
        expect(onAnomaly).not.toHaveBeenCalled();

        // 2nd frame: consecutive frame count = 2 (>= 2), triggers telemetry
        effectCallbacks[effectCallbacks.length - 1]();
        expect(mockEmitTelemetry).toHaveBeenCalledWith(
            expect.objectContaining({
                eventType: 'MULTIPLE_FACES',
                examSessionId: 'session-1',
            }),
        );
        expect(onAnomaly).toHaveBeenCalledWith('MULTIPLE_FACES');
    });

    it('enforces cooldown period between telemetry incident triggers', () => {
        const sandbox = {
            enabled: true,
            emitDuringExam: true,
            consecutiveFrameThreshold: 1,
            cooldownMs: 10000,
        };

        mockAnalyzeFrame.mockReturnValue({
            status: 'off-screen',
            signal: 'GAZE_OFF_SCREEN',
            faceCount: 1,
        });

        const onAnomaly = vi.fn();
        const mockApiClient = {};

        useMobileMediaPipeMonitoring({
            examId: 'exam-1',
            apiClient: mockApiClient as any,
            configuration: { aiRules: { gaze_tracking: true } } as any,
            mediaPipeSandbox: sandbox as any,
            examSessionId: 'session-1',
            landmarksByFace: [[]],
            onAnomalyDetected: onAnomaly,
        });

        const runHookEffect = effectCallbacks[effectCallbacks.length - 1];

        // Frame 1 triggers anomaly at t=0
        const dateSpy = vi.spyOn(Date, 'now').mockReturnValue(100000);
        runHookEffect();
        expect(mockEmitTelemetry).toHaveBeenCalledTimes(1);
        expect(onAnomaly).toHaveBeenCalledTimes(1);

        // Frame 2 at t=5000ms (within 10000ms cooldown) -> should be suppressed
        dateSpy.mockReturnValue(105000);
        runHookEffect();
        expect(mockEmitTelemetry).toHaveBeenCalledTimes(1);
        expect(onAnomaly).toHaveBeenCalledTimes(1);

        // Frame 3 at t=11000ms (cooldown expired) -> triggers telemetry again
        dateSpy.mockReturnValue(111000);
        runHookEffect();
        expect(mockEmitTelemetry).toHaveBeenCalledTimes(2);
        expect(onAnomaly).toHaveBeenCalledTimes(2);

        dateSpy.mockRestore();
    });
});
