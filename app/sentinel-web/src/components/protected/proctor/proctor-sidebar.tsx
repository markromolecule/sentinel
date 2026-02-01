"use client";

import Link from "next/link";
import NextImage from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
    LayoutDashboard,
    Users,
    FileText,
    MessageSquare,
    Settings,
    LogOut,
    ChevronUp,
    Megaphone,
    Calendar,
    UserCheck,
    BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarTrigger,
    useSidebar,
} from "@/components/ui/sidebar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { MOCK_PROCTOR, PROCTOR_NAV_ITEMS } from "@/app/(protected)/proctor/_constants";
import { useLogoutMutation } from "@/hooks/query/auth/use-logout-mutation";
import { cn } from "@/lib/utils";

// Map icon strings to Lucide components
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    LayoutDashboard,
    Users,
    FileText,
    MessageSquare,
    Megaphone,
};

export function ProctorSidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { state } = useSidebar();
    const isCollapsed = state === "collapsed";

    const { mutate: logout, isPending } = useLogoutMutation({
        onSuccess: () => {
            router.push("/auth/login");
        },
    });

    const handleLogout = () => {
        logout();
    };

    const overviewItems = [
        {
            title: "Dashboard",
            url: "/proctor/dashboard",
            icon: LayoutDashboard,
        },
        {
            title: "Calendar",
            url: "/proctor/calendar",
            icon: Calendar,
        },
    ];

    const studentItems = [
        {
            title: "Student Management",
            url: "/proctor/students",
            icon: Users,
        },
    ];

    const navExams = [
        {
            title: "Exam Management",
            url: "/proctor/exams",
            icon: FileText,
        },
        {
            title: "Subject Management",
            url: "/proctor/subjects",
            icon: BookOpen,
        },
        {
            title: "Proctor Assignment",
            url: "/proctor/assignment",
            icon: UserCheck,
        },
    ];


    const communicationItems = [
        {
            title: "Messages",
            url: "/proctor/messages",
            icon: MessageSquare,
        },
        {
            title: "Announcements",
            url: "/proctor/announcements",
            icon: Megaphone,
        },
    ];

    const renderMenuItems = (items: { title: string; url: string; icon: any }[]) => {
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
        <Sidebar collapsible="icon" className="border-r border-border/40">
            {/* Header with Logo */}
            <SidebarHeader className="border-b border-border/40 h-16 flex items-center justify-center p-0">
                <div className="flex items-center gap-2 p-4 w-full h-full">
                    <div className="relative h-12 w-24">
                        <NextImage
                            src="/icons/sentinel-logo.svg"
                            alt="Sentinel"
                            fill
                            className="object-contain object-left brightness-0 dark:brightness-0 dark:invert"
                        />
                    </div>
                </div>
            </SidebarHeader>

            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Overview</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {renderMenuItems(overviewItems)}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                <SidebarGroup>
                    <SidebarGroupLabel>Management</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {renderMenuItems(navExams)}
                            {renderMenuItems(studentItems)}
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

            {/* Footer with User Profile */}
            <SidebarFooter className="border-t border-border/40 p-2">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            size="lg"
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={handleLogout}
                            disabled={isPending}
                            tooltip="Logout"
                        >
                            <LogOut className="h-4 w-4" />
                            <span>{isPending ? "Logging out..." : "Logout"}</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    );
}

export function ProctorHeader() {
    return (
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border/40 px-4 bg-background/80 backdrop-blur-md sticky top-0 z-10">
            <SidebarTrigger className="-ml-1" />
            <div className="flex-1" />
        </header>
    );
}
