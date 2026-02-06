"use client";

import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ExamConfigForm } from "@/app/(protected)/admin/exams/configuration/_components";
import { MOCK_EXAM_CONFIG } from "@/app/(protected)/admin/_constants";

export default function ExamConfigPage() {
    return (
        <div className="flex-1 space-y-6">
            <div className="flex flex-col gap-4 border-b pb-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild className="size-8">
                        <Link href="/admin/exams">
                            <ChevronLeft className="size-4" />
                        </Link>
                    </Button>
                    <h2 className="text-3xl font-bold tracking-tight">Exam Configuration</h2>
                </div>
                <p className="text-muted-foreground ml-12">Manage global proctoring policies and system-wide exam rules.</p>
            </div>
            <ExamConfigForm defaultValues={MOCK_EXAM_CONFIG} />
        </div>
    );
}
