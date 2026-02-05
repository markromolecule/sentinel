import { Notification } from "@/app/(protected)/student/notifications/_types";

export const MOCK_NOTIFICATIONS: Notification[] = [
    {
        id: "1",
        title: "Upcoming Exam: Advanced Mathematics",
        message: "Your exam for Advanced Mathematics is scheduled for tomorrow at 10:00 AM. Please ensure your environment is ready.",
        type: "exam",
        priority: "high",
        isRead: false,
        date: new Date("2024-03-15T10:00:00"),
        link: "/student/exam/123"
    },
    {
        id: "2",
        title: "System Maintenance",
        message: "The Sentinel platform will undergo scheduled maintenance on Saturday from 2:00 AM to 4:00 AM.",
        type: "system",
        priority: "medium",
        isRead: true,
        date: new Date("2024-03-10T14:30:00")
    },
    {
        id: "3",
        title: "New Assignment Posted",
        message: "A new assignment has been posted for Physics 101.",
        type: "class",
        priority: "low",
        isRead: false,
        date: new Date("2024-03-12T09:15:00"),
        link: "/student/class/phy101"
    },
    {
        id: "4",
        title: "Security Alert: New Login Detected",
        message: "We detected a new login from a different device. If this wasn't you, please change your password immediately.",
        type: "alert",
        priority: "high",
        isRead: false,
        date: new Date("2024-03-14T08:00:00"),
        link: "/student/settings/security"
    },
    {
        id: "5",
        title: "Exam Results Available",
        message: "The results for your History 101 Midterm exam are now available.",
        type: "exam",
        priority: "medium",
        isRead: true,
        date: new Date("2024-03-01T11:00:00"),
        link: "/student/history/his101"
    }
];
