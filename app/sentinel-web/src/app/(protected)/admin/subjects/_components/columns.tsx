"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Subject } from "@sentinel/shared/src/types"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header"
import { Button } from "@/components/ui/button"
import { Edit2, MoreHorizontal, Trash2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

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
  {
    id: "actions",
    cell: ({ row }) => {
      const subject = row.original

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(subject.id)}
            >
              Copy Subject ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
                <Edit2 className="mr-2 h-4 w-4" />
                Edit
            </DropdownMenuItem>
            <DropdownMenuItem className="text-red-600 dark:text-red-400">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]
