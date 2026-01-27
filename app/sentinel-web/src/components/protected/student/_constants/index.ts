import { Home, History, MessageSquare, Calendar, Settings } from "lucide-react";

// Bottom Navigation Items
export const BOTTOM_NAV_ITEMS = [
    { label: "Exams", href: "/student/exam", icon: Home },
    { label: "History", href: "/student/history", icon: History },
    { label: "Calendar", href: "/student/calendar", icon: Calendar },
    { label: "Messages", href: "/student/message", icon: MessageSquare },
] as const;

// Header Navigation Items
export const HEADER_NAV_ITEMS = [
    { label: "Exams", href: "/student/exam", icon: Home },
    { label: "History", href: "/student/history", icon: History },
    { label: "Calendar", href: "/student/calendar", icon: Calendar },
    { label: "Messages", href: "/student/message", icon: MessageSquare },
    { label: "Settings", href: "/student/setting", icon: Settings },
] as const;

// Cheating Report Props    
export interface CheatingReportProps {
    cheated?: boolean;
    cheatingType?: string;
}