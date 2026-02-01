"use client";

import { UserManagementTable } from "@/app/(protected)/admin/users/_components";
import { MOCK_USERS } from "@/app/(protected)/admin/_constants";

export default function UserManagementPage() {
    return (
        <div className="flex flex-col gap-6 md:p-6 p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
                    <p className="text-muted-foreground">
                        Manage system access, roles, and account status.
                    </p>
                </div>
            </div>
            <UserManagementTable users={MOCK_USERS} />
        </div>
    );
}
