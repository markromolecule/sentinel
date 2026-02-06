"use client";

import { AuditLog } from "@/app/(protected)/admin/_types";
import { DataTable } from "@/components/ui/data-table/data-table";
import { columns } from "./columns";

interface AuditLogTableProps {
    logs: AuditLog[];
}

export function AuditLogTable({ logs }: AuditLogTableProps) {
    return (
        <DataTable 
            columns={columns} 
            data={logs} 
            searchKey="details" 
            searchPlaceholder="Search logs..." 
        />
    );
}
