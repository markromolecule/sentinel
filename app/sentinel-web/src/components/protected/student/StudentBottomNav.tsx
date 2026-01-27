"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { BOTTOM_NAV_ITEMS } from "@/components/protected/student/_constants";
import { MOCK_STUDENT } from "@/app/(protected)/student/_constants";
import { User, Settings, LogOut } from "lucide-react";
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";

export default function StudentBottomNav() {
    const pathname = usePathname();

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0f0f10] border-t border-white/10 pb-safe md:hidden">
            <div className="flex items-center justify-between px-6 py-2">
                {BOTTOM_NAV_ITEMS.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href) && item.href !== "/student/exam";
                    return (
                        <Link
                            key={item.label}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center justify-center py-2 gap-1 rounded-lg transition-colors",
                                isActive ? "text-[#323d8f]" : "text-white/60 hover:text-white"
                            )}
                        >
                            <item.icon className={cn("w-6 h-6", isActive && "fill-current")} />
                            <span className="text-[10px] font-medium">{item.label}</span>
                        </Link>
                    );
                })}

                <Drawer>
                    <DrawerTrigger asChild>
                        <div className="flex flex-col items-center justify-center py-2 gap-1 rounded-lg transition-colors text-white/60 hover:text-white cursor-pointer">
                            <div className="h-6 w-6 rounded-full bg-gradient-to-br from-[#323d8f] to-[#4a5bb8] flex items-center justify-center text-white text-[8px] font-bold ring-2 ring-white/10">
                                {MOCK_STUDENT.name.split(" ").map((n) => n[0]).join("")}
                            </div>
                            <span className="text-[10px] font-medium">Profile</span>
                        </div>
                    </DrawerTrigger>
                    <DrawerContent className="bg-[#0f0f10] border-t border-white/10 text-white">
                        <div className="mx-auto w-full max-w-sm">
                            <DrawerHeader className="flex flex-col items-center gap-4 py-6">
                                <div className="h-20 w-20 rounded-full bg-gradient-to-br from-[#323d8f] to-[#4a5bb8] flex items-center justify-center text-white text-2xl font-bold ring-4 ring-white/10">
                                    {MOCK_STUDENT.name.split(" ").map((n) => n[0]).join("")}
                                </div>
                                <div className="text-center space-y-1">
                                    <DrawerTitle className="text-lg font-semibold text-white">{MOCK_STUDENT.name}</DrawerTitle>
                                    <p className="text-sm text-white/50">{MOCK_STUDENT.email}</p>
                                </div>
                            </DrawerHeader>

                            <div className="p-4 space-y-2">
                                <Link
                                    href="/student/profile"
                                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors text-white/80"
                                >
                                    <div className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center">
                                        <User className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium text-white">My Profile</p>
                                        <p className="text-xs text-white/40">View personal details</p>
                                    </div>
                                    <div className="text-white/20">→</div>
                                </Link>

                                <Link
                                    href="/student/setting"
                                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors text-white/80"
                                >
                                    <div className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center">
                                        <Settings className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium text-white">Settings</p>
                                        <p className="text-xs text-white/40">Manage your account</p>
                                    </div>
                                    <div className="text-white/20">→</div>
                                </Link>
                            </div>

                            <DrawerFooter className="pt-2 pb-8">
                                <Button
                                    variant="destructive"
                                    className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 h-12"
                                >
                                    <LogOut className="mr-2 h-4 w-4" />
                                    Log out
                                </Button>
                                <DrawerClose asChild>
                                    <Button variant="ghost" className="text-white/40 hover:text-white">Cancel</Button>
                                </DrawerClose>
                            </DrawerFooter>
                        </div>
                    </DrawerContent>
                </Drawer>
            </div>
        </div>
    );
}
