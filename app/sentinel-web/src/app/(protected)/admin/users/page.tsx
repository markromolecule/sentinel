"use client";

import { UserManagementTable } from "@/app/(protected)/admin/_components/user-management";
import { MOCK_USERS } from "@/app/(protected)/admin/_constants";

export default function UserManagementPage() {
    return (
        <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">User Management</h2>
            </div>
            <UserManagementTable users={MOCK_USERS} />
        </div>
    );
}
