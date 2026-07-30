export {
    MOCK_CHAT_USERS as MOCK_USERS,
    MOCK_CONVERSATIONS,
    MOCK_MESSAGES,
} from '../../../mock-data';

/**
 * React Query Keys for Messages module.
 */
export const MESSAGES_QUERY_KEYS = {
    all: ['/messages'] as const,
    conversations: () => ['/messages', 'conversations'] as const,
    messages: (conversationId: string) =>
        ['/messages', 'conversations', conversationId, 'messages'] as const,
    recipients: (search: string, limit?: number) =>
        ['/messages', 'recipients', { search, limit }] as const,
};
