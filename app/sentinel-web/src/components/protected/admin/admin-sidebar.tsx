"use client";

import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarRail,
    SidebarFooter,
} from "@/components/ui/sidebar";
import {
    LayoutDashboard,
    Users,
    Settings,
    UserCheck,
    BarChart3,
    FileText,
    Megaphone,
    LogOut,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useLogoutMutation } from "@/hooks/query/auth/use-logout-mutation";
import { toast } from "sonner";

export function AdminSidebar() {
    const pathname = usePathname();
    const router = useRouter();

    const { mutate: logout, isPending } = useLogoutMutation({
        onSuccess: () => {
            router.push("/auth/login");
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    const handleLogout = () => {
        logout();
    };

    const dashboardItems = [
        {
            title: "Dashboard",
            url: "/admin",
            icon: LayoutDashboard,
        },
    ];

    const managementItems = [
        {
            title: "User Management",
            url: "/admin/users",
            icon: Users,
        },
        {
            title: "Exam Configuration",
            url: "/admin/exam-config",
            icon: Settings,
        },
        {
            title: "Proctor Assignment",
            url: "/admin/proctor-assignment",
            icon: UserCheck,
        },
    ];

    const analyticsItems = [
        {
            title: "Reports & Analytics",
            url: "/admin/analytics",
            icon: BarChart3,
        },
        {
            title: "System Logs",
            url: "/admin/logs",
            icon: FileText,
        },
    ];

    const communicationItems = [
        {
            title: "Announcements",
            url: "/admin/announcements",
            icon: Megaphone,
        },
    ];

    const renderMenuItems = (items: typeof dashboardItems) => {
        return items.map((item) => (
            <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild isActive={pathname === item.url} tooltip={item.title}>
                    <Link href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
        ));
    };

    return (
        <Sidebar collapsible="icon">
            <SidebarHeader className="border-b border-sidebar-border h-16 flex items-center justify-center p-0">
                <div className="flex items-center gap-2 p-4 w-full h-full">
                    <div className="relative h-12 w-24">
                        <Image
                            src="/icons/sentinel-logo.svg"
                            alt="Sentinel Logo"
                            fill
                            className="object-contain object-left"
                        />
                    </div>
                </div>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Overview</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {renderMenuItems(dashboardItems)}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                <SidebarGroup>
                    <SidebarGroupLabel>Management</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {renderMenuItems(managementItems)}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                <SidebarGroup>
                    <SidebarGroupLabel>Analytics & Logs</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {renderMenuItems(analyticsItems)}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                <SidebarGroup>
                    <SidebarGroupLabel>Communication</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {renderMenuItems(communicationItems)}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter className="border-t border-sidebar-border p-4">
                <Button
                    variant="ghost"
                    className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={handleLogout}
                    disabled={isPending}
                >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>{isPending ? "Logging out..." : "Logout"}</span>
                </Button>
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    );
}
