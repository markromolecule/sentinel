"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Announcement } from "@/app/(protected)/admin/_types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Edit, Trash2 } from "lucide-react"
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header"

export const columns: ColumnDef<Announcement>[] = [
  {
    accessorKey: "title",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Title" />
    ),
    cell: ({ row }) => (
        <div className="flex flex-col pl-4">
            <span className="font-medium">{row.getValue("title")}</span>
            <span className="text-xs text-muted-foreground truncate max-w-[200px]">{row.original.content}</span>
        </div>
    ),
  },
  {
    accessorKey: "targetAudience",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Target Audience" />
    ),
    cell: ({ row }) => {
        const audience = row.original.targetAudience;
        return (
            <div className="flex gap-1 flex-wrap">
                {audience.map((a) => (
                    <Badge key={a} variant="outline" className="capitalize">
                        {a}
                    </Badge>
                ))}
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
            <Badge variant={status === "published" ? "default" : "secondary"}>
                {status}
            </Badge>
        )
    },
  },
  {
    accessorKey: "author",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Author" />
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => {
      return (
        <div className="flex justify-end gap-2 pr-4">
            <Button variant="ghost" size="icon" className="h-8 w-8">
                <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                <Trash2 className="h-4 w-4" />
            </Button>
        </div>
      )
    },
  },
]
