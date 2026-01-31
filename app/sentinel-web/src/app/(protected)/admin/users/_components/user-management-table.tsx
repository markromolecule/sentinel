"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AdminUser } from "@/app/(protected)/admin/_types";
import { useUserManagement } from "@/app/(protected)/admin/users/_hooks/use-user-management";
import { UserTableToolbar } from "@/app/(protected)/admin/users/_components/user-table-toolbar";
import { UserTable } from "@/app/(protected)/admin/users/_components/user-table";
import { EditUserDialog } from "@/app/(protected)/admin/users/_components/edit-user-dialog";

interface UserManagementTableProps {
    users: AdminUser[];
}

export function UserManagementTable({ users }: UserManagementTableProps) {
    const {
        searchQuery,
        setSearchQuery,
        currentTab,
        setCurrentTab,
        filteredUsers,
        editingUser,
        setEditingUser,
    } = useUserManagement({ users });

    return (
        <Card>
            <CardHeader className="space-y-1">
                <CardTitle>User Directory</CardTitle>
                <CardDescription>
                    Manage system access, roles, and account status.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <UserTableToolbar
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    currentTab={currentTab}
                    onTabChange={setCurrentTab}
                />
                <UserTable users={filteredUsers} onEdit={setEditingUser} />
            </CardContent>

            <EditUserDialog
                user={editingUser}
                open={!!editingUser}
                onOpenChange={(open) => !open && setEditingUser(null)}
            />
        </Card>
    );
}
