'use client';

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    Button,
} from '@sentinel/ui';
import { MoreHorizontal, Edit, Trash } from 'lucide-react';
import { User } from '@sentinel/shared/types';
import { toast } from 'sonner';
import type { AdministratorRole } from '@/app/(protected)/(support)/users/_lib/administrator-role-config';
import { getAdministratorRoleConfig } from '@/app/(protected)/(support)/users/_lib/administrator-role-config';
import { PermissionGuard } from '@sentinel/hooks';

interface AdministratorActionsCellProps {
    administrator: User;
    role: AdministratorRole;
    isCurrentUser?: boolean;
    onEdit: (admin: User) => void;
    onDelete: (admin: User) => void;
}

export function AdministratorActionsCell({
    administrator,
    role,
    isCurrentUser = false,
    onEdit,
    onDelete,
}: AdministratorActionsCellProps) {
    const config = getAdministratorRoleConfig(role);

    const onCopy = (id: string) => {
        navigator.clipboard.writeText(id);
        toast.success(config.copySuccessMessage);
    };

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
                <DropdownMenuItem onClick={() => onCopy(administrator.id)}>
                    Copy ID
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <PermissionGuard permission="users:update">
                    <DropdownMenuItem onClick={() => onEdit(administrator)}>
                        <Edit className="mr-2 h-4 w-4" /> Edit
                    </DropdownMenuItem>
                </PermissionGuard>
                <DropdownMenuSeparator />
                {!isCurrentUser && (
                    <PermissionGuard permission="users:delete">
                        <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => onDelete(administrator)}
                        >
                            <Trash className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                    </PermissionGuard>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
