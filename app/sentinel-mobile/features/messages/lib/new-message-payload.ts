import type { MessageRecipient, CreateDirectConversationPayload } from '@sentinel/shared/types';

/**
 * Builds the payload for starting a direct conversation from a selected message recipient.
 *
 * @param recipient The selected message recipient.
 */
export function buildCreateDirectConversationPayload(
    recipient: MessageRecipient
): CreateDirectConversationPayload {
    if (!recipient || !recipient.userId) {
        throw new Error('Recipient must have a valid userId');
    }
    return {
        recipientId: recipient.userId,
    };
}
