import { describe, expect, it } from 'vitest';
import { getAggregateUnreadCount, type ConversationWithUnread } from './unread-count';

describe('getAggregateUnreadCount utility', () => {
    it('returns 0 if no conversations are provided', () => {
        expect(getAggregateUnreadCount([])).toBe(0);
        expect(getAggregateUnreadCount(null)).toBe(0);
        expect(getAggregateUnreadCount(undefined)).toBe(0);
    });

    it('sums the unreadCount values from all conversations', () => {
        const mockConvs: ConversationWithUnread[] = [
            { unreadCount: 2 },
            { unreadCount: 0 },
            { unreadCount: 5 },
        ];
        expect(getAggregateUnreadCount(mockConvs)).toBe(7);
    });

    it('handles negative unread counts by keeping mathematical sum', () => {
        const mockConvs: ConversationWithUnread[] = [{ unreadCount: 3 }, { unreadCount: -1 }];
        expect(getAggregateUnreadCount(mockConvs)).toBe(2);
    });
});
