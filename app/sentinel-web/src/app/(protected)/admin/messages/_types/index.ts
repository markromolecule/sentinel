export type UserStatus = "online" | "offline" | "busy";

export interface User {
    id: string;
    name: string;
    avatar?: string;
    status: UserStatus;
    role: "admin" | "proctor" | "student";
}

export interface Message {
    id: string;
    senderId: string;
    content: string;
    timestamp: string;
    isRead: boolean;
}

export interface Conversation {
    id: string;
    participants: User[];
    lastMessage?: Message;
    unreadCount?: number;
}
