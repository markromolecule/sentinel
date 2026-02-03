"use client"

import { ColumnDef } from "@tanstack/react-table"
import { ProctorExam } from "@/app/(protected)/proctor/_types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, FileText, Clock, Users, CalendarDays, Eye, Pencil, Trash2 } from "lucide-react"
import Link from "next/link"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header"

export const columns: ColumnDef<ProctorExam>[] = [
  {
    accessorKey: "title",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Exam Title" />
    ),
    cell: ({ row }) => {
        const exam = row.original;
        return (
            <div className="flex flex-col pl-4">
                <span>{exam.title}</span>
                {exam.description && (
                    <span className="text-xs text-muted-foreground line-clamp-1">
                        {exam.description}
                    </span>
                )}
            </div>
        )
    },
  },
  {
    accessorKey: "subject",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Subject" />
    ),
    cell: ({ row }) => (
        <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <span>{row.getValue("subject")}</span>
        </div>
    ),
  },
  {
    accessorKey: "scheduledDate",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Date" />
    ),
    cell: ({ row }) => {
        const date = row.getValue("scheduledDate") as Date | string | null;
        return date ? (
            <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-muted-foreground" />
                <span>{new Date(date).toLocaleDateString()}</span>
            </div>
        ) : (
            <span className="text-muted-foreground italic">Unscheduled</span>
        )
    },
  },
  {
    accessorKey: "duration",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Duration" />
    ),
    cell: ({ row }) => (
        <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span>{row.getValue("duration")}m</span>
        </div>
    ),
  },
  {
    accessorKey: "studentsCount",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Students" />
    ),
    cell: ({ row }) => (
        <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span>{row.getValue("studentsCount")}</span>
        </div>
    ),
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return (
            <Badge variant={
                status === "active"
                    ? "default"
                    : status === "draft"
                        ? "secondary" 
                        : "outline"
            }>
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
        )
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const exam = row.original

      return (
        <div className="flex items-center justify-end gap-2 pr-4">
            {exam.status === "active" && (
                <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="h-8 border-emerald-500/50 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                >
                    <Link href={`/proctor/exams/${exam.id}/monitoring`}>
                        <span className="relative flex h-2 w-2 mr-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        Monitor
                    </Link>
                </Button>
            )}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="w-4 h-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem className="cursor-pointer">
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer">
                        <Pencil className="w-4 h-4 mr-2" />
                        Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer text-red-500 focus:text-red-500">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
      )
    },
  },
]
