"use client";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2 } from "lucide-react";
import { Announcement } from "@/app/(protected)/admin/_types";

interface AnnouncementsListProps {
    announcements: Announcement[];
}

export function AnnouncementsList({ announcements }: AnnouncementsListProps) {
    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="pl-4">Title</TableHead>
                        <TableHead>Target Audience</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Author</TableHead>
                        <TableHead className="text-right pr-4">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {announcements.map((announcement) => (
                        <TableRow key={announcement.id}>
                            <TableCell className="pl-4">
                                <div className="flex flex-col">
                                    <span className="font-medium">{announcement.title}</span>
                                    <span className="text-xs text-muted-foreground truncate max-w-[200px]">{announcement.content}</span>
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex gap-1">
                                    {announcement.targetAudience.map((audience) => (
                                        <Badge key={audience} variant="outline" className="capitalize">
                                            {audience}
                                        </Badge>
                                    ))}
                                </div>
                            </TableCell>
                            <TableCell>
                                <Badge variant={announcement.status === "published" ? "default" : "secondary"}>
                                    {announcement.status}
                                </Badge>
                            </TableCell>
                            <TableCell>{announcement.author}</TableCell>
                            <TableCell className="text-right pr-4">
                                <div className="flex justify-end gap-2">
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
