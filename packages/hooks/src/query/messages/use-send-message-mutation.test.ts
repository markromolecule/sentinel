import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSendMessageMutation } from './use-send-message-mutation';
import { sendMessage } from '@sentinel/services';
import { MESSAGES_QUERY_KEYS } from '@sentinel/shared/constants';

const mockInvalidateQueries = vi.fn();
const mockSetQueryData = vi.fn();

// Mock tanstack/react-query
vi.mock('@tanstack/react-query', () => ({
    useQueryClient: vi.fn(() => ({
        invalidateQueries: mockInvalidateQueries,
        setQueryData: mockSetQueryData,
    })),
    useMutation: vi.fn((options: any) => {
        const mutateAsync = async (variables: any) => {
            try {
                let data = {
                    messageId: 'new-msg-123',
                    conversationId: variables.conversationId,
                    senderId: 'user-uuid-111',
                    content: variables.content,
                    status: 'SENT' as const,
                    createdAt: new Date().toISOString(),
                };
                if (options.mutationFn) {
                    const result = await options.mutationFn(variables);
                    if (result) data = result;
                }
                if (options.onSuccess) {
                    await options.onSuccess(data, variables, null);
                }
            } catch (error) {
                if (options.onError) {
                    options.onError(error, variables, null);
                }
                throw error;
            }
        };
        return { mutateAsync };
    }),
}));

// Mock sentinel/services
vi.mock('@sentinel/services', () => ({
    sendMessage: vi.fn(),
}));

// Mock api provider hook
vi.mock('../../api-provider', () => ({
    useApi: vi.fn(() => ({ mockClient: true })),
}));

vi.mock('../../auth-provider', () => ({
    useAuth: vi.fn(() => ({
        user: { id: 'user-uuid-111' },
    })),
}));

describe('useSendMessageMutation Hook', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('calls sendMessage and invalidates cache on success', async () => {
        const payload = { conversationId: 'conv-uuid-123', content: '  Hello there!  ' };

        const mutation = useSendMessageMutation();
        await (mutation as any).mutateAsync(payload);

        expect(sendMessage).toHaveBeenCalledWith(
            { mockClient: true },
            payload.conversationId,
            'Hello there!',
        );
        expect(mockInvalidateQueries).toHaveBeenCalledWith({
            queryKey: MESSAGES_QUERY_KEYS.messages(payload.conversationId),
        });
        expect(mockInvalidateQueries).toHaveBeenCalledWith({
            queryKey: MESSAGES_QUERY_KEYS.conversations(),
        });
        expect(mockSetQueryData).toHaveBeenCalledWith(
            MESSAGES_QUERY_KEYS.messages(payload.conversationId),
            expect.any(Function),
        );
        expect(mockSetQueryData).toHaveBeenCalledWith(
            MESSAGES_QUERY_KEYS.conversations(),
            expect.any(Function),
        );
    });

    it('rejects whitespace-only content before calling the API', async () => {
        const mutation = useSendMessageMutation();

        await expect(
            (mutation as any).mutateAsync({
                conversationId: 'conv-uuid-123',
                content: '   ',
            }),
        ).rejects.toThrow('Message content cannot be empty');

        expect(sendMessage).not.toHaveBeenCalled();
    });
});
