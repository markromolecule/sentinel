"use client";

import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search } from "lucide-react";
import { AddUserDialog } from "@/app/(protected)/admin/_components/user-management/_components/add-user-dialog";

interface UserTableToolbarProps {
    searchQuery: string;
    onSearchChange: (value: string) => void;
    currentTab: string;
    onTabChange: (value: string) => void;
}

export function UserTableToolbar({
    searchQuery,
    onSearchChange,
    currentTab,
    onTabChange,
}: UserTableToolbarProps) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <Tabs value={currentTab} onValueChange={onTabChange} className="w-full">
                    <TabsList>
                        <TabsTrigger value="all">All Users</TabsTrigger>
                        <TabsTrigger value="student">Students</TabsTrigger>
                        <TabsTrigger value="proctor">Proctors</TabsTrigger>
                        <TabsTrigger value="staff">Staff</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            <div className="flex items-center justify-between pb-4">
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by name, email, or ID..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="pl-8"
                    />
                </div>
                <AddUserDialog />
            </div>
        </div>
    );
}
