"use client";

import { usePathname } from "next/navigation";
import StudentHeader from "@/components/protected/student/StudentHeader";
import StudentBottomNav from "@/components/protected/student/StudentBottomNav";
import StudentFooter from "@/components/protected/student/StudentFooter";

export default function StudentLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const isExamPage = pathname?.includes("/monitoring") || pathname?.includes("/configuration");

    if (isExamPage) {
        return (
            <div className="min-h-screen bg-background text-foreground flex flex-col">
                <main className="flex-1 w-full">
                    {children}
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col pb-20 md:pb-0">
            <StudentHeader />
            <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
                {children}
            </main>
            <StudentFooter />
            <StudentBottomNav />
        </div>
    );
}
