"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Plus } from "lucide-react";
import { ExamEmptyStateProps } from "@/app/(protected)/proctor/exams/_types";

export function ExamEmptyState({ isSearching, onCreateClick }: ExamEmptyStateProps) {
    return (
        <Card className="p-12 border-border/50">
            <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto">
                    <FileText className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-foreground">
                        {isSearching ? "No exams found" : "No exams yet"}
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-2">
                        {isSearching
                            ? "No results found. Try a different search term."
                            : "Create your first exam to get started with proctoring."}
                    </p>
                </div>
                {!isSearching && (
                    <Button
                        onClick={onCreateClick}
                        className="bg-[#323d8f] hover:bg-[#323d8f]/90"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Create Exam
                    </Button>
                )}
            </div>
        </Card>
    );
}
