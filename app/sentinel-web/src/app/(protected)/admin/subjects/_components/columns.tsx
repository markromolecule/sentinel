"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Subject } from "@sentinel/shared/src/types"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header"

export const columns: ColumnDef<Subject>[] = [
  {
    accessorKey: "code",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Code" />
    ),
    cell: ({ row }) => <div className="font-medium pl-4">{row.getValue("code")}</div>,
  },
  {
    accessorKey: "title",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Title" />
    ),
  },
  {
    accessorKey: "section",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Section" />
    ),
    cell: ({ row }) => <Badge variant="secondary">{row.getValue("section")}</Badge>,
  },
  {
    accessorKey: "createdBy",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Created By" />
    ),
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Created At" />
    ),
    cell: ({ row }) => {
        const date = row.getValue("createdAt") as Date | string;
        return (
            <div className="text-muted-foreground">
                {format(new Date(date ?? new Date()), "MMM d, yyyy")}
            </div>
        )
    },
  },
]
