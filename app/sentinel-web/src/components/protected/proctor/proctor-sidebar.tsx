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
} from "lucide-react";

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
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
};

export function ProctorSidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { state } = useSidebar();
    const isCollapsed = state === "collapsed";

    const { mutate: logout } = useLogoutMutation({
        onSuccess: () => {
            router.push("/auth/login");
        },
    });

    const handleLogout = () => {
        logout();
    };

    return (
        <Sidebar className="border-r border-border/40">
            {/* Header with Logo */}
            <SidebarHeader className="border-b border-border/40 px-4 py-4">
                <Link href="/proctor/dashboard" className="flex items-center gap-2">
                    <div className={cn("relative transition-all", isCollapsed ? "w-8 h-8" : "w-36 h-10")}>
                        <NextImage
                            src="/icons/sentinel-logo.svg"
                            alt="Sentinel"
                            fill
                            className="object-contain brightness-0 dark:brightness-0 dark:invert"
                        />
                    </div>
                </Link>
            </SidebarHeader>

            {/* Navigation */}
            <SidebarContent className="px-2 py-4">
                <SidebarGroup>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {PROCTOR_NAV_ITEMS.map((item) => {
                                const Icon = iconMap[item.icon];
                                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

                                return (
                                    <SidebarMenuItem key={item.href}>
                                        <SidebarMenuButton
                                            asChild
                                            isActive={isActive}
                                            tooltip={item.label}
                                            className={cn(
                                                "transition-colors",
                                                isActive && "bg-[#323d8f]/10 text-[#323d8f] font-medium hover:bg-[#323d8f]/15"
                                            )}
                                        >
                                            <Link href={item.href}>
                                                {Icon && <Icon className={cn("w-5 h-5", isActive && "text-[#323d8f]")} />}
                                                <span>{item.label}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                );
                            })}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            {/* Footer with User Profile */}
            <SidebarFooter className="border-t border-border/40 p-2">
                <SidebarMenu>
                    {/* Theme Toggle */}
                    <SidebarMenuItem>
                        <div className={cn("flex items-center gap-2 px-2 py-1.5", isCollapsed && "justify-center")}>
                            {!isCollapsed && <span className="text-sm text-muted-foreground">Theme</span>}
                            <ThemeToggle />
                        </div>
                    </SidebarMenuItem>

                    {/* User Profile Dropdown */}
                    <SidebarMenuItem>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <SidebarMenuButton
                                    size="lg"
                                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                                >
                                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#323d8f] to-[#4a5bb8] flex items-center justify-center text-white text-xs font-bold shrink-0">
                                        {MOCK_PROCTOR.name.split(" ").map((n) => n[0]).join("")}
                                    </div>
                                    <div className="flex flex-col gap-0.5 leading-none">
                                        <span className="font-medium text-sm">{MOCK_PROCTOR.name}</span>
                                        <span className="text-xs text-muted-foreground truncate">{MOCK_PROCTOR.email}</span>
                                    </div>
                                    <ChevronUp className="ml-auto h-4 w-4" />
                                </SidebarMenuButton>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                side="top"
                                className="w-[--radix-dropdown-menu-trigger-width] min-w-56"
                                align="start"
                            >
                                <DropdownMenuItem asChild className="cursor-pointer">
                                    <Link href="/proctor/settings" className="flex w-full items-center">
                                        <Settings className="mr-2 h-4 w-4" />
                                        <span>Settings</span>
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    className="text-red-500 focus:text-red-500 focus:bg-red-500/10 cursor-pointer"
                                    onClick={handleLogout}
                                >
                                    <LogOut className="mr-2 h-4 w-4" />
                                    <span>Log out</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
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
