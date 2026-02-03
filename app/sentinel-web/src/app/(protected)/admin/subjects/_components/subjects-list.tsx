"use client";

import { DataTable } from "@/components/ui/data-table/data-table";
import { type Subject } from "@sentinel/shared/src/types";
import { columns } from "./columns";

interface SubjectsListProps {
    subjects: Subject[];
}

export function SubjectsList({ subjects }: SubjectsListProps) {
    return (
        <DataTable 
            columns={columns} 
            data={subjects} 
            searchKey="title" 
            searchPlaceholder="Search subjects..." 
        />
    );
}
