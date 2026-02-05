"use client";

// import { DataFrame } from "@/components/ui/data-table/data-frame"; // Assuming DataFrame or using DataTable directly - checking prompt context, user has DataTable in admin.
// User context showed: import { DataTable } from "@/components/ui/data-table/data-table"; in admin/announcements.
// Let's use DataTable as per admin example.

import { DataTable } from "@/components/ui/data-table/data-table";
import { columns } from "./columns";
import { Notification } from "@/app/(protected)/student/notifications/_types";

interface NotificationListProps {
    notifications: Notification[];
}

export function NotificationList({ notifications }: NotificationListProps) {
    return (
        <DataTable 
            columns={columns} 
            data={notifications} 
            searchKey="title" 
            searchPlaceholder="Search notifications..." 
        />
    );
}
