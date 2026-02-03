"use client";

import { DataTable } from "@/components/ui/data-table/data-table";
import { ProctorAssignmentExam } from "../_types";
import { columns } from "./columns";

interface ProctorAssignmentTableProps {
    data: ProctorAssignmentExam[];
}

export function ProctorAssignmentTable({ data }: ProctorAssignmentTableProps) {
    return (
        <DataTable 
            columns={columns} 
            data={data} 
            searchKey="title" 
            searchPlaceholder="Search exams..." 
        />
    );
}
