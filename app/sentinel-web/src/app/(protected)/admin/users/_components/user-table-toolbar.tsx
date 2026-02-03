"use client";

import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search } from "lucide-react";


interface UserTableToolbarProps {
    currentTab: string;
    onTabChange: (value: string) => void;
}

export function UserTableToolbar({
    currentTab,
    onTabChange,
}: UserTableToolbarProps) {
    return (
        <Tabs value={currentTab} onValueChange={onTabChange} className="w-[400px]">
            <TabsList>
                <TabsTrigger value="all">All Users</TabsTrigger>
                <TabsTrigger value="student">Students</TabsTrigger>
                <TabsTrigger value="proctor">Proctors</TabsTrigger>
                <TabsTrigger value="staff">Staff</TabsTrigger>
            </TabsList>
        </Tabs>
    );
}
