import { Conversation, User } from "../_types";

export const MOCK_USERS: User[] = [
    {
        id: "user-1",
        name: "Dr. Sarah Admin",
        status: "online",
        role: "admin",
        avatar: "/avatars/01.png",
    },
    {
        id: "user-2",
        name: "John Proctor",
        status: "busy",
        role: "proctor",
        avatar: "/avatars/02.png",
    },
    {
        id: "user-3",
        name: "Jane Student",
        status: "offline",
        role: "student",
        avatar: "/avatars/03.png",
    },
    {
        id: "user-4",
        name: "Mike Tech",
        status: "online",
        role: "proctor",
        avatar: "/avatars/04.png",
    },
];

export const MOCK_CONVERSATIONS: Conversation[] = [
    {
        id: "conv-1",
        participants: [MOCK_USERS[1]],
        lastMessage: {
            id: "msg-1",
            senderId: "user-2",
            content: "Can you review the latest exam logs?",
            timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 mins ago
            isRead: false,
        },
        unreadCount: 1,
    },
    {
        id: "conv-2",
        participants: [MOCK_USERS[2]],
        lastMessage: {
            id: "msg-2",
            senderId: "user-1",
            content: "Your appeal has been processed.",
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
            isRead: true,
        },
        unreadCount: 0,
    },
    {
        id: "conv-3",
        participants: [MOCK_USERS[3]],
        lastMessage: {
            id: "msg-3",
            senderId: "user-4",
            content: "System maintenance scheduled for tonight.",
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
            isRead: true,
        },
        unreadCount: 0,
    },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const MOCK_MESSAGES: Record<string, any[]> = {
    "conv-1": [
        {
            id: "m-1",
            senderId: "user-2",
            content: "Hi Dr. Sarah, are you available?",
            timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
            isRead: true,
        },
        {
            id: "m-2",
            senderId: "user-1",
            content: "Yes, John. What's up?",
            timestamp: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
            isRead: true,
        },
        {
            id: "m-3",
            senderId: "user-2",
            content: "Can you review the latest exam logs? I see some anomalies.",
            timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
            isRead: false,
        },
    ],
    "conv-2": [
        {
            id: "m-4",
            senderId: "user-3",
            content: "Hello, I wanted to ask about my exam grade.",
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
            isRead: true,
        },
        {
            id: "m-5",
            senderId: "user-1",
            content: "Your appeal has been processed. You should see the update soon.",
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
            isRead: true,
        },
    ],
    "conv-3": [],
};
