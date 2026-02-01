"use client";


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
        <div className="space-y-4">
            <UserTableToolbar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                currentTab={currentTab}
                onTabChange={setCurrentTab}
            />
            <UserTable users={filteredUsers} onEdit={setEditingUser} />

            <EditUserDialog
                user={editingUser}
                open={!!editingUser}
                onOpenChange={(open) => !open && setEditingUser(null)}
            />
        </div>
    );
}
