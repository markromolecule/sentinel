"use client";

import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Archive, MoreHorizontal, RotateCcw, Shield, UserPlus, UserX } from "lucide-react";
import { toast } from "sonner";
import { AdminUser } from "@/app/(protected)/admin/_types";

interface UserActionsMenuProps {
    user: AdminUser;
    onEdit: (user: AdminUser) => void;
}

export function UserActionsMenu({ user, onEdit }: UserActionsMenuProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>Account Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => onEdit(user)}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Update Account
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toast.info(`Change role clicked for ${user.firstName}`)}>
                    <Shield className="mr-2 h-4 w-4" />
                    Change Role
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toast.success(`Password reset email sent to ${user.email}`)}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reset Password
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {user.status !== "suspended" ? (
                    <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => toast.warning(`Account suspended for ${user.firstName}`)}
                    >
                        <UserX className="mr-2 h-4 w-4" />
                        Suspend Account
                    </DropdownMenuItem>
                ) : (
                    <DropdownMenuItem
                        className="text-green-600"
                        onClick={() => toast.success(`Account reactivated for ${user.firstName}`)}
                    >
                        <UserPlus className="mr-2 h-4 w-4" />
                        Reactivate Account
                    </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => toast.info(`User ${user.firstName} archived`)}>
                    <Archive className="mr-2 h-4 w-4" />
                    Archive User
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
