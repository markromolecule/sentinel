import { type DbClient } from '@sentinel/db';
import { HTTPException } from 'hono/http-exception';
import {
    findDirectConversationData,
    createConversationData,
    addConversationParticipantsData,
    createMessageData,
    markConversationReadData,
    getConversationByIdData,
} from '../data';
import { mapConversationDetailRecord, mapMessageRecord } from './message-mapper';
import { NotificationService } from '../../notification/notification.service';
import { LogsService } from '../../logs/logs.service';
import { assertEligibleDirectMessageRecipient } from './message-recipient-eligibility.service';

/**
 * Creates a direct 1:1 conversation between two users.
 * If a direct conversation already exists between them, it returns the existing one.
 *
 * @param dbClient - Kysely database client.
 * @param args - Arguments containing userId (sender) and recipientId.
 * @returns Mapped ConversationDetail details.
 */
export async function createDirectConversation(
    dbClient: DbClient,
    { userId, recipientId }: { userId: string; recipientId: string },
) {
    if (userId === recipientId) {
        throw new HTTPException(400, { message: 'Cannot start a conversation with yourself.' });
    }

    const requesterProfile = await dbClient
        .selectFrom('user_profiles')
        .select(['institution_id'])
        .where('user_id', '=', userId)
        .executeTakeFirst();
    const institutionId = requesterProfile?.institution_id;

    const roleRow = await dbClient
        .selectFrom('user_roles as ur')
        .innerJoin('roles as r', 'r.role_id', 'ur.role_id')
        .select('r.role_name as roleName')
        .where('ur.user_id', '=', userId)
        .orderBy('r.is_system', 'desc')
        .orderBy('r.domain_scope', 'asc')
        .executeTakeFirst();
    const requesterRole = roleRow?.roleName ?? null;

    if (requesterRole === 'student') {
        if (!institutionId) {
            throw new HTTPException(400, {
                message: 'Institution ID is required for student conversations.',
            });
        }
        await assertEligibleDirectMessageRecipient(dbClient, {
            requesterUserId: userId,
            requesterRole,
            institutionId,
            recipientId,
        });
    } else {
        // 1. Verify that the recipient exists
        const recipientExists = await dbClient
            .selectFrom('user_profiles')
            .select('user_id')
            .where('user_id', '=', recipientId)
            .executeTakeFirst();

        if (!recipientExists) {
            throw new HTTPException(404, { message: 'Recipient user profile not found.' });
        }
    }

    // 2. Check if a direct conversation already exists
    const existingId = await findDirectConversationData(dbClient, {
        userAId: userId,
        userBId: recipientId,
    });

    if (existingId) {
        const conversation = await getConversationByIdData(dbClient, {
            conversationId: existingId,
            userId,
        });
        if (conversation) {
            return mapConversationDetailRecord(conversation);
        }
    }

    // 3. Create conversation and add participants sequentially (avoiding Kysely transactions as prisma-extension-kysely does not support them)
    const newConversationId = await createConversationData(dbClient, { type: 'DIRECT' });
    await addConversationParticipantsData(dbClient, {
        conversationId: newConversationId,
        userIds: [userId, recipientId],
    });

    const newConversation = await getConversationByIdData(dbClient, {
        conversationId: newConversationId,
        userId,
    });

    if (!newConversation) {
        throw new HTTPException(500, { message: 'Failed to retrieve newly created conversation.' });
    }

    const senderProfile = await dbClient
        .selectFrom('user_profiles')
        .select(['institution_id'])
        .where('user_id', '=', userId)
        .executeTakeFirst();
    const activeInstitutionId = senderProfile?.institution_id ?? undefined;

    if (activeInstitutionId) {
        try {
            await LogsService.createLog(dbClient, {
                userId,
                action: 'conversation.created',
                resourceType: 'conversation',
                resourceId: newConversationId,
                activeInstitutionId,
                details: {
                    recipientId,
                    type: 'DIRECT',
                },
            });
        } catch (logErr) {
            console.error('Failed to log conversation.created:', logErr);
        }
    }

    return mapConversationDetailRecord(newConversation);
}

