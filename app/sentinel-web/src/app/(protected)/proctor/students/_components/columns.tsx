"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Student } from "@/app/(protected)/proctor/_types"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Mail, Trash2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header"

export const columns: ColumnDef<Student>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Student" />
    ),
    cell: ({ row }) => {
        const student = row.original;
        const initials = `${student.firstName[0]}${student.lastName[0]}`;
        
        return (
            <div className="flex items-center gap-3 pl-4">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[#323d8f] to-[#4a5bb8] flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {initials}
                </div>
                <div>
                    <p className="text-sm font-medium text-foreground">
                        {student.firstName} {student.lastName}
                    </p>
                    {student.email && (
                        <p className="text-xs text-muted-foreground">
                            {student.email}
                        </p>
                    )}
                </div>
            </div>
        )
    },
    filterFn: (row, id, value) => {
        const student = row.original
        const searchString = `${student.firstName} ${student.lastName} ${student.email} ${student.studentNo}`.toLowerCase()
        return searchString.includes(value.toLowerCase())
    }
  },
  {
    accessorKey: "studentNo",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Student No." />
    ),
    cell: ({ row }) => <div className="font-mono text-sm">{row.getValue("studentNo")}</div>,
  },
  {
    accessorKey: "section",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Section" />
    ),
    cell: ({ row }) => <div className="hidden md:block">{row.getValue("section")}</div>,
    enableHiding: true,
  },
  {
    accessorKey: "subject",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Subject" />
    ),
    cell: ({ row }) => <div className="hidden lg:block">{row.getValue("subject")}</div>,
    enableHiding: true,
  },
  {
    accessorKey: "term",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Term" />
    ),
    cell: ({ row }) => <div className="hidden lg:block text-muted-foreground">{row.getValue("term")}</div>,
    enableHiding: true,
  },
  {
    id: "actions",
    cell: ({ row }) => {
      return (
        <div className="text-right pr-4">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="w-4 h-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem className="cursor-pointer">
                        <Mail className="w-4 h-4 mr-2" />
                        Send Message
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer text-red-500 focus:text-red-500">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remove
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
      )
    },
  },
]
