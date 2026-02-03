"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ProctorAssignmentList as AssignmentList } from "@/app/(protected)/admin/proctor/assignment/_components";
import { MOCK_PROCTOR_ASSIGNMENTS } from "@/app/(protected)/admin/_constants";
import { useProctorAssignment } from "@/app/(protected)/admin/proctor/assignment/_hooks/use-proctor-assignment";
import { AssignProctorDialog } from "@/app/(protected)/admin/proctor/assignment/_components/assign-proctor-dialog";

export default function ProctorAssignmentPage() {
    const {
        filteredAssignments,
        editingAssignment,
        isCreateDialogOpen,
        handleEdit,
        handleCreate,
        handleCloseDialog,
    } = useProctorAssignment({ assignments: MOCK_PROCTOR_ASSIGNMENTS });

    return (
        <div className="flex flex-col gap-6 md:p-6 p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Proctor Assignment</h1>
                    <p className="text-muted-foreground">
                        Overview of current exam proctor allocations.
                    </p>
                </div>
                <Button size="sm" onClick={handleCreate} className="bg-[#323d8f] hover:bg-[#323d8f]/90">
                    <Plus className="mr-2 h-4 w-4" />
                    Assign Proctor
                </Button>
            </div>
            
            <AssignmentList 
                assignments={filteredAssignments} 
                onEdit={handleEdit} 
            />

            <AssignProctorDialog
                open={!!editingAssignment || isCreateDialogOpen}
                onOpenChange={handleCloseDialog}
                assignment={editingAssignment}
            />
        </div>
    );
}
