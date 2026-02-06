"use client";

import { MOCK_PROCTOR_EXAMS } from "@/app/(protected)/proctor/_constants";
import { ExamsList } from "@/app/(protected)/admin/exams/_components/exams-list";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Settings } from "lucide-react";

export default function AdminExamsPage() {
    return (
        <div className="flex flex-col gap-6 md:p-6 p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Exam Management</h1>
                    <p className="text-muted-foreground">
                        View and monitor all examinations across the system.
                    </p>
                </div>
                <Button asChild className="bg-[#323d8f] hover:bg-[#323d8f]/90">
                    <Link href="/admin/exams/configuration">
                        <Settings className="mr-2 h-4 w-4" />
                        Configure Defaults
                    </Link>
                </Button>
            </div>

            <ExamsList exams={MOCK_PROCTOR_EXAMS} />
        </div>
    );
}
