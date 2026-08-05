'use client';

import { useState, useEffect, useDeferredValue, useRef, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { MessageList } from './_components/message-list';
import { ChatWindow } from './_components/chat-window';
import {
    useConversationsQuery,
    useConversationMessagesQuery,
    useSendMessageMutation,
    useMarkConversationReadMutation,
    useMessageRealtime,
    usePresence,
    useProfileQuery,
    useUsersQuery,
    useCreateDirectConversationMutation,
} from '@sentinel/hooks';
import { Conversation, Message } from '@sentinel/shared/types';
import { Spinner } from '@sentinel/ui';

function AdminMessagesPageContent() {
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
    const directoryQuery = useUsersQuery({
        search: deferredDirectorySearch,
        enabled: showDirectory,
    });
    const rawDirectoryUsers = directoryQuery.data ?? [];

    const createDirectConversationMutation = useCreateDirectConversationMutation({
        onSuccess: (conversation) => {
            setSelectedConversationId(conversation.conversationId);
            setShowDirectory(false);
            setDirectorySearch('');
        },
    });

    const lastMarkedConversationIdRef = useRef<string | null>(null);

    useMessageRealtime({
        enabled: !!profile && !!selectedConversationId,
        conversationId: selectedConversationId ?? undefined,
        invalidateList: false,
    });

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
    const targetUserId = searchParams.get('userId');

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
                handleStartConversation(targetUserId);
            }, 0);
        }
    }, [
        targetUserId,
        conversations,
        profile,
        conversationsQuery.isLoading,
        handleStartConversation,
    ]);

    if (isProfileLoading || conversationsQuery.isLoading || !profile) {
        return (
            <div className="flex h-full items-center justify-center">
                <Spinner className="text-primary size-8" />
            </div>
        );
    }

    const currentUserId = profile.id;

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

    // Filter out logged-in user from searchable user directory list
    const directoryUsersFiltered = rawDirectoryUsers.filter((u) => u.id !== currentUserId);

    // Map DB ConversationMessage to UI Message
    const mappedMessages: Message[] = currentMessagesRaw.map((m) => ({
        id: m.messageId,
        senderId: m.senderId,
        content: m.content,
        timestamp: m.createdAt,
        isRead: m.status === 'READ',
    }));

    return (
        <div className="flex h-[calc(100dvh-4rem)] max-h-[calc(100dvh-4rem)] min-h-0 flex-1 overflow-hidden">
            <MessageList
                conversations={filteredConversations}
                selectedId={selectedConversationId}
                onSelect={setSelectedConversationId}
                searchTerm={showDirectory ? directorySearch : searchTerm}
                onSearchChange={showDirectory ? setDirectorySearch : setSearchTerm}
                showDirectory={showDirectory}
                onToggleDirectory={() => {
                    setShowDirectory((prev) => !prev);
                    setDirectorySearch('');
                    setSearchTerm('');
                }}
                directoryUsers={directoryUsersFiltered}
                onSelectUser={handleStartConversation}
                isCreatingConversation={createDirectConversationMutation.isPending}
                isLoading={conversationsQuery.isLoading}
            />
            <ChatWindow
                conversation={selectedConversation}
                messages={mappedMessages}
                currentUserId={currentUserId}
                onSendMessage={handleSendMessage}
                onBack={() => setSelectedConversationId(null)}
                isLoading={messagesQuery.isLoading}
            />
        </div>
    );
}

/**
 * Protected messages page wrapper for `sentinel-core`.
 */
export default function AdminMessagesPage() {
    return (
        <Suspense
            fallback={
                <div className="flex h-full items-center justify-center">
                    <Spinner className="text-primary size-8" />
                </div>
            }
        >
            <AdminMessagesPageContent />
        </Suspense>
    );
}
