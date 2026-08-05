import {
    BarChart3,
    BookOpen,
    Building2,
    Calendar,
    FileText,
    LayoutDashboard,
    Megaphone,
    MessageSquare,
    type LucideIcon,
    Users,
    Layers,
    School,
    GraduationCap,
    Database,
    ClipboardList,
    HelpCircle,
} from 'lucide-react';
import type { SidebarNavItem } from './dashboard-sidebar-item';
import type { CoreRole } from '@/lib/auth/core-role';
import {
    type CoreAdminPageId,
    getCoreAdminPageCapability,
    isRoleEligibleForCoreAdminPage,
} from '@/lib/authorization/core-admin-capability-map';

interface CoreAdminNavSubItemDefinition {
    pageId: CoreAdminPageId;
    title: string;
    url: string;
}

interface CoreAdminNavItemDefinition {
    pageId: CoreAdminPageId;
    title: string;
    url: string;
    icon: LucideIcon;
    subItems?: CoreAdminNavSubItemDefinition[];
}

export interface CoreAdminNavSection {
    label: string;
    items: SidebarNavItem[];
    showSeparator: boolean;
}

const CORE_ADMIN_NAV_DEFINITIONS: Array<{
    label: string;
    showSeparator: boolean;
    items: CoreAdminNavItemDefinition[];
}> = [
    {
        label: 'Overview',
        showSeparator: true,
        items: [
            {
                pageId: 'overview',
                title: 'Overview',
                url: '/dashboard',
                icon: LayoutDashboard,
            },

            {
                pageId: 'calendar',
                title: 'Calendar',
                url: '/calendar',
                icon: Calendar,
            },
        ],
    },
    {
        label: 'Organization',
        showSeparator: true,
        items: [
            {
                pageId: 'departments',
                title: 'Organization',
                url: '/departments',
                icon: Building2,
            },
        ],
    },
    {
        label: 'Management',
        showSeparator: true,
        items: [
            {
                pageId: 'sections',
                title: 'Sections',
                url: '/sections',
                icon: Layers,
            },
            {
                pageId: 'subjects',
                title: 'Subjects',
                url: '/subjects',
                icon: BookOpen,
            },
            {
                pageId: 'courses',
                title: 'Programs',
                url: '/courses',
                icon: GraduationCap,
            },
        ],
    },
    {
        label: 'Classrooms',
        showSeparator: true,
        items: [
            {
                pageId: 'classrooms',
                title: 'Classrooms',
                url: '/classrooms',
                icon: School,
            },
            {
                pageId: 'administrators',
                title: 'IAM',
                url: '/administrators',
                icon: Users,
            },
        ],
    },
    {
        label: 'Academics',
        showSeparator: true,
        items: [
            {
                pageId: 'exams',
                title: 'Examination',
                url: '/exams',
                icon: ClipboardList,
            },
            {
                pageId: 'question-bank',
                title: 'Question Bank',
                url: '/question',
                icon: Database,
            },
        ],
    },
    {
        label: 'Communication',
        showSeparator: true,
        items: [
            {
                pageId: 'messages',
                title: 'Messages',
                url: '/messages',
                icon: MessageSquare,
            },
            {
                pageId: 'announcements',
                title: 'Announcements',
                url: '/announcements',
                icon: Megaphone,
            },
        ],
    },
    {
        label: 'Analytics & Logs',
        showSeparator: true,
        items: [
            {
                pageId: 'analytics',
                title: 'Insights',
                url: '/analytics',
                icon: BarChart3,
            },

            {
                pageId: 'logs',
                title: 'Logs',
                url: '/logs',
                icon: FileText,
            },
        ],
    },
    {
        label: 'Resources',
        showSeparator: true,
        items: [
            {
                pageId: 'guides',
                title: 'Guide',
                url: '/guides',
                icon: HelpCircle,
            },
        ],
    },
];

function toSidebarNavItem(
    item: CoreAdminNavItemDefinition,
    canViewPage: (pageId: CoreAdminPageId) => boolean,
): SidebarNavItem | null {
    if (!canViewPage(item.pageId)) {
        return null;
    }

    const visibleSubItems = item.subItems?.filter((subItem) => canViewPage(subItem.pageId)) ?? [];

    return {
        title: item.title,
        url: item.url,
        icon: item.icon,
        subItems:
            visibleSubItems.length > 0
                ? visibleSubItems.map((subItem) => ({
                      title: subItem.title,
                      url: subItem.url,
                  }))
                : undefined,
    };
}

/**
 * Builds visible navigation sections from the centralized page capability map.
 */
export function getCoreAdminNavigationSections(args: {
    canViewPage: (pageId: CoreAdminPageId) => boolean;
}) {
    return CORE_ADMIN_NAV_DEFINITIONS.map((section) => ({
        label: section.label,
        showSeparator: section.showSeparator,
        items: section.items
            .map((item) => toSidebarNavItem(item, args.canViewPage))
            .filter((item): item is SidebarNavItem => item !== null),
    })).filter((section) => section.items.length > 0) satisfies CoreAdminNavSection[];
}

function buildDefaultNavigationForRole(role: CoreRole) {
    return getCoreAdminNavigationSections({
        canViewPage: (pageId) => {
            const page = getCoreAdminPageCapability(pageId);
            return (
                isRoleEligibleForCoreAdminPage(pageId, role) &&
                (page.requiredViewPermissions.length === 0 || page.allowedRoles.includes(role))
            );
        },
    });
}

export const ADMIN_NAVIGATION_SECTIONS = buildDefaultNavigationForRole('admin');

export const SUPERADMIN_NAVIGATION_SECTIONS = buildDefaultNavigationForRole('superadmin');
