"use client";

import { AdminUser } from "@/app/(protected)/admin/_types";
import { useUserManagement } from "@/app/(protected)/admin/users/_hooks/use-user-management";
import { UserTableToolbar } from "@/app/(protected)/admin/users/_components/user-table-toolbar";
import { DataTable } from "@/components/ui/data-table/data-table";
import { columns } from "./columns";
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

    const userColumns = columns(setEditingUser);

    return (
        <div className="space-y-4">
            <DataTable 
                columns={userColumns} 
                data={filteredUsers} 
                searchKey="email"
                searchPlaceholder="Filter emails..."
                toolbarActions={
                    <UserTableToolbar
                        currentTab={currentTab}
                        onTabChange={setCurrentTab}
                    />
                }
            />

            <EditUserDialog
                user={editingUser}
                open={!!editingUser}
                onOpenChange={(open) => !open && setEditingUser(null)}
            />
        </div>
    );
}
