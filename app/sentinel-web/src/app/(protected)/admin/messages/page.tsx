"use client";

import { useState } from "react";
import { MessageList } from "./_components/message-list";
import { ChatWindow } from "./_components/chat-window";
import { MOCK_CONVERSATIONS, MOCK_MESSAGES } from "./_constants";
import { Message } from "./_types";

export default function AdminMessagesPage() {
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
    const [conversations, setConversations] = useState(MOCK_CONVERSATIONS);

    // In a real app, this would be fetched or subscribed
    const [messagesMap, setMessagesMap] = useState(MOCK_MESSAGES);

    const selectedConversation = conversations.find(
        (c) => c.id === selectedConversationId
    ) || null;

    const currentMessages = selectedConversationId
        ? messagesMap[selectedConversationId] || []
        : [];

    const handleSendMessage = (content: string) => {
        if (!selectedConversationId) return;

        const newMessage: Message = {
            id: Math.random().toString(36).substr(2, 9),
            senderId: "user-1", // Admin's ID
            content,
            timestamp: new Date().toISOString(),
            isRead: false,
        };

        // Update messages
        setMessagesMap((prev) => ({
            ...prev,
            [selectedConversationId]: [...(prev[selectedConversationId] || []), newMessage],
        }));

        // Update conversation last message
        setConversations((prev) =>
            prev.map((c) =>
                c.id === selectedConversationId
                    ? { ...c, lastMessage: newMessage }
                    : c
            )
        );
    };

    return (
        <div className="h-[calc(100vh-2rem)] flex bg-background rounded-xl border border-border/50 shadow-sm overflow-hidden">
            <MessageList
                conversations={conversations}
                selectedId={selectedConversationId}
                onSelect={setSelectedConversationId}
            />
            <ChatWindow
                conversation={selectedConversation}
                messages={currentMessages}
                currentUserId="user-1"
                onSendMessage={handleSendMessage}
                onBack={() => setSelectedConversationId(null)}
            />
        </div>
    );
}
