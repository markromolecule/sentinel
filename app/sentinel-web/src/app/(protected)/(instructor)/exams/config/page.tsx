'use client';

import { Suspense } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Button, PageHeader, Separator } from '@sentinel/ui';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ExamConfigForm } from '@/features/exams';
import {
    useExamConfigurationQuery,
    useExaminationConfigurationDefaultsQuery,
    useExamQuery,
    useUpdateExamConfigurationMutation,
} from '@sentinel/hooks';
import type { ExamConfigurationState } from '@sentinel/services';

function ProctorExamConfigContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const id = searchParams.get('id');
    const backHref = id ? `/exams/${id}/builder` : '/exams';
    const { data: exam, isLoading: isExamLoading } = useExamQuery(id ?? undefined);
    const { data: configurationState, isLoading: isConfigurationLoading } =
        useExamConfigurationQuery(id ?? undefined);
    const { data: examinationDefaults } = useExaminationConfigurationDefaultsQuery();
    const updateConfigurationMutation = useUpdateExamConfigurationMutation();

    const handleSubmit = async (values: ExamConfigurationState) => {
        if (!id) {
            return;
        }

        await updateConfigurationMutation.mutateAsync({
            examId: id,
            payload: values,
        });

        router.push(backHref);
    };

    return (
        <div className="flex flex-col gap-6 p-4 md:p-6">
            <PageHeader
                title={exam ? `${exam.title} Configuration` : 'Exam Configuration'}
                description="Update the actual exam rules, recovery policy, and web or mobile proctoring safeguards saved for this exam."
            >
                <div className="flex items-center gap-2">
                    <Button variant="outline" asChild>
                        <Link href={backHref}>
                            <ChevronLeft className="mr-2 h-4 w-4" />
                            Back
                        </Link>
                    </Button>
                    <Button
                        type="submit"
                        form="proctor-config-form"
                        disabled={!configurationState || updateConfigurationMutation.isPending}
                    >
                        {updateConfigurationMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </PageHeader>

            <Separator />

            {!id ? (
                <div className="border-border/60 text-muted-foreground rounded-2xl border border-dashed px-6 py-10 text-sm">
                    Select an exam from the builder to edit its configuration.
                </div>
            ) : isExamLoading || isConfigurationLoading ? (
                <div
                    aria-live="polite"
                    className="border-border/60 flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed"
                >
                    <div className="flex flex-col items-center gap-3">
                        <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
                        <p className="text-muted-foreground text-sm">
                            Loading the saved exam configuration...
                        </p>
                    </div>
                </div>
            ) : configurationState ? (
                <ExamConfigForm
                    defaultValues={configurationState}
                    examinationDefaults={examinationDefaults}
                    onSubmit={handleSubmit}
                />
            ) : (
                <div className="border-border/60 text-muted-foreground rounded-2xl border border-dashed px-6 py-10 text-sm">
                    Unable to load the current configuration for this exam.
                </div>
            )}
        </div>
    );
}

export default function ProctorExamConfigPage() {
    return (
        <Suspense
            fallback={
                <div className="flex flex-col gap-6 p-4 md:p-6">
                    <div className="flex min-h-[400px] items-center justify-center">
                        <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
                    </div>
                </div>
            }
        >
            <ProctorExamConfigContent />
        </Suspense>
    );
}
