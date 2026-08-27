import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';

let stateValues: any[] = [];
let stateIndex = 0;
let effectCallbacks: Array<() => void | (() => void)> = [];

vi.mock('react', async (importOriginal) => {
    const actual = (await importOriginal()) as any;
    return {
        ...actual,
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
        useRef: (initial: any) => ({ current: initial }),
    };
});

vi.mock('react-native', () => ({
    View: (props: any) => ({ type: 'View', props }),
    Text: (props: any) => ({ type: 'Text', props }),
    useColorScheme: () => 'light',
}));

vi.mock('@/constants/theme', () => ({
    Colors: {
        light: { border: '#ccc', text: '#000' },
        dark: { border: '#444', text: '#fff' },
    },
}));

vi.mock('@expo/vector-icons', () => ({
    Ionicons: (props: any) => ({ type: 'Ionicons', props }),
}));

const mockGetDirective = vi.fn();
const mockCreatePublisherConn = vi.fn();
const mockAckReady = vi.fn();
const mockAckFailure = vi.fn();

vi.mock('@sentinel/services', () => ({
    getStudentLiveInspectionDirective: (...args: any[]) => mockGetDirective(...args),
    createLiveInspectionPublisherConnection: (...args: any[]) => mockCreatePublisherConn(...args),
    acknowledgeLiveInspectionPublisherReady: (...args: any[]) => mockAckReady(...args),
    acknowledgeLiveInspectionPublisherFailure: (...args: any[]) => mockAckFailure(...args),
}));

vi.mock('@sentinel/hooks', () => ({
    useApi: () => vi.fn(),
    useAuth: () => ({
        supabase: {
            channel: () => ({
                on: () => ({ subscribe: vi.fn() }),
            }),
            removeChannel: vi.fn(),
        },
    }),
}));

import { MobileLiveInspectionBridge } from './mobile-live-inspection-bridge';

describe('MobileLiveInspectionBridge', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        stateValues = [];
        stateIndex = 0;
        effectCallbacks = [];
    });

    it('returns null when isLive is false', () => {
        stateValues[0] = false; // isLive = false

        const result = MobileLiveInspectionBridge({
            sessionId: 'session-1',
            attemptId: 'attempt-1',
            enabled: true,
        });

        expect(result).toBeNull();
    });

    it('renders live viewing alert indicator when isLive is true', () => {
        stateValues[0] = true; // isLive = true

        const result = MobileLiveInspectionBridge({
            sessionId: 'session-1',
            attemptId: 'attempt-1',
            enabled: true,
        });

        expect(result).not.toBeNull();
        expect((result as any).props.accessibilityRole).toBe('alert');
        expect((result as any).props.accessibilityLabel).toBe('Live inspection indicator');
    });

    it('initiates live inspection publication on active directive', async () => {
        const mockMediaPipeRef = {
            current: {
                takePictureAsync: vi.fn(),
                startLiveInspection: vi.fn().mockResolvedValue(undefined),
                stopLiveInspection: vi.fn().mockResolvedValue(undefined),
            },
        };

        mockGetDirective.mockResolvedValue({
            state: 'PUBLISHER_CONNECTING',
            leaseId: 'lease-101',
            revision: 1,
            attemptId: 'attempt-1',
            topic: 'topic-1',
            connection: {
                leaseId: 'lease-101',
                revision: 1,
                roomName: 'room-1',
                token: 'livekit-token-abc',
                liveKitUrl: 'wss://livekit.test.io',
                participantIdentity: 'student-1',
                expiresAt: new Date().toISOString(),
            },
        });
        mockAckReady.mockResolvedValue({ success: true });

        MobileLiveInspectionBridge({
            sessionId: 'session-1',
            attemptId: 'attempt-1',
            enabled: true,
            mediaPipeRef: mockMediaPipeRef as any,
        });

        // Trigger useEffect callback
        for (const cb of effectCallbacks) {
            cb();
        }
        await new Promise((r) => setTimeout(r, 20));

        expect(mockGetDirective).toHaveBeenCalled();
        expect(mockMediaPipeRef.current.startLiveInspection).toHaveBeenCalledWith({
            liveKitUrl: 'wss://livekit.test.io',
            token: 'livekit-token-abc',
        });
        expect(mockAckReady).toHaveBeenCalled();
    });

    it('stops live inspection publication on terminal/stop state', async () => {
        const mockMediaPipeRef = {
            current: {
                takePictureAsync: vi.fn(),
                startLiveInspection: vi.fn().mockResolvedValue(undefined),
                stopLiveInspection: vi.fn().mockResolvedValue(undefined),
            },
        };

        mockGetDirective.mockResolvedValue({
            state: 'ENDED',
            leaseId: 'lease-101',
            revision: 2,
            attemptId: 'attempt-1',
            topic: 'topic-1',
        });

        MobileLiveInspectionBridge({
            sessionId: 'session-1',
            attemptId: 'attempt-1',
            enabled: true,
            mediaPipeRef: mockMediaPipeRef as any,
        });

        for (const cb of effectCallbacks) {
            cb();
        }
        await new Promise((r) => setTimeout(r, 20));

        expect(mockGetDirective).toHaveBeenCalled();
        expect(mockMediaPipeRef.current.stopLiveInspection).not.toHaveBeenCalled(); // No active lease was set yet
    });

    it('suppresses console.warn on 404 not available responses', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        mockGetDirective.mockRejectedValue({
            status: 404,
            message: 'Live inspection is not available.',
        });

        MobileLiveInspectionBridge({
            sessionId: 'session-1',
            attemptId: 'attempt-1',
            enabled: true,
        });

        for (const cb of effectCallbacks) {
            cb();
        }
        await new Promise((r) => setTimeout(r, 20));

        expect(mockGetDirective).toHaveBeenCalled();
        expect(warnSpy).not.toHaveBeenCalled();

        warnSpy.mockRestore();
    });

    it('logs console.warn on unexpected non-404 errors', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        mockGetDirective.mockRejectedValue({
            status: 500,
            message: 'Internal Server Error',
        });

        MobileLiveInspectionBridge({
            sessionId: 'session-1',
            attemptId: 'attempt-1',
            enabled: true,
        });

        for (const cb of effectCallbacks) {
            cb();
        }
        await new Promise((r) => setTimeout(r, 20));

        expect(mockGetDirective).toHaveBeenCalled();
        expect(warnSpy).toHaveBeenCalledWith(
            'Live inspection directive reconciliation failed:',
            expect.objectContaining({ status: 500 }),
        );

        warnSpy.mockRestore();
    });
});
