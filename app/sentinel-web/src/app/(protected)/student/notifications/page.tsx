"use client";

import { Bell } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { NotificationList } from "@/app/(protected)/student/notifications/_components/notification-list";
import { MOCK_NOTIFICATIONS } from "@/app/(protected)/student/notifications/_constants";

export default function NotificationsPage() {
    return (
        <div className="flex flex-col gap-6 md:p-6 p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <Bell className="w-6 h-6 text-[#323d8f]" />
                        <span className="bg-gradient-to-r from-[#323d8f] to-[#4a5bb8] bg-clip-text text-transparent">Notifications</span>
                    </h1>
                    <p className="text-muted-foreground">
                        Stay updated with your exams, classes, and system alerts.
                    </p>
                </div>
            </div>

            <Separator />

            <NotificationList notifications={MOCK_NOTIFICATIONS} />
        </div>
    );
}
