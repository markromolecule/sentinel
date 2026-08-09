import { describe, expect, it } from 'vitest';
import { filterConversations } from './conversation-search';
import { Message } from '../components/message-item';

describe('filterConversations utility', () => {
    const mockMessages: Message[] = [
        {
            id: '1',
            senderIndex: 0,
            name: 'Dr. Sarah Wilson',
            lastMessage: 'Your test results are ready for review.',
            time: '10:30 AM',
            unreadCount: 2,
            isOnline: true,
        },
        {
            id: '2',
            senderIndex: 1,
            name: 'Clinic Support',
            lastMessage: 'Please confirm your appointment for tomorrow.',
            time: 'Yesterday',
            unreadCount: 0,
        },
    ];

    it('returns empty array if messages list is empty', () => {
        expect(filterConversations(null as any, 'sarah')).toEqual([]);
        expect(filterConversations(undefined as any, 'sarah')).toEqual([]);
        expect(filterConversations([], 'sarah')).toEqual([]);
    });

    it('returns all messages if query is empty', () => {
        expect(filterConversations(mockMessages, '')).toEqual(mockMessages);
        expect(filterConversations(mockMessages, '   ')).toEqual(mockMessages);
    });

    it('filters messages matching participant name case-insensitively', () => {
        const result = filterConversations(mockMessages, 'sarah');
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('1');
    });

    it('filters messages matching last message content case-insensitively', () => {
        const result = filterConversations(mockMessages, 'appointment');
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('2');
    });

    it('returns empty list if query matches nothing', () => {
        expect(filterConversations(mockMessages, 'unmatched-query')).toEqual([]);
    });
});
