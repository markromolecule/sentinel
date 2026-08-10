import { vi, describe, it, expect } from 'vitest';
import React from 'react';

// Mock React Native to allow shallow functional testing
vi.mock('react-native', () => {
    return {
        View: (props: any) => ({ type: 'View', props }),
        Text: (props: any) => ({ type: 'Text', props }),
        useColorScheme: () => 'light',
    };
});

vi.mock('@/constants/theme', () => ({
    Colors: {
        light: { border: '#ccc', text: '#000' },
        dark: { border: '#444', text: '#fff' },
    },
}));

vi.mock('@expo/vector-icons', () => ({
    Ionicons: (props: any) => ({ type: 'Ionicons', props }),
}));

const mockUsePublisher = vi.fn();
vi.mock('@sentinel/hooks', () => ({
    useApi: () => ({}),
    useAuth: () => ({ supabase: {} }),
    useStudentLiveInspectionPublisher: (args: any) => mockUsePublisher(args),
}));

import { MobileLiveInspectionBridge } from './mobile-live-inspection-bridge';

describe('MobileLiveInspectionBridge', () => {
    it('returns null if the publisher is not live', () => {
        mockUsePublisher.mockReturnValue({ isLive: false });

        const result = MobileLiveInspectionBridge({
            sessionId: 'session-1',
            attemptId: 'attempt-1',
            enabled: true,
            getLiveVideoTrack: () => null,
        });

        expect(result).toBeNull();
    });

    it('renders live status pill if the publisher is active', () => {
        mockUsePublisher.mockReturnValue({ isLive: true });

        const result = MobileLiveInspectionBridge({
            sessionId: 'session-1',
            attemptId: 'attempt-1',
            enabled: true,
            getLiveVideoTrack: () => null,
        });

        expect(result).not.toBeNull();
        expect((result as any).props.accessibilityRole).toBe('alert');
    });
});
