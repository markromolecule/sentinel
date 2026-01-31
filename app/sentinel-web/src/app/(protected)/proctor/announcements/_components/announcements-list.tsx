"use client";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { format } from "date-fns";

// Initial simple type definition, ideally this comes from a shared type file but avoiding cross-domain huge refactors for now
interface Announcement {
    id: string;
    title: string;
    content: string;
    targetAudience: string[];
    status: string;
    author: string;
    publishedAt?: string;
}

interface AnnouncementsListProps {
    announcements: Announcement[];
}

export function AnnouncementsList({ announcements }: AnnouncementsListProps) {
    return (
        <Card>
            <CardHeader className="pb-4">
                <CardTitle>System Announcements</CardTitle>
                <CardDescription>
                    Updates and news relevant to proctors and academic staff.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Title</TableHead>
                                <TableHead>Published</TableHead>
                                <TableHead>From</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {announcements.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-24 text-center">
                                        No announcements found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                announcements.map((announcement) => (
                                    <TableRow key={announcement.id} className="cursor-pointer hover:bg-muted/50">
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                <span className="font-medium">{announcement.title}</span>
                                                <span className="text-xs text-muted-foreground line-clamp-1">{announcement.content}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="w-[180px]">
                                            <span className="text-sm text-muted-foreground">
                                                {announcement.publishedAt || "N/A"}
                                            </span>
                                        </TableCell>
                                        <TableCell className="w-[150px]">
                                            <Badge variant="outline">{announcement.author}</Badge>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
