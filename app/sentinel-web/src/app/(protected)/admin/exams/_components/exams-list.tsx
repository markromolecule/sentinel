"use client";

import { DataTable } from "@/components/ui/data-table/data-table";
import { type ProctorExam } from "@/app/(protected)/proctor/_types";
import { columns } from "./columns";

interface ExamsListProps {
    exams: ProctorExam[];
}

export function ExamsList({ exams }: ExamsListProps) {


    return (
        <DataTable 
            columns={columns} 
            data={exams} 
            searchKey="title" 
            searchPlaceholder="Search exams..." 
        />
    );
}
