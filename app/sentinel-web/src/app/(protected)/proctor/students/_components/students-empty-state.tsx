"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, UserPlus } from "lucide-react";
import { StudentsEmptyStateProps } from "@/app/(protected)/proctor/students/_types";

export function StudentsEmptyState({ isSearching, onAddClick }: StudentsEmptyStateProps) {
    return (
        <Card className="p-12 border-border/50">
            <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto">
                    <Users className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-foreground">
                        {isSearching ? "No students found" : "No students yet"}
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-2">
                        {isSearching
                            ? "No results found. Try a different search term."
                            : "Add students by uploading a CSV or Excel file with student information."}
                    </p>
                </div>
                {!isSearching && (
                    <Button
                        onClick={onAddClick}
                        className="bg-[#323d8f] hover:bg-[#323d8f]/90"
                    >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Add Students
                    </Button>
                )}
            </div>
        </Card>
    );
}
