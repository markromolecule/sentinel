'use client';

import { useState, useEffect, useDeferredValue, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import {
    useConversationsQuery,
    useConversationMessagesQuery,
    useSendMessageMutation,
    useMarkConversationReadMutation,
    useMessageRealtime,
    usePresence,
    useProfileQuery,
    useMessageRecipientsQuery,
    useCreateDirectConversationMutation,
} from '@sentinel/hooks';

import { Conversation, Message } from '../../_types';
import { DEEP_LINK_PARAM } from '../../_constants';
import { UseProctorMessagesReturn } from './_types';

/**
 * Custom hook managing the data fetching, presence, deep-linking, mutations,
 * and state transformations for the proctor messaging workspace.
 */
export function useProctorMessages(): UseProctorMessagesReturn {
    const hasFiredDeepLinkRef = useRef(false);
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [showDirectory, setShowDirectory] = useState(false);
    const [directorySearch, setDirectorySearch] = useState('');

    const { profile, isLoading: isProfileLoading } = useProfileQuery();
    const { onlineUserIds } = usePresence();

    // Enable realtime subscriptions globally to listen for any incoming database messages
    useMessageRealtime({ enabled: !!profile });

    const conversationsQuery = useConversationsQuery({
        enabled: !!profile,
    });

    const conversations = conversationsQuery.data ?? [];

    const messagesQuery = useConversationMessagesQuery({
        conversationId: selectedConversationId ?? '',
        enabled: !!selectedConversationId,
    });

    const currentMessagesRaw = messagesQuery.data ?? [];

    const sendMessageMutation = useSendMessageMutation();
    const markReadMutation = useMarkConversationReadMutation();

    // Query system users for direct messaging directory
    const deferredDirectorySearch = useDeferredValue(directorySearch);
    const directoryQuery = useMessageRecipientsQuery(
        showDirectory ? deferredDirectorySearch : '',
        20,
    );
    const rawDirectoryUsers = directoryQuery.data ?? [];

    const createDirectConversationMutation = useCreateDirectConversationMutation({
        onSuccess: (conversation) => {
            setSelectedConversationId(conversation.conversationId);
            setShowDirectory(false);
            setDirectorySearch('');
        },
    });

    const lastMarkedConversationIdRef = useRef<string | null>(null);

    // Mark as read when selecting conversation
    useEffect(() => {
        if (!selectedConversationId) return;

        const selectedConversation = conversations.find(
            (c) => c.conversationId === selectedConversationId,
        );
        if (!selectedConversation) return;

        if (selectedConversation.unreadCount === 0) {
            if (lastMarkedConversationIdRef.current === selectedConversationId) {
                lastMarkedConversationIdRef.current = null;
            }
            return;
        }

        if (lastMarkedConversationIdRef.current === selectedConversationId) {
            return;
        }

        lastMarkedConversationIdRef.current = selectedConversationId;
        markReadMutation.mutate({ conversationId: selectedConversationId });
    }, [selectedConversationId, conversations, markReadMutation]);

    const handleSendMessage = async (content: string) => {
        if (!selectedConversationId) return;
        try {
            await sendMessageMutation.mutateAsync({
                conversationId: selectedConversationId,
                content,
            });
        } catch (err) {
            console.error('Failed to send message:', err);
        }
    };

    const handleStartConversation = useCallback(
        async (recipientId: string) => {
            try {
                await createDirectConversationMutation.mutateAsync({ recipientId });
            } catch (err) {
                console.error('Failed to start conversation:', err);
            }
        },
        [createDirectConversationMutation],
    );

    const searchParams = useSearchParams();
    const targetUserId = searchParams ? searchParams.get(DEEP_LINK_PARAM) : null;

    useEffect(() => {
        if (!targetUserId || !profile || conversationsQuery.isLoading) return;
        if (hasFiredDeepLinkRef.current) return;

        hasFiredDeepLinkRef.current = true;

        const existingConversation = conversations.find((c) =>
            c.participants.some((p) => p.userId === targetUserId),
        );

        if (existingConversation) {
            setTimeout(() => {
                setSelectedConversationId(existingConversation.conversationId);
            }, 0);
        } else {
            setTimeout(() => {
                void handleStartConversation(targetUserId);
            }, 0);
        }
    }, [
        targetUserId,
        conversations,
        profile,
        conversationsQuery.isLoading,
        handleStartConversation,
    ]);

    const currentUserId = profile?.id ?? '';

    // Map DB ConversationSummary to UI Conversation
    const mappedConversations: Conversation[] = conversations.map((c) => {
        const otherParticipants = c.participants.filter((p) => p.userId !== currentUserId);
        const selfParticipant = c.participants.filter((p) => p.userId === currentUserId);
        const sortedParticipants = [...otherParticipants, ...selfParticipant];

        const participants = sortedParticipants.map((p) => ({
            id: p.userId,
            name: p.name,
            avatar: p.avatarUrl || undefined,
            avatarUrl: p.avatarUrl || undefined,
            status: onlineUserIds.has(p.userId) ? ('online' as const) : ('offline' as const),
            role: p.role as any,
            institution: p.institution ?? null,
        }));

        return {
            id: c.conversationId,
            participants,
            lastMessage: c.lastMessage
                ? {
                      id: c.lastMessage.messageId,
                      senderId: c.lastMessage.senderId,
                      content: c.lastMessage.content,
                      timestamp: c.lastMessage.createdAt,
                      isRead: c.lastMessage.status === 'READ',
                  }
                : undefined,
            unreadCount: c.unreadCount,
        };
    });

    // Client-side search filtering for active conversations list
    const filteredConversations = mappedConversations.filter((c) => {
        // Hide empty conversations unless it is the currently selected one
        if (!c.lastMessage && c.id !== selectedConversationId) {
            return false;
        }

        const query = searchTerm.trim().toLowerCase();
        if (!query) return true;
        const mainParticipant = c.participants[0];
        const nameMatch = mainParticipant?.name?.toLowerCase().includes(query);
        const contentMatch = c.lastMessage?.content?.toLowerCase().includes(query);
        return nameMatch || contentMatch;
    });

    const selectedConversation =
        mappedConversations.find((c) => c.id === selectedConversationId) || null;

    // Filter out logged-in user and map properties to UI format
    const directoryUsersFiltered = rawDirectoryUsers.map((u: any) => ({
        id: u.userId,
        name: u.name,
        avatarUrl: u.avatarUrl,
        role: u.role,
        institution: u.institution?.name ?? null,
    }));

    // Map DB ConversationMessage to UI Message
    const mappedMessages: Message[] = currentMessagesRaw.map((m) => ({
        id: m.messageId,
        senderId: m.senderId,
        content: m.content,
        timestamp: m.createdAt,
        isRead: m.status === 'READ',
    }));

    return {
        selectedConversationId,
        setSelectedConversationId,
        searchTerm,
        setSearchTerm,
        showDirectory,
        setShowDirectory,
        directorySearch,
        setDirectorySearch,
        profile,
        onlineUserIds,
        filteredConversations,
        directoryUsersFiltered,
        selectedConversation,
        mappedMessages,
        currentUserId,
        handleSendMessage,
        handleStartConversation,
        isProfileLoading,
        isConversationsLoading: conversationsQuery.isLoading,
        isMessagesLoading: messagesQuery.isLoading,
        isCreatingConversation: createDirectConversationMutation.isPending,
    };
}
