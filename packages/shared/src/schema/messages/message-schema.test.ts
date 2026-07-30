import { describe, it, expect } from 'vitest';
import {
    messageParticipantSchema,
    messageSummarySchema,
    conversationSummarySchema,
    conversationDetailSchema,
    listConversationsResponseSchema,
    listConversationMessagesResponseSchema,
    messageRecipientSchema,
} from './message-schema';

describe('Message Schemas', () => {
    describe('messageRecipientSchema', () => {
        it('should validate a correct recipient object', () => {
            const valid = {
                userId: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
                name: 'John Doe',
                avatarUrl: 'https://example.com/avatar.png',
                role: 'student',
                status: 'ACTIVE',
                institution: {
                    id: '550e8400-e29b-41d4-a716-446655440000',
                    name: 'Sentinel Academy',
                },
            };
            expect(messageRecipientSchema.safeParse(valid).success).toBe(true);
        });

        it('should allow nullable and optional avatarUrl', () => {
            const valid = {
                userId: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
                name: 'John Doe',
                role: 'student',
                status: 'ACTIVE',
                institution: {
                    id: '550e8400-e29b-41d4-a716-446655440000',
                    name: 'Sentinel Academy',
                },
            };
            expect(messageRecipientSchema.safeParse(valid).success).toBe(true);

            const validNull = {
                userId: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
                name: 'John Doe',
                avatarUrl: null,
                role: 'student',
                status: 'ACTIVE',
                institution: {
                    id: '550e8400-e29b-41d4-a716-446655440000',
                    name: 'Sentinel Academy',
                },
            };
            expect(messageRecipientSchema.safeParse(validNull).success).toBe(true);
        });

        it('should reject invalid userId uuid', () => {
            const invalid = {
                userId: 'invalid-uuid',
                name: 'John Doe',
                role: 'student',
                status: 'ACTIVE',
                institution: {
                    id: '550e8400-e29b-41d4-a716-446655440000',
                    name: 'Sentinel Academy',
                },
            };
            expect(messageRecipientSchema.safeParse(invalid).success).toBe(false);
        });

        it('should reject invalid status value', () => {
            const invalid = {
                userId: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
                name: 'John Doe',
                role: 'student',
                status: 'PENDING',
                institution: {
                    id: '550e8400-e29b-41d4-a716-446655440000',
                    name: 'Sentinel Academy',
                },
            };
            expect(messageRecipientSchema.safeParse(invalid).success).toBe(false);
        });
    });

    describe('messageParticipantSchema', () => {
        it('should validate a correct participant object', () => {
            const valid = {
                userId: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
                name: 'John Doe',
                avatarUrl: 'https://example.com/avatar.png',
                role: 'student',
                status: 'ACTIVE',
                institution: {
                    id: '550e8400-e29b-41d4-a716-446655440000',
                    name: 'Sentinel Academy',
                },
                lastSeenAt: new Date().toISOString(),
            };
            expect(messageParticipantSchema.safeParse(valid).success).toBe(true);
        });

        it('should allow nullable and optional avatarUrl', () => {
            const valid = {
                userId: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
                name: 'John Doe',
                role: 'student',
            };
            expect(messageParticipantSchema.safeParse(valid).success).toBe(true);

            const validNull = {
                userId: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
                name: 'John Doe',
                avatarUrl: null,
                role: 'student',
                institution: null,
                lastSeenAt: null,
            };
            expect(messageParticipantSchema.safeParse(validNull).success).toBe(true);
        });

        it('should reject invalid userId uuid', () => {
            const invalid = {
                userId: 'invalid-uuid',
                name: 'John Doe',
                role: 'student',
            };
            expect(messageParticipantSchema.safeParse(invalid).success).toBe(false);
        });
    });

    describe('messageSummarySchema', () => {
        it('should validate a correct message summary object', () => {
            const valid = {
                messageId: '550e8400-e29b-41d4-a716-446655440000',
                conversationId: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
                senderId: 'a7c93cb6-bce7-440a-9db1-3ef5a9b9a67a',
                content: 'Hello world!',
                status: 'SENT',
                createdAt: new Date().toISOString(),
            };
            const parsed = messageSummarySchema.safeParse(valid);
            if (!parsed.success) {
                console.log('messageSummarySchema error:', parsed.error.format());
            }
            expect(parsed.success).toBe(true);
        });

        it('should reject invalid statuses', () => {
            const invalid = {
                messageId: '550e8400-e29b-41d4-a716-446655440000',
                conversationId: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
                senderId: 'a7c93cb6-bce7-440a-9db1-3ef5a9b9a67a',
                content: 'Hello world!',
                status: 'PENDING',
                createdAt: new Date().toISOString(),
            };
            expect(messageSummarySchema.safeParse(invalid).success).toBe(false);
        });
    });

    describe('conversationSummarySchema', () => {
        it('should validate a correct conversation summary', () => {
            const valid = {
                conversationId: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
                type: 'DIRECT',
                createdAt: new Date().toISOString(),
                participants: [
                    {
                        userId: 'a7c93cb6-bce7-440a-9db1-3ef5a9b9a67a',
                        name: 'User 1',
                        role: 'instructor',
                    },
                    {
                        userId: '550e8400-e29b-41d4-a716-446655440000',
                        name: 'User 2',
                        role: 'student',
                    },
                ],
                lastMessage: {
                    messageId: 'b3cd17f8-fb3a-4be0-80de-4ff45037d032',
                    conversationId: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
                    senderId: 'a7c93cb6-bce7-440a-9db1-3ef5a9b9a67a',
                    content: 'Hello world!',
                    status: 'READ',
                    createdAt: new Date().toISOString(),
                },
                unreadCount: 5,
            };
            const parsed = conversationSummarySchema.safeParse(valid);
            if (!parsed.success) {
                console.log('conversationSummarySchema error:', parsed.error.format());
            }
            expect(parsed.success).toBe(true);
        });
    });
});
