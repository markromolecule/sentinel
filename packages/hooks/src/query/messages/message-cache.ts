import { type QueryClient } from '@tanstack/react-query';
import { type ConversationMessage, type ConversationSummary } from '@sentinel/shared/types';
import { MESSAGES_QUERY_KEYS } from '@sentinel/shared/constants';

type MessageRowLike = {
    message_id?: string;
    messageId?: string;
    conversation_id?: string;
    conversationId?: string;
    sender_id?: string;
    senderId?: string;
    content?: string | null;
    status?: string | null;
    created_at?: string | Date | null;
    createdAt?: string | Date | null;
};

function normalizeMessageRow(row: MessageRowLike): ConversationMessage | null {
    const messageId = row.messageId ?? row.message_id;
    const conversationId = row.conversationId ?? row.conversation_id;
    const senderId = row.senderId ?? row.sender_id;
    const createdAt = row.createdAt ?? row.created_at;

    if (!messageId || !conversationId || !senderId || !createdAt) {
        return null;
    }

    return {
        messageId,
        conversationId,
        senderId,
        content: row.content ?? '',
        status: (row.status as ConversationMessage['status']) ?? 'SENT',
        createdAt: createdAt instanceof Date ? createdAt.toISOString() : new Date(createdAt).toISOString(),
    };
}

function mergeConversationPreview(
    conversations: ConversationSummary[] | undefined,
    message: ConversationMessage,
    currentUserId: string,
) {
    if (!conversations) {
        return conversations;
    }

    let didChange = false;

    const next = conversations.map((conversation) => {
        if (conversation.conversationId !== message.conversationId) {
            return conversation;
        }

        didChange = true;

        return {
            ...conversation,
            lastMessage: message,
            unreadCount:
                message.senderId === currentUserId
                    ? conversation.unreadCount
                    : (conversation.unreadCount ?? 0) + 1,
        };
    });

    return didChange ? next : conversations;
}

function mergeConversationMessages(
    messages: ConversationMessage[] | undefined,
    message: ConversationMessage,
    eventType: string | undefined,
) {
    if (!messages) {
        return messages;
    }

    if (eventType === 'DELETE') {
        return messages.filter((item) => item.messageId !== message.messageId);
    }

    const index = messages.findIndex((item) => item.messageId === message.messageId);
    if (index >= 0) {
        const next = [...messages];
        next[index] = message;
        return next;
    }

    return [...messages, message];
}

export function applyMessageRealtimePayload({
    queryClient,
    payload,
    currentUserId,
    conversationId,
    invalidateList = true,
}: {
    queryClient: QueryClient;
    payload: any;
    currentUserId: string;
    conversationId?: string;
    invalidateList?: boolean;
}) {
    const row = normalizeMessageRow(payload?.new ?? payload?.old ?? payload ?? {});

    if (!row) {
        return;
    }

    const eventType = payload?.eventType as string | undefined;
    const targetConversationId = conversationId ?? row.conversationId;

    if (targetConversationId) {
        queryClient.setQueryData?.<ConversationMessage[]>(
            MESSAGES_QUERY_KEYS.messages(targetConversationId),
            (current) => mergeConversationMessages(current, row, eventType),
        );
    }

    queryClient.setQueryData?.<ConversationSummary[]>(
        MESSAGES_QUERY_KEYS.conversations(),
        (current) => {
            const next = mergeConversationPreview(current, row, currentUserId);
            return next;
        },
    );

    if (invalidateList) {
        void queryClient.invalidateQueries({
            queryKey: MESSAGES_QUERY_KEYS.conversations(),
        });
    }
}

export function clearConversationUnreadCount({
    queryClient,
    conversationId,
}: {
    queryClient: QueryClient;
    conversationId: string;
}) {
    queryClient.setQueryData?.<ConversationSummary[]>(
        MESSAGES_QUERY_KEYS.conversations(),
        (current) =>
            current?.map((conversation) =>
                conversation.conversationId === conversationId
                    ? { ...conversation, unreadCount: 0 }
                    : conversation,
            ),
    );
}
