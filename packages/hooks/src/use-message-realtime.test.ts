import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MESSAGES_QUERY_KEYS } from '@sentinel/shared/constants';
import { useMessageRealtime } from './use-message-realtime';

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
    user: { id: 'user-uuid-111' },
}));
let capturedCleanup: (() => void) | undefined;

vi.mock('react', async (importOriginal) => {
    const actual = await importOriginal<typeof import('react')>();

    return {
        ...actual,
        useEffect: vi.fn((effect: () => void | (() => void)) => {
            capturedCleanup = effect() ?? undefined;
        }),
    };
});

vi.mock('@tanstack/react-query', () => ({
    useQueryClient: vi.fn(() => ({
        invalidateQueries: mockInvalidateQueries,
        setQueryData: mockSetQueryData,
    })),
}));

vi.mock('./auth-provider', () => ({
    useAuth: () => mockUseAuth(),
}));

describe('useMessageRealtime Hook', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        capturedCleanup = undefined;
        mockChannelOn.mockReturnValue(mockChannel);
        mockSubscribe.mockReturnValue(mockChannel);
    });

    it('subscribes to a specific conversation and removes the channel on cleanup', () => {
        const conversationId = 'conv-uuid-123';

        useMessageRealtime({ conversationId });

        expect(mockSupabaseChannel).toHaveBeenCalledWith(
            `messages:${conversationId}:user-uuid-111`,
        );
        expect(mockChannelOn).toHaveBeenCalledWith(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'messages',
                filter: `conversation_id=eq.${conversationId}`,
            },
            expect.any(Function),
        );
        expect(mockSubscribe).toHaveBeenCalled();

        capturedCleanup?.();

        expect(mockRemoveChannel).toHaveBeenCalledWith(mockChannel);
    });

    it('invalidates conversation and updates messages cache for the selected conversation channel', () => {
        const conversationId = 'conv-uuid-123';

        useMessageRealtime({ conversationId });

        const messageSubscriptionCall = mockChannelOn.mock.calls.find(
            ([eventName, config]) =>
                eventName === 'postgres_changes' && config.table === 'messages',
        );

        expect(messageSubscriptionCall).toBeDefined();
        messageSubscriptionCall?.[2]({
            eventType: 'INSERT',
            new: {
                message_id: 'msg-uuid-1',
                conversation_id: conversationId,
                sender_id: 'user-uuid-222',
                content: 'Hello',
                created_at: new Date().toISOString(),
            },
        });

        expect(mockSetQueryData).toHaveBeenCalledWith(
            MESSAGES_QUERY_KEYS.messages(conversationId),
            expect.any(Function),
        );
        expect(mockInvalidateQueries).toHaveBeenCalledWith({
            queryKey: MESSAGES_QUERY_KEYS.conversations(),
        });
    });

    it('invalidates the conversation list and updates conversations preview when listening globally', () => {
        useMessageRealtime();

        expect(mockSupabaseChannel).toHaveBeenCalledWith('messages:all:user-uuid-111');

        const messageSubscriptionCall = mockChannelOn.mock.calls.find(
            ([eventName, config]) =>
                eventName === 'postgres_changes' &&
                config.table === 'messages' &&
                config.filter === undefined,
        );

        expect(messageSubscriptionCall).toBeDefined();
        messageSubscriptionCall?.[2]({
            eventType: 'INSERT',
            new: {
                message_id: 'msg-uuid-999',
                conversation_id: 'conv-uuid-999',
                sender_id: 'user-uuid-222',
                content: 'Global message',
                created_at: new Date().toISOString(),
            },
        });

        expect(mockInvalidateQueries).toHaveBeenCalledWith({
            queryKey: MESSAGES_QUERY_KEYS.conversations(),
        });
        expect(mockSetQueryData).toHaveBeenCalledWith(
            MESSAGES_QUERY_KEYS.conversations(),
            expect.any(Function),
        );
    });
});
