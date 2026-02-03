"use client";

import { DataTable } from "@/components/ui/data-table/data-table";
import { useSubjectStore } from "@/stores/use-subject-store";
import { type Subject } from "@sentinel/shared/src/types";
import { columns } from "./columns";

interface SubjectsTableProps {
    subjects: Subject[];
}

export function SubjectsTable({ subjects }: SubjectsTableProps) {
    const removeSubject = useSubjectStore((state) => state.removeSubject);

    return (
        <DataTable 
            columns={columns(removeSubject)} 
            data={subjects} 
            searchKey="title" 
            searchPlaceholder="Search subjects..." 
        />
    );
}
