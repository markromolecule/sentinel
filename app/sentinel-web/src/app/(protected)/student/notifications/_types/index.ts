export type NotificationType = "system" | "exam" | "class" | "alert";

export type NotificationPriority = "low" | "medium" | "high";

export interface Notification {
    id: string;
    title: string;
    message: string;
    type: NotificationType;
    priority: NotificationPriority;
    isRead: boolean;
    date: Date;
    link?: string;
}
