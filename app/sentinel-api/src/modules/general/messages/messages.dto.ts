import { z } from '@hono/zod-openapi';

// ─── Shared Nested Schemas ───────────────────────────────────────────────────

export const messageParticipantOpenApi = z
    .object({
        userId: z.string().uuid(),
        name: z.string(),
        avatarUrl: z.string().nullable().optional(),
        role: z.string(),
        status: z.enum(['ACTIVE', 'INACTIVE']).nullable().optional(),
        institution: z
            .object({
                id: z.string().uuid(),
                name: z.string(),
            })
            .nullable()
            .optional(),
        lastSeenAt: z.string().nullable().optional(),
    })
    .openapi('MessageParticipant');

export const messageSummaryOpenApi = z
    .object({
        messageId: z.string().uuid(),
        conversationId: z.string().uuid(),
        senderId: z.string().uuid(),
        content: z.string(),
        status: z.enum(['SENT', 'DELIVERED', 'READ']),
        createdAt: z.string(),
    })
    .openapi('ConversationMessage');

export const conversationSummaryOpenApi = z
    .object({
        conversationId: z.string().uuid(),
        type: z.string().nullable().optional(),
        createdAt: z.string(),
        updatedAt: z.string().nullable().optional(),
        participants: z.array(messageParticipantOpenApi),
        lastMessage: messageSummaryOpenApi.nullable().optional(),
        unreadCount: z.number().int().nonnegative(),
    })
    .openapi('ConversationSummary');

export const conversationDetailOpenApi = z
    .object({
        conversationId: z.string().uuid(),
        type: z.string().nullable().optional(),
        createdAt: z.string(),
        updatedAt: z.string().nullable().optional(),
        participants: z.array(messageParticipantOpenApi),
    })
    .openapi('ConversationDetail');

// ─── GET /messages/conversations ─────────────────────────────────────────────

export const getConversationsSchema = {
    response: z
        .object({
            success: z.boolean(),
            message: z.string(),
            data: z.array(conversationSummaryOpenApi),
        })
        .openapi('GetConversationsResponse'),
};

// ─── GET /messages/conversations/:conversationId/messages ─────────────────────

export const getConversationMessagesSchema = {
    params: z.object({
        conversationId: z.string().uuid('Invalid conversation ID format'),
    }),
    response: z
        .object({
            success: z.boolean(),
            message: z.string(),
            data: z.array(messageSummaryOpenApi),
        })
        .openapi('GetConversationMessagesResponse'),
};

// ─── POST /messages/conversations/direct ──────────────────────────────────────

const createDirectConversationBody = z
    .object({
        recipientId: z.string().uuid('Invalid recipient user ID format'),
    })
    .openapi('CreateDirectConversationBody');

export const createDirectConversationSchema = {
    body: createDirectConversationBody,
    response: z
        .object({
            success: z.boolean(),
            message: z.string(),
            data: conversationDetailOpenApi,
        })
        .openapi('CreateDirectConversationResponse'),
};

// ─── POST /messages/conversations/:conversationId/messages ─────────────────────

const sendMessageBody = z
    .object({
        content: z.string().min(1, 'Message content cannot be empty'),
    })
    .openapi('SendMessageBody');

export const sendMessageSchema = {
    params: z.object({
        conversationId: z.string().uuid('Invalid conversation ID format'),
    }),
    body: sendMessageBody,
    response: z
        .object({
            success: z.boolean(),
            message: z.string(),
            data: messageSummaryOpenApi,
        })
        .openapi('SendMessageResponse'),
};

// ─── POST /messages/conversations/:conversationId/read ────────────────────────

export const markConversationReadSchema = {
    params: z.object({
        conversationId: z.string().uuid('Invalid conversation ID format'),
    }),
    response: z
        .object({
            success: z.boolean(),
            message: z.string(),
            data: z.object({
                success: z.boolean(),
            }),
        })
        .openapi('MarkConversationReadResponse'),
};

// ─── GET /messages/recipients ─────────────────────────────────────────────────

export const messageRecipientOpenApi = z
    .object({
        userId: z.string().uuid(),
        name: z.string(),
        avatarUrl: z.string().nullable().optional(),
        role: z.string(),
        status: z.enum(['ACTIVE', 'INACTIVE']),
        institution: z.object({
            id: z.string().uuid(),
            name: z.string(),
        }),
    })
    .openapi('MessageRecipient');

export const getMessageRecipientsSchema = {
    query: z.object({
        search: z.string().trim().min(2, 'Search term must be at least 2 characters').max(100, 'Search term is too long'),
        limit: z
            .string()
            .optional()
            .transform((val) => (val ? parseInt(val, 10) : 20))
            .pipe(z.number().int().min(1).max(20)),
    }),
    response: z
        .object({
            success: z.boolean(),
            message: z.string(),
            data: z.array(messageRecipientOpenApi),
        })
        .openapi('GetMessageRecipientsResponse'),
};

