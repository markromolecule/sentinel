import { describe, expect, it } from 'vitest';
import { buildCreateDirectConversationPayload } from './new-message-payload';
import type { MessageRecipient } from '@sentinel/shared/types';

describe('buildCreateDirectConversationPayload utility', () => {
    it('builds valid payload from message recipient', () => {
        const recipient: MessageRecipient = {
            userId: 'user-123',
            name: 'Sarah Wilson',
            avatarUrl: null,
            role: 'INSTRUCTOR',
            status: 'ACTIVE',
            institution: { id: 'inst-1', name: 'Sentinel Uni' },
        };

        const result = buildCreateDirectConversationPayload(recipient);
        expect(result).toEqual({ recipientId: 'user-123' });
    });

    it('throws error if recipient has missing userId', () => {
        const invalidRecipient = {
            name: 'Sarah Wilson',
        } as any;

        expect(() => buildCreateDirectConversationPayload(invalidRecipient)).toThrow(
            'Recipient must have a valid userId'
        );
    });
});
