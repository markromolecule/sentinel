import * as queryService from './services/message-query.service';
import * as writeService from './services/message-write.service';
import { listEligibleMessageRecipients } from './services/message-recipient-eligibility.service';

/**
 * Messages Service Facade.
 * Handles querying and writing operations for direct messaging.
 */
export const MessagesService = {
    /**
     * Lists all conversations the user is participating in.
     */
    listConversations: queryService.listConversations,

    /**
     * Lists eligible message recipients based on institution search criteria.
     */
    listMessageRecipients: listEligibleMessageRecipients,

    /**
     * Lists all messages in a conversation, verifying participant access.
     */
    listConversationMessages: queryService.listConversationMessages,

    /**
     * Creates a direct 1:1 conversation between two users.
     */
    createDirectConversation: writeService.createDirectConversation,

    /**
     * Sends a message in a conversation.
     */
    sendMessage: writeService.sendMessage,

    /**
     * Marks a conversation as read by the user.
     */
    markConversationRead: writeService.markConversationRead,
};

