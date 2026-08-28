'use client';

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useLobbyPresence } from './use-lobby-presence';

const mockUseAuth = vi.fn();

vi.mock('@sentinel/hooks', () => ({
    useAuth: () => mockUseAuth(),
}));

describe('useLobbyPresence', () => {
    let mockChannel: any;
    let mockSupabase: any;
    let presenceSyncCallback: (() => void) | null = null;
    let subscribeCallback: ((status: string) => Promise<void>) | null = null;
    let presenceState: Record<string, any[]> = {};

    beforeEach(() => {
        vi.clearAllMocks();
        presenceSyncCallback = null;
        subscribeCallback = null;
        presenceState = {};

        mockChannel = {
            on: vi.fn().mockImplementation((_type: string, _opts: any, cb: () => void) => {
                presenceSyncCallback = cb;
                return mockChannel;
            }),
            subscribe: vi.fn().mockImplementation((cb: (status: string) => Promise<void>) => {
                subscribeCallback = cb;
                return mockChannel;
            }),
            presenceState: vi.fn().mockImplementation(() => presenceState),
            track: vi.fn().mockResolvedValue(undefined),
        };

        mockSupabase = {
            channel: vi.fn().mockReturnValue(mockChannel),
            removeChannel: vi.fn().mockResolvedValue(undefined),
        };

        mockUseAuth.mockReturnValue({
            supabase: mockSupabase,
            session: {
                user: { id: 'student-user-1' },
            },
        });
    });

    it('initializes channel and calculates unique user presence count on sync', () => {
        const { result } = renderHook(() => useLobbyPresence('exam-123'));

        expect(mockSupabase.channel).toHaveBeenCalledWith('lobby:exam-123', {
            config: {
                presence: {
                    key: 'student-user-1',
                },
            },
        });

        expect(mockChannel.on).toHaveBeenCalledWith(
            'presence',
            { event: 'sync' },
            expect.any(Function),
        );

        // Initial count is 0
        expect(result.current.presenceCount).toBe(0);

        // Simulate presence sync with unique users including duplicate connections for user-1
        presenceState = {
            'student-user-1': [
                { user_id: 'student-user-1', online_at: '2026-08-19T00:00:00Z' },
                { user_id: 'student-user-1', online_at: '2026-08-19T00:01:00Z' },
            ],
            'student-user-2': [{ user_id: 'student-user-2', online_at: '2026-08-19T00:00:30Z' }],
        };

        act(() => {
            presenceSyncCallback?.();
        });

        // Unique user count should be 2
        expect(result.current.presenceCount).toBe(2);
    });

    it('tracks presence when channel subscription is confirmed', async () => {
        renderHook(() => useLobbyPresence('exam-123'));

        expect(subscribeCallback).not.toBeNull();

        await act(async () => {
            await subscribeCallback?.('SUBSCRIBED');
        });

        expect(mockChannel.track).toHaveBeenCalledWith({
            user_id: 'student-user-1',
            online_at: expect.any(String),
        });
    });

    it('removes channel on unmount and prevents state updates', () => {
        const { result, unmount } = renderHook(() => useLobbyPresence('exam-123'));

        // Initial sync
        presenceState = {
            'student-user-1': [{ user_id: 'student-user-1' }],
        };
        act(() => {
            presenceSyncCallback?.();
        });
        expect(result.current.presenceCount).toBe(1);

        unmount();

        expect(mockSupabase.removeChannel).toHaveBeenCalledWith(mockChannel);

        // Attempting to sync after unmount should not throw or change state
        presenceState = {
            'student-user-1': [{ user_id: 'student-user-1' }],
            'student-user-2': [{ user_id: 'student-user-2' }],
        };
        act(() => {
            presenceSyncCallback?.();
        });

        expect(result.current.presenceCount).toBe(1);
    });

    it('handles missing supabase client or session gracefully', () => {
        mockUseAuth.mockReturnValue({
            supabase: null,
            session: null,
        });

        const { result } = renderHook(() => useLobbyPresence('exam-123'));

        expect(result.current.presenceCount).toBe(0);
        expect(mockSupabase.channel).not.toHaveBeenCalled();
    });

    it('handles empty examId gracefully', () => {
        const { result } = renderHook(() => useLobbyPresence(''));

        expect(result.current.presenceCount).toBe(0);
        expect(mockSupabase.channel).not.toHaveBeenCalled();
    });
});
