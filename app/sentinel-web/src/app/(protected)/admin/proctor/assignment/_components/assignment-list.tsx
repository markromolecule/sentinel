"use client";

import { DataTable } from "@/components/ui/data-table/data-table";
import { ProctorAssignment } from "@/app/(protected)/admin/_types";
import { columns } from "./columns";

interface AssignmentListProps {
    assignments: ProctorAssignment[];
    onEdit: (assignment: ProctorAssignment) => void;
}

export function AssignmentList({ assignments, onEdit }: AssignmentListProps) {
    return (
        <DataTable 
            columns={columns(onEdit)} 
            data={assignments} 
            searchKey="proctorName" 
            searchPlaceholder="Filter proctors..." 
        />
    );
}
