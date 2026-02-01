"use client";

import { ProctorAssignmentList } from "@/app/(protected)/admin/proctor-assignment/_components";
import { MOCK_PROCTOR_ASSIGNMENTS } from "@/app/(protected)/admin/_constants";

export default function ProctorAssignmentPage() {
    return (
        <div className="flex flex-col gap-6 md:p-6 p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Proctor Assignment</h1>
                    <p className="text-muted-foreground">
                        Overview of current exam proctor allocations.
                    </p>
                </div>
                {/* Actions handled within component for now to match strict style requests later if moved */}
            </div>
            <ProctorAssignmentList assignments={MOCK_PROCTOR_ASSIGNMENTS} />
        </div>
    );
}
