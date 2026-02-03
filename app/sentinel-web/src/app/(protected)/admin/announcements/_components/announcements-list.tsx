"use client";

import { DataTable } from "@/components/ui/data-table/data-table";
import { columns } from "./columns";
import { Announcement } from "@/app/(protected)/admin/_types";

interface AnnouncementsListProps {
    announcements: Announcement[];
}

export function AnnouncementsList({ announcements }: AnnouncementsListProps) {
    return (
        <DataTable 
            columns={columns} 
            data={announcements} 
            searchKey="title" 
            searchPlaceholder="Search announcements..." 
        />
    );
}
