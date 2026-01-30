"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ExamsPageHeaderProps } from "@/app/(protected)/proctor/exams/_types";

export function ExamsPageHeader({ onCreateClick }: ExamsPageHeaderProps) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
                <h1 className="text-3xl font-bold text-foreground">Exams</h1>
                <p className="text-muted-foreground">
                    Create and manage your proctored exams
                </p>
            </div>
            <Button
                onClick={onCreateClick}
                className="bg-[#323d8f] hover:bg-[#323d8f]/90"
            >
                <Plus className="w-4 h-4 mr-2" />
                Create Exam
            </Button>
        </div>
    );
}
