import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { EXAM_QUERY_KEYS } from '@sentinel/shared/constants';
import { useLobbyRealtime } from './use-lobby-realtime';

const mockInvalidateQueries = vi.fn();
const mockSetQueryData = vi.fn();
const mockSubscribe = vi.fn();
const mockRemoveChannel = vi.fn();
const mockChannelOn = vi.fn();
const mockTrack = vi.fn().mockResolvedValue(undefined);
let presenceStateData: Record<string, any[]> = {};
const mockPresenceState = vi.fn(() => presenceStateData);

const mockChannel = {
    on: mockChannelOn,
    subscribe: mockSubscribe,
    presenceState: mockPresenceState,
    track: mockTrack,
};
const mockSupabaseChannel = vi.fn(() => mockChannel);
const mockUseAuth = vi.fn(() => ({
    supabase: {
        channel: mockSupabaseChannel,
        removeChannel: mockRemoveChannel,
    },
    session: { user: { id: 'student-user-1' } },
}));

vi.mock('@tanstack/react-query', () => ({
    useQueryClient: vi.fn(() => ({
        invalidateQueries: mockInvalidateQueries,
        setQueryData: mockSetQueryData,
    })),
}));

vi.mock('./auth-provider', () => ({
    useAuth: () => mockUseAuth(),
}));

describe('useLobbyRealtime Hook', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockChannelOn.mockReturnValue(mockChannel);
        presenceStateData = {};
    });

    it('subscribes to single consolidated channel lobby:examId and cleans up on unmount without postgres_changes', () => {
        const examId = 'exam-123';

        const { unmount } = renderHook(() => useLobbyRealtime({ examId }));

        expect(mockSupabaseChannel).toHaveBeenCalledWith(`lobby:${examId}`, {
            config: {
                presence: {
                    key: 'student-user-1',
                },
            },
        });
        expect(mockChannelOn).toHaveBeenCalledWith(
            'presence',
            { event: 'sync' },
            expect.any(Function),
        );
        expect(mockChannelOn).toHaveBeenCalledWith(
            'broadcast',
            { event: 'admission:updated' },
            expect.any(Function),
        );
        expect(mockChannelOn).toHaveBeenCalledWith(
            'broadcast',
            { event: 'student:checked_in' },
            expect.any(Function),
        );

        // Verify postgres_changes CDC is NOT registered
        const cdcCalls = mockChannelOn.mock.calls.filter(([type]) => type === 'postgres_changes');
        expect(cdcCalls).toHaveLength(0);

        expect(mockSubscribe).toHaveBeenCalled();

        unmount();
        expect(mockRemoveChannel).toHaveBeenCalledWith(mockChannel);
    });

    it('syncs presence count across connected participants', () => {
        const examId = 'exam-123';
        const { result } = renderHook(() => useLobbyRealtime({ examId }));

        const presenceCall = mockChannelOn.mock.calls.find(
            ([type, config]) => type === 'presence' && config.event === 'sync',
        );
        expect(presenceCall).toBeDefined();

        presenceStateData = {
            'student-user-1': [{ user_id: 'student-user-1' }, { user_id: 'student-user-1' }],
            'student-user-2': [{ user_id: 'student-user-2' }],
        };

        act(() => {
            presenceCall?.[2]();
        });

        expect(result.current.presenceCount).toBe(2);
    });

    it('tracks presence on successful channel subscription', async () => {
        const examId = 'exam-123';
        const studentId = 'student-custom-id';

        let subscribeCb: ((status: string) => Promise<void>) | null = null;
        mockSubscribe.mockImplementation((cb: (status: string) => Promise<void>) => {
            subscribeCb = cb;
            return mockChannel;
        });

        renderHook(() => useLobbyRealtime({ examId, studentId, trackPresence: true }));

        await act(async () => {
            await subscribeCb?.('SUBSCRIBED');
        });

        expect(mockTrack).toHaveBeenCalledWith({
            user_id: 'student-custom-id',
            online_at: expect.any(String),
        });
    });

    it('handles admission:updated broadcast for matching studentId', () => {
        const examId = 'exam-123';
        const studentId = 'student-456';
        const onAdmissionChange = vi.fn();

        renderHook(() => useLobbyRealtime({ examId, studentId, onAdmissionChange }));

        const broadcastCall = mockChannelOn.mock.calls.find(
            ([type, config]) => type === 'broadcast' && config.event === 'admission:updated',
        );

        expect(broadcastCall).toBeDefined();

        const broadcastPayload = {
            payload: {
                examId,
                studentIds: ['student-456', 'student-789'],
                status: 'APPROVED',
                checkedInAt: '2026-08-25T06:00:00.000Z',
                decidedAt: '2026-08-25T06:01:00.000Z',
            },
        };

        broadcastCall?.[2](broadcastPayload);

        expect(mockSetQueryData).toHaveBeenCalledWith(
            EXAM_QUERY_KEYS.lobbyAdmissionStatus(examId),
            {
                status: 'APPROVED',
                checkedInAt: '2026-08-25T06:00:00.000Z',
                decidedAt: '2026-08-25T06:01:00.000Z',
            },
        );
        expect(mockInvalidateQueries).toHaveBeenCalledWith({
            queryKey: EXAM_QUERY_KEYS.lobbyWaitingList(examId),
        });
        expect(mockInvalidateQueries).toHaveBeenCalledWith({
            queryKey: EXAM_QUERY_KEYS.lobbyAdmissionStatus(examId),
        });
        expect(onAdmissionChange).toHaveBeenCalledWith(broadcastPayload);
    });

    it('does not mutate query cache or invalidate queries if broadcast event is for a different student', () => {
        const examId = 'exam-123';
        const studentId = 'student-456';
        const onAdmissionChange = vi.fn();

        renderHook(() => useLobbyRealtime({ examId, studentId, onAdmissionChange }));

        const broadcastCall = mockChannelOn.mock.calls.find(
            ([type, config]) => type === 'broadcast' && config.event === 'admission:updated',
        );

        broadcastCall?.[2]({
            payload: {
                examId,
                studentIds: ['other-student-999'],
                status: 'APPROVED',
            },
        });

        expect(mockSetQueryData).not.toHaveBeenCalled();
        expect(mockInvalidateQueries).not.toHaveBeenCalled();
        expect(onAdmissionChange).not.toHaveBeenCalled();
    });

    it('invalidates waiting list and count for instructor on student:checked_in broadcast', () => {
        const examId = 'exam-123';
        const onAdmissionChange = vi.fn();

        // When studentId is undefined, user is instructor
        renderHook(() => useLobbyRealtime({ examId, onAdmissionChange }));

        const checkInCall = mockChannelOn.mock.calls.find(
            ([type, config]) => type === 'broadcast' && config.event === 'student:checked_in',
        );

        expect(checkInCall).toBeDefined();

        const payload = {
            payload: {
                examId,
                studentId: 'student-999',
            },
        };

        checkInCall?.[2](payload);

        expect(mockInvalidateQueries).toHaveBeenCalledWith({
            queryKey: EXAM_QUERY_KEYS.lobbyWaitingList(examId),
        });
        expect(mockInvalidateQueries).toHaveBeenCalledWith({
            queryKey: EXAM_QUERY_KEYS.lobbyCount(examId),
        });
        expect(onAdmissionChange).toHaveBeenCalledWith(payload);
    });
});
