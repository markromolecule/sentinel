"use client";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { AdminUser } from "@/app/(protected)/admin/_types";
import { UserTableRow } from "@/app/(protected)/admin/_components/user-management/_components/user-table-row";

interface UserTableProps {
    users: AdminUser[];
    onEdit: (user: AdminUser) => void;
}

export function UserTable({ users, onEdit }: UserTableProps) {
    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>User Identity</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Department / ID</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Active</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {users.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">
                                No users found matching your criteria.
                            </TableCell>
                        </TableRow>
                    ) : (
                        users.map((user) => (
                            <UserTableRow key={user.id} user={user} onEdit={onEdit} />
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
