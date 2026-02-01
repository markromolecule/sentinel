"use client";

import { useSubjectStore } from "@/stores/use-subject-store";
import { SubjectsTable } from "./_components/subjects-table";
import { AddSubjectDialog } from "./_components/add-subject-dialog";
import { Separator } from "@/components/ui/separator";

export default function SubjectsPage() {
    const subjects = useSubjectStore((state) => state.subjects);

    return (
        <div className="flex flex-col gap-6 md:p-6 p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Subject Management</h1>
                    <p className="text-muted-foreground">
                        Manage the subjects you are teaching or proctoring.
                    </p>
                </div>
                <AddSubjectDialog />
            </div>

            <Separator />

            {subjects.length > 0 ? (
                <SubjectsTable subjects={subjects} />
            ) : (
                <div className="flex h-[400px] flex-col items-center justify-center rounded-lg border border-dashed bg-muted/40 p-8 text-center animate-in fade-in-50">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                        <span className="text-4xl">📚</span>
                    </div>
                    <h3 className="mt-4 text-lg font-semibold">No subjects added</h3>
                    <p className="mb-4 mt-2 text-sm text-muted-foreground max-w-sm">
                        You haven't added any subjects yet. Click the button above to add your first subject.
                    </p>
                    <AddSubjectDialog />
                </div>
            )}
        </div>
    );
}
