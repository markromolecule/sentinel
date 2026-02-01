"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AnnouncementsList } from "@/app/(protected)/admin/announcements/_components/announcements-list";
import { MOCK_ANNOUNCEMENTS } from "@/app/(protected)/admin/_constants";



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
                <Button className="bg-[#323d8f] hover:bg-[#323d8f]/90">
                    <Plus className="w-4 h-4 mr-2" />
                    Post Announcement
                </Button>
            </div>

            <Separator />

            <AnnouncementsList announcements={MOCK_ANNOUNCEMENTS} />
        </div>
    );
}
