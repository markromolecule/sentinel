"use client";

import { DataTable } from "@/components/ui/data-table/data-table";
import { StudentsTableProps } from "@/app/(protected)/proctor/students/_types";
import { columns } from "@/app/(protected)/proctor/students/_components/columns";

export function StudentsTable({ students }: StudentsTableProps) {
    return (
        <DataTable 
            columns={columns} 
            data={students} 
            searchKey="name" 
            searchPlaceholder="Search students..." 
        />
    );
}
