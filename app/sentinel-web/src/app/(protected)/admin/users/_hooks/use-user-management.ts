"use client";

import { useState } from "react";
import { AdminUser } from "@/app/(protected)/admin/_types";

interface UseUserManagementProps {
    users: AdminUser[];
}

export function useUserManagement({ users }: UseUserManagementProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [currentTab, setCurrentTab] = useState("all");
    const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

    const filteredUsers = users.filter((user) => {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
            user.firstName.toLowerCase().includes(query) ||
            user.lastName.toLowerCase().includes(query) ||
            user.email.toLowerCase().includes(query) ||
            (user.studentNo && user.studentNo.toLowerCase().includes(query));

        const matchesTab = currentTab === "all" || user.role === currentTab || (currentTab === "staff" && ["admin", "proctor", "instructor"].includes(user.role));

        return matchesSearch && matchesTab;
    });

    return {
        searchQuery,
        setSearchQuery,
        currentTab,
        setCurrentTab,
        filteredUsers,
        editingUser,
        setEditingUser,
    };
}
