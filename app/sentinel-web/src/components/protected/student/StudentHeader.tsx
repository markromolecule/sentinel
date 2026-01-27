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

    return (
        <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#0f0f10]/80 backdrop-blur-md">
            <div className="container mx-auto px-0 max-w-7xl h-16 flex items-center justify-between relative">
                {/* Logo */}
                <div className="flex items-center gap-2">
                    <Link href="/student/exam" className="flex items-center gap-2">
                        <div className="w-40 h-12 relative">
                            <NextImage
                                src="/icons/sentinel-logo.svg"
                                alt="Sentinel"
                                fill
                                className="object-contain"
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
                                "text-sm font-medium transition-colors hover:text-white",
                                pathname === item.href || pathname.startsWith(item.href) && item.href !== "/student/exam" ? "text-white" : "text-white/60"
                            )}
                        >
                            {item.label}
                        </Link>
                    ))}
                </nav>

                {/* Actions & Profile */}
                <div className="flex items-center gap-2 md:gap-4">
                    <Button variant="ghost" size="icon" className="text-white/60 hover:text-white hidden sm:flex">
                        <Bell className="w-5 h-5" />
                    </Button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#323d8f] to-[#4a5bb8] hidden md:flex items-center justify-center text-white text-xs font-bold ml-2 cursor-pointer transition-all">
                                {MOCK_STUDENT.name.split(" ").map((n) => n[0]).join("")}
                            </div>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 bg-[#0f0f10] border-white/10 text-white">
                            <DropdownMenuLabel>
                                <div className="flex flex-col space-y-1">
                                    <p className="text-sm font-medium leading-none text-white">{MOCK_STUDENT.name}</p>
                                    <p className="text-xs leading-none text-white/60">{MOCK_STUDENT.email}</p>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-white/10" />
                            <DropdownMenuItem asChild className="text-white/80 focus:text-white focus:bg-white/10 cursor-pointer">
                                <Link href="/student/profile" className="flex w-full items-center">
                                    <User className="mr-2 h-4 w-4" />
                                    <span>Profile</span>
                                </Link>
                            </DropdownMenuItem>

                            <DropdownMenuItem asChild className="text-white/80 focus:text-white focus:bg-white/10 cursor-pointer">
                                <Link href="/student/setting" className="flex w-full items-center">
                                    <Settings className="mr-2 h-4 w-4" />
                                    <span>Settings</span>
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-white/10" />
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
                            <Button variant="ghost" size="icon" className="md:hidden text-white/60 hover:text-white">
                                <Menu className="w-5 h-5" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="right" className="bg-[#0f0f10] border-white/10 w-[300px]">
                            <SheetHeader>
                                <SheetTitle className="text-white">Menu</SheetTitle>
                            </SheetHeader>
                            <div className="flex flex-col gap-2 mt-4">
                                {HEADER_NAV_ITEMS.map((item) => (
                                    <Link key={item.href} href={item.href}>
                                        <Button
                                            variant="ghost"
                                            className={cn(
                                                "w-full justify-start hover:text-white hover:bg-white/5",
                                                pathname === item.href || pathname.startsWith(item.href) && item.href !== "/student/exam"
                                                    ? "text-white bg-white/5"
                                                    : "text-white/80"
                                            )}
                                        >
                                            <item.icon className="w-4 h-4 mr-2" />
                                            {item.label}
                                        </Button>
                                    </Link>
                                ))}
                                <div className="h-px bg-white/10 my-2" />
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
