"use client"

import { ColumnDef } from "@tanstack/react-table"
import { ProctorAssignmentExam } from "../_types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header"

export const columns: ColumnDef<ProctorAssignmentExam>[] = [
  {
    accessorKey: "title",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Exam Title" />
    ),
    cell: ({ row }) => <div className="font-medium pl-4">{row.getValue("title")}</div>,
  },
  {
    accessorKey: "subject",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Subject" />
    ),
  },
  {
    accessorKey: "scheduledDate",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Date" />
    ),
    cell: ({ row }) => {
        const date = row.getValue("scheduledDate") as string;
        return <div>{date || "Unscheduled"}</div>
    },
  },
  {
    accessorKey: "assignedProctor",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Assigned Proctor" />
    ),
    cell: ({ row }) => {
        const proctorName = row.original.assignedProctor;
        const initials = proctorName.split(" ").map((n) => n[0]).join("");
        
        return (
            <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                    {initials}
                </div>
                {proctorName}
            </div>
        )
    },
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return (
            <Badge variant={status === 'active' ? 'default' : 'secondary'}>
                {status}
            </Badge>
        )
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      return (
        <div className="text-right pr-4">
            <Button variant="ghost" size="sm">
                Reassign
            </Button>
        </div>
      )
    },
  },
]
