"use client"

import { ColumnDef } from "@tanstack/react-table"
import { ProctorExam } from "@/app/(protected)/proctor/_types"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header"

export const columns: ColumnDef<ProctorExam>[] = [
  {
    accessorKey: "title",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Title" />
    ),
    cell: ({ row }) => (
        <div className="flex flex-col gap-1 pl-4">
            <span className="font-medium">{row.getValue("title")}</span>
             {/* <span className="text-xs text-muted-foreground">{row.original.description}</span> */}
        </div>
    ),
  },
  {
    accessorKey: "subject",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Subject" />
    ),
  },
  {
    accessorKey: "createdBy",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Created By" />
    ),
    cell: ({ row }) => <div>{row.getValue("createdBy") || "Unknown"}</div>,
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
        const status = row.getValue("status") as string;
        let variant: "default" | "secondary" | "outline" = "default";
        
        switch (status) {
            case "active":
                variant = "default";
                break;
            case "completed":
                variant = "secondary";
                break;
            case "draft":
                variant = "outline";
                break;
            default:
                variant = "default";
        }

        return (
            <Badge variant={variant} className="capitalize">
                {status}
            </Badge>
        )
    },
  },
  {
    accessorKey: "questionCount",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Questions" />
    ),
  },
  {
    accessorKey: "scheduledDate",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Date" />
    ),
    cell: ({ row }) => {
        const date = row.getValue("scheduledDate") as string | Date;
        return (
            <div className="text-muted-foreground">
                {date ? format(new Date(date), "MMM d, yyyy") : "Unscheduled"}
            </div>
        )
    },
  },
]
