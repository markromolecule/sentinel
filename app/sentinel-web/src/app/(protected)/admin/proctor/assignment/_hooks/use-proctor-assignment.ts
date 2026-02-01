"use client";

import { useState } from "react";
import { ProctorAssignment } from "@/app/(protected)/admin/_types";

interface UseProctorAssignmentProps {
    assignments: ProctorAssignment[];
}

export function useProctorAssignment({ assignments }: UseProctorAssignmentProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [editingAssignment, setEditingAssignment] = useState<ProctorAssignment | null>(null);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

    // Filter logic (simple client-side for now)
    const filteredAssignments = assignments.filter((assignment) =>
        assignment.proctorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        assignment.examName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleEdit = (assignment: ProctorAssignment) => {
        setEditingAssignment(assignment);
    };

    const handleCreate = () => {
        setEditingAssignment(null);
        setIsCreateDialogOpen(true);
    };

    const handleCloseDialog = (open: boolean) => {
        if (!open) {
            setEditingAssignment(null);
            setIsCreateDialogOpen(false);
        }
    };

    return {
        searchQuery,
        setSearchQuery,
        filteredAssignments,
        editingAssignment,
        isCreateDialogOpen,
        handleEdit,
        handleCreate,
        handleCloseDialog,
    };
}
