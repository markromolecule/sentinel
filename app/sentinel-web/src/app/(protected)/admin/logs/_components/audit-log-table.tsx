"use client";

import { AuditLog } from "@/app/(protected)/admin/_types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table/data-table";
import { columns } from "./columns";

interface AuditLogTableProps {
    logs: AuditLog[];
}

export function AuditLogTable({ logs }: AuditLogTableProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>System Audit Trail</CardTitle>
                <CardDescription>
                    Immutable record of all system events and actions.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <DataTable 
                    columns={columns} 
                    data={logs} 
                    searchKey="details" 
                    searchPlaceholder="Search logs..." 
                />
            </CardContent>
        </Card>
    );
}