/**
 * Sends a message in a conversation.
 * Verifies that the sender is a participant first.
 *
 * @param dbClient - Kysely database client.
 * @param args - Arguments containing conversationId, senderId, and message content.
 * @returns Mapped ConversationMessage.
 */
export async function sendMessage(
    dbClient: DbClient,
    {
        conversationId,
        senderId,
        content,
    }: {
        conversationId: string;
        senderId: string;
        content: string;
    },
) {
    // 1. Verify membership
    const isParticipant = await dbClient
        .selectFrom('conversation_participants')
        .select('conversation_id')
        .where('conversation_id', '=', conversationId)
        .where('user_id', '=', senderId)
        .executeTakeFirst();

    if (!isParticipant) {
        throw new HTTPException(403, {
            message: 'You are not a participant in this conversation.',
        });
    }

    // 2. Create the message
    const record = await createMessageData(dbClient, {
        conversationId,
        senderId,
        content,
    });

    const senderProfile = await dbClient
        .selectFrom('user_profiles')
        .select(['institution_id'])
        .where('user_id', '=', senderId)
        .executeTakeFirst();
    const activeInstitutionId = senderProfile?.institution_id ?? undefined;

    // 3. Trigger database notifications for other participants in the conversation
    try {
        const otherParticipants = await dbClient
            .selectFrom('conversation_participants')
            .select('user_id')
            .where('conversation_id', '=', conversationId)
            .where('user_id', '!=', senderId)
            .execute();

        if (otherParticipants.length > 0) {
            const sender = await dbClient
                .selectFrom('user_profiles')
                .select(['first_name', 'last_name'])
                .where('user_id', '=', senderId)
                .executeTakeFirst();

            const senderName = sender
                ? [sender.first_name, sender.last_name].filter(Boolean).join(' ')
                : 'Someone';

            for (const participant of otherParticipants) {
                await NotificationService.createNotification({
                    dbClient,
                    recipientUserId: participant.user_id,
                    actorUserId: senderId,
                    institutionId: activeInstitutionId,
                    title: 'New Message',
                    message: `${senderName} messaged you: "${
                        content.length > 60 ? content.slice(0, 57) + '...' : content
                    }"`,
                    actionType: 'INSTITUTION_ACTIVITY_CREATED',
                    resourceType: 'INSTITUTION_ACTIVITY',
                    resourceId: conversationId,
                    resourceLabel: 'Message Thread',
                    metadata: {
                        institutionId: activeInstitutionId || null,
                        conversationId,
                        senderId,
                    },
                });
            }
        }
    } catch (err) {
        console.error('Failed to trigger database notification for message:', err);
    }

    if (activeInstitutionId) {
        try {
            await LogsService.createLog(dbClient, {
                userId: senderId,
                action: 'message.sent',
                resourceType: 'message',
                resourceId: record.messageId,
                activeInstitutionId,
                details: {
                    conversationId,
                    contentLength: content.length,
                },
            });
        } catch (logErr) {
            console.error('Failed to log message.sent:', logErr);
        }
    }

    return mapMessageRecord(record);
}

/**
 * Marks a conversation as read by updating the last_read_at timestamp for a user.
 *
 * @param dbClient - Kysely database client.
 * @param args - Arguments containing conversationId and userId.
 * @returns Object indicating success.
 */
export async function markConversationRead(
    dbClient: DbClient,
    { conversationId, userId }: { conversationId: string; userId: string },
) {
    // 1. Verify membership
    const isParticipant = await dbClient
        .selectFrom('conversation_participants')
        .select('conversation_id')
        .where('conversation_id', '=', conversationId)
        .where('user_id', '=', userId)
        .executeTakeFirst();

    if (!isParticipant) {
        throw new HTTPException(403, {
            message: 'You are not a participant in this conversation.',
        });
    }

    // 2. Update last_read_at
    await markConversationReadData(dbClient, { conversationId, userId });

    return { success: true };
}
