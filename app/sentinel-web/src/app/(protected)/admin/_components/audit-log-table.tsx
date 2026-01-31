"use client";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { AuditLog } from "@/app/(protected)/admin/_types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useState } from "react";

interface AuditLogTableProps {
    logs: AuditLog[];
}

export function AuditLogTable({ logs }: AuditLogTableProps) {
    const [searchQuery, setSearchQuery] = useState("");

    const filteredLogs = logs.filter((log) => {
        const query = searchQuery.toLowerCase();
        return (
            log.actor.toLowerCase().includes(query) ||
            log.action.toLowerCase().includes(query) ||
            log.resourceType.toLowerCase().includes(query) ||
            log.details.toLowerCase().includes(query)
        );
    });

    return (
        <Card>
            <CardHeader>
                <CardTitle>System Audit Trail</CardTitle>
                <CardDescription>
                    Immutable record of all system events and actions.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center pb-4">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search logs..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                </div>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Timestamp</TableHead>
                                <TableHead>Actor</TableHead>
                                <TableHead>Action</TableHead>
                                <TableHead>Resource</TableHead>
                                <TableHead>Details</TableHead>
                                <TableHead className="text-right">IP Address</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredLogs.map((log) => (
                                <TableRow key={log.id}>
                                    <TableCell className="font-mono text-xs">{log.timestamp}</TableCell>
                                    <TableCell>{log.actor}</TableCell>
                                    <TableCell className="font-medium">{log.action}</TableCell>
                                    <TableCell>
                                        <span className="text-muted-foreground">{log.resourceType}:</span> {log.resourceId}
                                    </TableCell>
                                    <TableCell className="max-w-[300px] truncate" title={log.details}>{log.details}</TableCell>
                                    <TableCell className="text-right font-mono text-xs text-muted-foreground">
                                        {log.ipAddress}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
