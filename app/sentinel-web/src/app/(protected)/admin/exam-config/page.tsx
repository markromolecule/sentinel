"use client";

import { ExamConfigForm } from "../_components/exam-config";
import { MOCK_EXAM_CONFIG } from "../_constants";

export default function ExamConfigPage() {
    return (
        <div className="flex-1 space-y-4 max-w-4xl">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Exam Configuration</h2>
                <p className="text-muted-foreground">Manage global proctoring policies and system-wide exam rules.</p>
            </div>
            <ExamConfigForm defaultValues={MOCK_EXAM_CONFIG} />
        </div>
    );
}
