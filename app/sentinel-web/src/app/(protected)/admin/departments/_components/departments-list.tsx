
"use client";

import { DataTable } from "@/components/ui/data-table/data-table";
import { type Department } from "@sentinel/shared/src/types";
import { columns } from "./columns";

interface DepartmentsListProps {
    departments: Department[];
}

export function DepartmentsList({ departments }: DepartmentsListProps) {
    return (
        <DataTable 
            columns={columns} 
            data={departments} 
            searchKey="name" 
            searchPlaceholder="Search departments..." 
        />
    );
}
