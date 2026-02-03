"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Subject } from "@sentinel/shared/src/types"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header"

export const columns = (onRemove: (id: string) => void): ColumnDef<Subject>[] => [
  {
    accessorKey: "code",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Code" />
    ),
    cell: ({ row }) => <div className="font-medium">{row.getValue("code")}</div>,
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
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const subject = row.original
      return (
        <div className="text-right">
             <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-red-500"
                onClick={() => onRemove(subject.id)}
            >
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Delete</span>
            </Button>
        </div>
      )
    },
  },
]
