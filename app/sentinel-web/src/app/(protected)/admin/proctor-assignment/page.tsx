"use client";

import { ProctorAssignmentList } from "@/app/(protected)/admin/proctor-assignment/_components";
import { MOCK_PROCTOR_ASSIGNMENTS } from "@/app/(protected)/admin/_constants";

export default function ProctorAssignmentPage() {
    return (
        <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Proctor Assignment</h2>
            </div>
            <ProctorAssignmentList assignments={MOCK_PROCTOR_ASSIGNMENTS} />
        </div>
    );
}
