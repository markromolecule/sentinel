"use client";

import { useSubjectStore } from "@/stores/use-subject-store";
import { SubjectsList } from "./_components/subjects-list";

export default function AdminSubjectsPage() {
    const subjects = useSubjectStore((state) => state.subjects);

    return (
        <div className="flex flex-col gap-6 md:p-6 p-4">
            <div className="flex flex-col gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Subject Management</h1>
                    <p className="text-muted-foreground">
                        View and manage all subjects created by proctors.
                    </p>
                </div>
            </div>

            <SubjectsList subjects={subjects} />
        </div>
    );
}
