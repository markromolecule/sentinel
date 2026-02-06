"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AnnouncementsList } from "@/app/(protected)/admin/announcements/_components/announcements-list";
import { MOCK_ANNOUNCEMENTS } from "@/app/(protected)/admin/_constants";
import { AddAnnouncementDialog } from "@/app/(protected)/admin/announcements/_components/add-announcement-dialog";



export default function AnnouncementsPage() {
    return (
        <div className="flex flex-col gap-6 md:p-6 p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Announcements</h1>
                    <p className="text-muted-foreground">
                        Manage system-wide announcements and notifications.
                    </p>
                </div>
                <AddAnnouncementDialog />
            </div>

            <Separator />

            <AnnouncementsList announcements={MOCK_ANNOUNCEMENTS} />
        </div>
    );
}
