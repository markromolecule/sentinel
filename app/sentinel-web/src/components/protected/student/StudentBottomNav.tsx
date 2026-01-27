"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { BOTTOM_NAV_ITEMS } from "@/components/protected/student/_constants";

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
            </div>
        </div>
    );
}
