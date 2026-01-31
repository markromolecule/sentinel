"use client";

import { AnnouncementsList } from "@/app/(protected)/proctor/announcements/_components/announcements-list";
import { MOCK_ANNOUNCEMENTS } from "@/app/(protected)/proctor/_constants";

export default function AnnouncementsPage() {
    return (
        <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Announcements</h2>
            </div>
            <AnnouncementsList announcements={MOCK_ANNOUNCEMENTS} />
        </div>
    );
}
