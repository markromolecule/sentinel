"use client";

import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AdminUser } from "@/app/(protected)/admin/_types";
import { UserStatusBadge } from "@/app/(protected)/admin/_components/user-management/_components/user-status-badge";
import { UserActionsMenu } from "@/app/(protected)/admin/_components/user-management/_components/user-actions-menu";

interface UserTableRowProps {
    user: AdminUser;
    onEdit: (user: AdminUser) => void;
}

export function UserTableRow({ user, onEdit }: UserTableRowProps) {
    return (
        <TableRow>
            <TableCell>
                <div className="flex flex-col">
                    <span className="font-medium">
                        {user.firstName} {user.lastName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                        {user.email}
                    </span>
                </div>
            </TableCell>
            <TableCell>
                <Badge variant="outline" className="capitalize">
                    {user.role}
                </Badge>
            </TableCell>
            <TableCell>
                {user.studentNo || user.department || "-"}
            </TableCell>
            <TableCell>
                <UserStatusBadge status={user.status} />
            </TableCell>
            <TableCell>{user.lastActive}</TableCell>
            <TableCell className="text-right">
                <UserActionsMenu user={user} onEdit={onEdit} />
            </TableCell>
        </TableRow>
    );
}
