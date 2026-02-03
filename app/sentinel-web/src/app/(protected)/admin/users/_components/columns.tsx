"use client"

import { ColumnDef } from "@tanstack/react-table"
import { AdminUser, UserRole } from "@/app/(protected)/admin/_types"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export const columns = (onEdit: (user: AdminUser) => void): ColumnDef<AdminUser>[] => [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "email",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="User Identity" />
    ),
    cell: ({ row }) => {
      const user = row.original
      // Fallback for avatar initials
      const initials = `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`

      return (
        <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
                <AvatarImage src={user.avatarUrl || ""} alt={user.firstName || "User"} />
                <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
                <span className="font-medium text-sm">
                    {user.firstName} {user.lastName}
                </span>
                <span className="text-muted-foreground text-xs">{user.email}</span>
            </div>
        </div>
      )
    },
  },
  {
    accessorKey: "role",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Role" />
    ),
    cell: ({ row }) => {
      const role = row.getValue("role") as UserRole
        
      const roleColors: Record<UserRole, string> = {
          admin: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800",
          proctor: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
          instructor: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
          student: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700",
      };

      return (
        <Badge
            variant="outline"
            className={`capitalize ${roleColors[role]}`}
        >
            {role}
        </Badge>
      )
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: "department",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Department / ID" />
    ),
    cell: ({ row }) => {
        const user = row.original;
        return (
            <div className="flex flex-col">
                <span className="text-sm font-medium">{user.department || "N/A"}</span>
                {user.studentNo && (
                    <span className="text-xs text-muted-foreground font-mono">
                        {user.studentNo}
                    </span>
                )}
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
      const status = row.getValue("status") as string

        const statusColors: Record<string, string> = {
            active: "bg-green-500",
            inactive: "bg-gray-500",
            suspended: "bg-red-500",
            archived: "bg-orange-500"
        };

      return (
        <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${statusColors[status] || "bg-gray-500"}`} />
            <span className="capitalize text-sm text-muted-foreground">{status}</span>
        </div>
      )
    },
  },
  {
      accessorKey: "lastActive",
      header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Last Active" />
      ),
      cell: ({ row }) => {
          return <span className="text-sm text-muted-foreground">{row.getValue("lastActive")}</span>
      }

  },
  {
    id: "actions",
    cell: ({ row }) => {
      const user = row.original

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
              onClick={() => navigator.clipboard.writeText(user.id)}
            >
              Copy User ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onEdit(user)}>
                <Edit2 className="mr-2 h-4 w-4" />
                Edit Details
            </DropdownMenuItem>
            <DropdownMenuItem className="text-red-600 dark:text-red-400">
                <Trash2 className="mr-2 h-4 w-4" />
                Suspend User
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]
