"use client";

import { DataTable } from "@/components/ui/data-table/data-table";
import { ExamsGridProps } from "../_types"; // Reuse props for now as it's just { exams: ProctorExam[] }
import { columns } from "./columns";

interface ExamsTableProps extends ExamsGridProps {
    toolbarActions?: React.ReactNode;
}

export function ExamsTable({ exams, toolbarActions }: ExamsTableProps) {
    return (
        <DataTable 
            columns={columns} 
            data={exams}
            toolbarActions={toolbarActions}
        />
    );
}
