import { z } from 'zod';
import {
    messageParticipantSchema,
    messageStatusSchema,
    messageSummarySchema,
    conversationSummarySchema,
    conversationDetailSchema,
    listConversationsResponseSchema,
    listConversationMessagesResponseSchema,
    messageRecipientSchema,
} from '../../schema/messages/message-schema';


/**
 * Participant of a conversation.
 */
export type MessageParticipant = z.infer<typeof messageParticipantSchema>;

/**
 * Message status (SENT, DELIVERED, READ).
 */
export type MessageStatus = z.infer<typeof messageStatusSchema>;

/**
 * A message in a conversation.
 */
export type ConversationMessage = z.infer<typeof messageSummarySchema>;

/**
 * Summary details of a conversation.
 */
export type ConversationSummary = z.infer<typeof conversationSummarySchema>;

/**
 * Full details of a conversation.
 */
export type ConversationDetail = z.infer<typeof conversationDetailSchema>;

/**
 * Response shape for listing conversations.
 */
export type ListConversationsResponse = z.infer<typeof listConversationsResponseSchema>;

/**
 * Response shape for listing messages.
 */
export type ListConversationMessagesResponse = z.infer<
    typeof listConversationMessagesResponseSchema
>;

/**
 * Payload for starting a direct 1:1 conversation.
 */
export interface CreateDirectConversationPayload {
    recipientId: string;
}

/**
 * Payload for sending a message.
 */
export interface SendMessagePayload {
    content: string;
}

/**
 * A messageable recipient.
 */
export type MessageRecipient = z.infer<typeof messageRecipientSchema>;

