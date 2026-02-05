"use client";

import Link from "next/link";
import NextImage from "next/image";
import { usePathname } from "next/navigation";
import { Bell, Menu, User, Settings, LogOut, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { MOCK_STUDENT } from "@/app/(protected)/student/_constants";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { HEADER_NAV_ITEMS } from "@/components/protected/student/_constants";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLogoutMutation } from "@/hooks/query/auth/use-logout-mutation";
import { useRouter } from "next/navigation";

import { MOCK_NOTIFICATIONS } from "@/app/(protected)/student/notifications/_constants";
import { format } from "date-fns";

export default function StudentHeader() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const router = useRouter();

    const { mutate: logout } = useLogoutMutation({
        onSuccess: () => {
            router.push("/auth/login");
        },
    });

    const handleLogout = () => {
        logout();
    };
    
    const recentNotifications = MOCK_NOTIFICATIONS.slice(0, 4);

    return (
        <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
            <div className="container mx-auto px-0 max-w-7xl h-16 flex items-center justify-between relative text-foreground">
                {/* Logo */}
                <div className="flex items-center gap-2">
                    <Link href="/student/exam" className="flex items-center gap-2">
                        <div className="w-40 h-12 relative">
                            {/* Light Mode Logo (Dark Text) */}
                            <NextImage
                                src="/icons/light-sentinel-logo.svg"
                                alt="Sentinel"
                                fill
                                className="object-contain dark:hidden"
                            />
                            {/* Dark Mode Logo (Light Text) */}
                             <NextImage
                                src="/icons/dark-sentinel-logo.svg"
                                alt="Sentinel"
                                fill
                                className="object-contain hidden dark:block"
                            />
                        </div>
                    </Link>
                </div>

                {/* Desktop Navigation */}
                <nav className="hidden md:flex items-center gap-6 absolute left-1/2 -translate-x-1/2">
                    {HEADER_NAV_ITEMS.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "text-sm font-medium transition-colors hover:text-foreground",
                                pathname === item.href || pathname.startsWith(item.href) && item.href !== "/student/exam" ? "text-foreground" : "text-muted-foreground"
                            )}
                        >
                            {item.label}
                        </Link>
                    ))}
                </nav>

                {/* Actions & Profile */}
                <div className="flex items-center gap-2 md:gap-4">
                    <div className="hidden sm:flex">
                        <ThemeToggle />
                    </div>

                    <DropdownMenu>
                         <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground hidden sm:flex relative">
                                <Bell className="w-5 h-5" />
                                {recentNotifications.some(n => !n.isRead) && (
                                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
                                )}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-80">
                            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {recentNotifications.length === 0 ? (
                                <div className="p-4 text-center text-sm text-muted-foreground">
                                    No new notifications
                                </div>
                            ) : (
                                <div className="flex flex-col">
                                    {recentNotifications.map((notification) => (
                                        <DropdownMenuItem key={notification.id} className="cursor-pointer flex flex-col items-start gap-1 p-3">
                                            <div className="flex w-full justify-between items-start">
                                                <span className={cn("font-medium text-sm", !notification.isRead && "text-blue-600 dark:text-blue-400")}>
                                                    {notification.title}
                                                </span>
                                                <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                                                    {format(notification.date, "MMM d")}
                                                </span>
                                            </div>
                                            <p className="text-xs text-muted-foreground line-clamp-2">
                                                {notification.message}
                                            </p>
                                        </DropdownMenuItem>
                                    ))}
                                </div>
                            )}
                             <DropdownMenuSeparator />
                            <DropdownMenuItem asChild className="cursor-pointer justify-center text-center font-medium text-primary">
                                <Link href="/student/notifications" className="w-full">
                                    View all notifications
                                </Link>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#323d8f] to-[#4a5bb8] hidden md:flex items-center justify-center text-white text-xs font-bold ml-2 cursor-pointer transition-all">
                                {MOCK_STUDENT.firstName[0]}{MOCK_STUDENT.lastName[0]}
                            </div>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>
                                <div className="flex flex-col space-y-1">
                                    <p className="text-sm font-medium leading-none">{MOCK_STUDENT.firstName} {MOCK_STUDENT.lastName}</p>
                                    <p className="text-xs leading-none text-muted-foreground">{MOCK_STUDENT.email}</p>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild className="cursor-pointer">
                                <Link href="/student/profile" className="flex w-full items-center">
                                    <User className="mr-2 h-4 w-4" />
                                    <span>Profile</span>
                                </Link>
                            </DropdownMenuItem>

                            <DropdownMenuItem asChild className="cursor-pointer">
                                <Link href="/student/setting" className="flex w-full items-center">
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

                    {/* Mobile Hamburger Menu */}
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="md:hidden text-foreground hover:bg-accent h-10 w-10">
                                <Menu className="w-6 h-6" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="right" className="w-[300px] bg-background border-border text-foreground px-6">
                            <SheetHeader>
                                <SheetTitle className="text-foreground">Menu</SheetTitle>
                            </SheetHeader>
                            <div className="flex items-center justify-between mt-4 mb-2 py-2 border-b border-border">
                                <span className="text-sm font-medium text-foreground">Theme</span>
                                <ThemeToggle />
                            </div>
                            <div className="flex flex-col gap-1 mt-2">
                                {HEADER_NAV_ITEMS.map((item) => (
                                    <Link key={item.href} href={item.href}>
                                        <Button
                                            variant="ghost"
                                            className={cn(
                                                "w-full justify-start hover:bg-accent hover:text-accent-foreground",
                                                pathname === item.href || pathname.startsWith(item.href) && item.href !== "/student/exam"
                                                    ? "bg-accent text-accent-foreground"
                                                    : "text-muted-foreground"
                                            )}
                                        >
                                            <item.icon className="w-4 h-4 mr-2" />
                                            {item.label}
                                        </Button>
                                    </Link>
                                ))}
                                {/* Notification Link for Mobile */}
                                <Link href="/student/notifications">
                                    <Button variant="ghost" className="w-full justify-start hover:bg-accent hover:text-accent-foreground text-muted-foreground">
                                        <Bell className="w-4 h-4 mr-2" />
                                        Notifications
                                    </Button>
                                </Link>
                                <div className="h-px bg-border my-2" />
                                <Button
                                    variant="ghost"
                                    className="w-full justify-start text-red-500 hover:text-red-400 hover:bg-red-500/10"
                                    onClick={handleLogout}
                                >
                                    <LogOut className="w-4 h-4 mr-2" />
                                    Logout
                                </Button>
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
            </div>
        </header>
    );
}
