"use client";

import { DataTable } from "@/components/ui/data-table/data-table";
import { ExamsGridProps } from "../_types"; // Reuse props for now as it's just { exams: ProctorExam[] }
import { columns } from "./columns";

export function ExamsTable({ exams }: ExamsGridProps) {
    return (
        <DataTable 
            columns={columns} 
            data={exams} 
            searchKey="title" 
            searchPlaceholder="Search exams..." 
        />
    );
}
