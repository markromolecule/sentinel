"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Notification } from "@/app/(protected)/student/notifications/_types";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { MoreHorizontal, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";

export const columns: ColumnDef<Notification>[] = [
    {
        accessorKey: "title",
        header: "Title",
        cell: ({ row }) => {
            const notification = row.original;
            return (
                <div className="flex flex-col">
                    <span className="font-medium">{notification.title}</span>
                    <span className="text-xs text-muted-foreground truncate max-w-[300px]">
                        {notification.message}
                    </span>
                </div>
            );
        },
    },
    {
        accessorKey: "type",
        header: "Type",
        cell: ({ row }) => {
            const type = row.getValue("type") as string;
            const colors: Record<string, string> = {
                exam: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
                system: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
                class: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
                alert: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
            };
            
            return (
                <Badge variant="outline" className={`capitalize border-0 ${colors[type] || "bg-gray-100"}`}>
                    {type}
                </Badge>
            );
        },
    },
    {
        accessorKey: "priority",
        header: "Priority",
        cell: ({ row }) => {
            const priority = row.getValue("priority") as string;
            const colors: Record<string, string> = {
                low: "text-gray-500",
                medium: "text-yellow-600 dark:text-yellow-400",
                high: "text-red-600 dark:text-red-400 font-medium",
            };

            return (
                <span className={`capitalize text-sm ${colors[priority]}`}>
                    {priority}
                </span>
            );
        },
    },
    {
        accessorKey: "date",
        header: "Date",
        cell: ({ row }) => {
            return (
                <span className="text-sm text-muted-foreground">
                    {format(row.getValue("date"), "MMM d, yyyy h:mm a")}
                </span>
            );
        },
    },
    {
        id: "actions",
        cell: ({ row }) => {
            const notification = row.original;

            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {notification.link && (
                            <DropdownMenuItem asChild>
                                <Link href={notification.link} className="flex items-center cursor-pointer">
                                    <ExternalLink className="mr-2 h-4 w-4" />
                                    View Details
                                </Link>
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuItem className="cursor-pointer">
                            Mark as read
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        },
    },
];
