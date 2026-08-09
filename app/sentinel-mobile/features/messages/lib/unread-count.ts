export interface ConversationWithUnread {
    unreadCount: number;
}

/**
 * Aggregates the total number of unread messages across all active conversations.
 *
 * @param conversations Array of conversations containing unread counts.
 */
export function getAggregateUnreadCount(conversations?: ConversationWithUnread[] | null): number {
    if (!conversations) return 0;
    return conversations.reduce((total, conv) => total + (conv.unreadCount || 0), 0);
}
