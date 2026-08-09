import { Message } from '../components/message-item';

/**
 * Filters the list of mapped conversation messages based on participant name or last message content.
 *
 * @param messages Array of mapped conversation messages.
 * @param query Search query text.
 */
export function filterConversations(messages: Message[], query: string): Message[] {
    if (!messages) return [];
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return messages;

    return messages.filter(
        (msg) =>
            msg.name.toLowerCase().includes(trimmed) ||
            msg.lastMessage.toLowerCase().includes(trimmed)
    );
}
