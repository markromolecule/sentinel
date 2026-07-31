import {
    LucideIcon,
    Activity,
    BarChart3,
    ClipboardList,
    FileText,
    LayoutDashboard,
    School2,
    Building2,
    CalendarDays,
    Users,
    ShieldCheck,
    FileStack,
    DoorOpen,
    BookOpen,
    Layers3,
    Library,
    MessageSquare,
    Megaphone,
    HelpCircle,
} from 'lucide-react';

export interface SubItem {
    title: string;
    url: string;
}

export interface SidebarItem {
    title: string;
    url: string;
    icon: LucideIcon;
    subItems?: SubItem[];
}

export const DASHBOARD_ITEMS: SidebarItem[] = [
    {
        title: 'Overview',
        url: '/dashboard',
        icon: LayoutDashboard,
    },
    {
        title: 'Calendar',
        url: '/calendar',
        icon: CalendarDays,
    },
];

export const MANAGEMENT_ITEMS: SidebarItem[] = [
    {
        title: 'Institutions',
        url: '/institutions',
        icon: School2,
    },
    {
        title: 'Departments',
        url: '/departments',
        icon: Building2,
    },
    {
        title: 'Programs',
        url: '/courses',
        icon: Library,
    },
    {
        title: 'Subjects',
        url: '/subjects',
        icon: BookOpen,
    },
    {
        title: 'Sections',
        url: '/sections',
        icon: Layers3,
    },
    {
        title: 'Term',
        url: '/semesters',
        icon: CalendarDays,
    },
    {
        title: 'Rooms',
        url: '/rooms',
        icon: DoorOpen,
    },
];

export const USER_MANAGEMENT_ITEMS: SidebarItem[] = [
    {
        title: 'Identity & Access',
        url: '/users',
        icon: Users,
    },
];

export const CONFIGURATION_ITEMS: SidebarItem[] = [
    {
        title: 'Access Control',
        url: '/control',
        icon: ShieldCheck,
    },
    {
        title: 'PDF Templates',
        url: '/pdf-templates',
        icon: FileStack,
    },
    {
        title: 'Telemetry',
        url: '/telemetry',
        icon: Activity,
    },
];

export const ANALYTICS_ITEMS: SidebarItem[] = [
    {
        title: 'Insights',
        url: '/analytics',
        icon: BarChart3,
    },

    {
        title: 'System Logs',
        url: '/logs',
        icon: FileText,
    },
    {
        title: 'Feedback',
        url: '/feedbacks',
        icon: ClipboardList,
    },
];

export const COMMUNICATION_ITEMS: SidebarItem[] = [
    {
        title: 'Messages',
        url: '/messages',
        icon: MessageSquare,
    },
    {
        title: 'Announcements',
        url: '/announcements',
        icon: Megaphone,
    },
];

export const RESOURCES_ITEMS: SidebarItem[] = [
    {
        title: 'Guide',
        url: '/guides',
        icon: HelpCircle,
    },
];
