
"use client";

import { Building2 } from "lucide-react";
import { AddDepartmentDialog } from "@/app/(protected)/admin/departments/_components/add-department-dialog";
import { DepartmentsList } from "@/app/(protected)/admin/departments/_components/departments-list";
import { useDepartmentsQuery } from "@/app/(protected)/admin/departments/_hooks/use-departments";

export default function AdminDepartmentsPage() {
    const { data: departments = [], isLoading, isError, error } = useDepartmentsQuery();

    if (isLoading) {
        return <div className="p-8">Loading departments...</div>;
    }

    if (isError) {
        return (
            <div className="p-8 text-red-500">
                Failed to load departments. Error: {error?.message}
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 md:p-6 p-4">
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Department Management</h1>
                        <p className="text-muted-foreground">
                            Manage academic departments and codes.
                        </p>
                    </div>
                     <AddDepartmentDialog />
                </div>
            </div>

            <DepartmentsList departments={departments} />
        </div>
    );
}
