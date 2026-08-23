import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { EXAM_QUERY_KEYS } from '@sentinel/shared/constants';
import { useLobbyRealtime } from './use-lobby-realtime';

const mockInvalidateQueries = vi.fn();
const mockSetQueryData = vi.fn();
const mockSubscribe = vi.fn();
const mockRemoveChannel = vi.fn();
const mockChannelOn = vi.fn();
const mockChannel = {
    on: mockChannelOn,
    subscribe: mockSubscribe,
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
    });

    it('subscribes to exam lobby admissions channel and cleans up on unmount', () => {
        const examId = 'exam-123';

        const { unmount } = renderHook(() => useLobbyRealtime({ examId }));

        expect(mockSupabaseChannel).toHaveBeenCalledWith(`lobby:admissions:${examId}`);
        expect(mockChannelOn).toHaveBeenCalledWith(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'exam_lobby_admissions',
                filter: `exam_id=eq.${examId}`,
            },
            expect.any(Function),
        );
        expect(mockSubscribe).toHaveBeenCalled();

        unmount();
        expect(mockRemoveChannel).toHaveBeenCalledWith(mockChannel);
    });

    it('optimistically populates admission query cache and invalidates query keys on row change', () => {
        const examId = 'exam-123';
        const onAdmissionChange = vi.fn();

        renderHook(() => useLobbyRealtime({ examId, onAdmissionChange }));

        const subscriptionCall = mockChannelOn.mock.calls.find(
            ([eventName, config]) =>
                eventName === 'postgres_changes' && config.table === 'exam_lobby_admissions',
        );

        expect(subscriptionCall).toBeDefined();

        const payload = {
            eventType: 'UPDATE',
            new: {
                status: 'APPROVED',
                checked_in_at: '2026-08-23T12:00:00.000Z',
                decided_at: '2026-08-23T12:05:00.000Z',
            },
        };

        subscriptionCall?.[2](payload);

        // Optimistic query cache set
        expect(mockSetQueryData).toHaveBeenCalledWith(
            EXAM_QUERY_KEYS.lobbyAdmissionStatus(examId),
            {
                status: 'APPROVED',
                checkedInAt: '2026-08-23T12:00:00.000Z',
                decidedAt: '2026-08-23T12:05:00.000Z',
            },
        );

        // Query invalidations
        expect(mockInvalidateQueries).toHaveBeenCalledWith({
            queryKey: EXAM_QUERY_KEYS.lobbyWaitingList(examId),
        });
        expect(mockInvalidateQueries).toHaveBeenCalledWith({
            queryKey: EXAM_QUERY_KEYS.lobbyAdmissionStatus(examId),
        });
        expect(mockInvalidateQueries).toHaveBeenCalledWith({
            queryKey: EXAM_QUERY_KEYS.lobbyCount(examId),
        });
        expect(mockInvalidateQueries).toHaveBeenCalledWith({
            queryKey: EXAM_QUERY_KEYS.details(examId),
        });

        // Callback invoked
        expect(onAdmissionChange).toHaveBeenCalledWith(payload);
    });
});
