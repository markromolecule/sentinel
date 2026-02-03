"use client"

import { ColumnDef } from "@tanstack/react-table"
import { AuditLog } from "@/app/(protected)/admin/_types"
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header"

export const columns: ColumnDef<AuditLog>[] = [
  {
    accessorKey: "timestamp",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Timestamp" />
    ),
    cell: ({ row }) => {
      return <div className="font-mono text-xs">{row.getValue("timestamp")}</div>
    },
  },
  {
    accessorKey: "actor",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Actor" />
    ),
  },
  {
    accessorKey: "action",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Action" />
    ),
    cell: ({ row }) => <div className="font-medium">{row.getValue("action")}</div>,
  },
  {
    accessorKey: "resourceType",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Resource" />
    ),
    cell: ({ row }) => {
        const log = row.original;
        return (
            <div>
                <span className="text-muted-foreground mr-1">{log.resourceType}:</span>
                <span>{log.resourceId}</span>
            </div>
        )
    },
  },
  {
    accessorKey: "details",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Details" />
    ),
    cell: ({ row }) => {
        return (
             <div className="max-w-[300px] truncate" title={row.getValue("details")}>
                 {row.getValue("details")}
             </div>
        )
    },
  },
]
