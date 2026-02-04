"use client";

import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { UserCheck } from "lucide-react";
import { MOCK_PROCTOR_EXAMS, MOCK_PROCTOR } from "../_constants";
import { ProctorAssignmentTable } from "./_components/assignment-table";

export default function ProctorAssignmentPage() {

    // Enhanced mock data to include proctor assignment info
    // In a real app, this would come from the backend joining Exam and Proctor tables
    const assignedExams = MOCK_PROCTOR_EXAMS.map(exam => ({
        ...exam,
        assignedProctor: exam.id === "2" ? "John Doe" : MOCK_PROCTOR.name, // Mock assignments
        assignedProctorId: exam.id === "2" ? "2" : MOCK_PROCTOR.id,
    }));
    return (
        <div className="flex flex-col gap-6 md:p-6 p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Proctor Assignment</h1>
                    <p className="text-muted-foreground">
                        Manage proctor assignments for examinations.
                    </p>
                </div>
                <Button className="bg-[#323d8f] hover:bg-[#323d8f]/90 text-white">
                    <UserCheck className="w-4 h-4 mr-2" />
                    Assign Proctor
                </Button>
            </div>

            <Separator />

            <ProctorAssignmentTable data={assignedExams} />
        </div>
    );
}
