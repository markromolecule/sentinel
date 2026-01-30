"use client";

import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import { StudentsPageHeaderProps } from "@/app/(protected)/proctor/students/_types";

export function StudentsPageHeader({ onAddClick }: StudentsPageHeaderProps) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
                <h1 className="text-3xl font-bold text-foreground">Students</h1>
                <p className="text-muted-foreground">
                    Manage and enroll students for your exams
                </p>
            </div>
            <Button
                onClick={onAddClick}
                className="bg-[#323d8f] hover:bg-[#323d8f]/90"
            >
                <UserPlus className="w-4 h-4 mr-2" />
                Add Students
            </Button>
        </div>
    );
}
