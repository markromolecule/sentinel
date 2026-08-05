'use client';

import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarMenu,
    SidebarRail,
    SidebarSeparator,
    useSidebar,
} from '@sentinel/ui';
import {
    DASHBOARD_ITEMS,
    MANAGEMENT_ITEMS,
    CONFIGURATION_ITEMS,
    ANALYTICS_ITEMS,
    COMMUNICATION_ITEMS,
    USER_MANAGEMENT_ITEMS,
    RESOURCES_ITEMS,
} from './constants';
import { useDashboardNav } from '../common/hooks/use-dashboard-nav';
import { DashboardSidebarItem } from '../common/dashboard-sidebar-item';
import { useActivePermissions, useConversationsQuery, useMessageRealtime } from '@sentinel/hooks';

export function SuperAdminSidebar() {
    const { state, setOpen } = useSidebar();
    const { pathname, openMenus, toggleMenu, isChildActive } = useDashboardNav();
    const { hasAnyPermission } = useActivePermissions();

    const { data: conversations } = useConversationsQuery();
    useMessageRealtime();
    const unreadCount = conversations?.reduce((acc, c) => acc + (c.unreadCount ?? 0), 0) ?? 0;
    const canAccessPdfTemplates = hasAnyPermission([
        'pdf_templates:view',
        'pdf_templates:manage',
        'institution_branding:manage',
        'examinations:export_answer_key',
    ]);

    const filteredConfigurationItems = CONFIGURATION_ITEMS.filter((item) =>
        item.url === '/pdf-templates' ? canAccessPdfTemplates : true,
    );

    const sections = [
        { label: 'Overview', items: DASHBOARD_ITEMS, showSeparator: true },
        { label: 'Management', items: MANAGEMENT_ITEMS, showSeparator: true },
        { label: 'User Management', items: USER_MANAGEMENT_ITEMS, showSeparator: true },
        { label: 'Communication', items: COMMUNICATION_ITEMS, showSeparator: true },
        { label: 'Configuration', items: filteredConfigurationItems, showSeparator: true },
        { label: 'Analytics & Logs', items: ANALYTICS_ITEMS, showSeparator: true },
        { label: 'Resources', items: RESOURCES_ITEMS, showSeparator: false },
    ].filter((section) => section.items.length > 0);

    return (
        <Sidebar
            collapsible="icon"
            className="border-border/40 top-16! z-50 h-[calc(100svh-4rem)]! border-r transition-all duration-300 ease-in-out"
            onMouseEnter={() => {
                if (state === 'collapsed') setOpen(true);
            }}
            onMouseLeave={() => {
                if (state === 'expanded') setOpen(false);
            }}
        >
            <SidebarContent>
                {sections.map((section, index) => (
                    <div key={index}>
                        <SidebarGroup>
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    {section.items.map((item) => (
                                        <DashboardSidebarItem
                                            key={item.title}
                                            item={item}
                                            pathname={pathname}
                                            isOpen={openMenus[item.title]}
                                            onOpenChange={(open) => toggleMenu(item.title, open)}
                                            isChildActive={isChildActive}
                                            sidebarState={state}
                                            unreadCount={
                                                item.url === '/messages' ? unreadCount : undefined
                                            }
                                        />
                                    ))}
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>
                        {section.showSeparator && <SidebarSeparator />}
                    </div>
                ))}
            </SidebarContent>
            <SidebarRail />
        </Sidebar>
    );
}
