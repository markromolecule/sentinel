'use client';

import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
    PageHeader,
    Separator,
    Card,
    CardContent,
    Spinner,
    Badge,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Button,
} from '@sentinel/ui';
import {
    useExamsQuery,
    useEssayRubricQuery,
    useUpdateExamEssayRubricMutation,
    useResetExamEssayRubricMutation,
} from '@sentinel/hooks';
import { EssayRubricEditor } from '@sentinel/ui';
import { BookOpen, Pencil } from 'lucide-react';
import { toast } from 'sonner';

/**
 * ProctorGuideRubricPage enables administrators to view and override the essay grading
 * rubric on an exam-by-exam basis. Inherits the global platform baseline by default.
 */
export default function ProctorGuideRubricPage() {
    const queryClient = useQueryClient();
    const { data: exams = [], isLoading: isLoadingExams, isError: isErrorExams } = useExamsQuery();

    const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
    const [editorDirty, setEditorDirty] = useState(false);
    const [builderOpen, setBuilderOpen] = useState(false);

    // Default to the first exam
    useEffect(() => {
        if (!selectedExamId && exams.length > 0) {
            setSelectedExamId(exams[0].id);
        }
    }, [exams, selectedExamId]);

    const {
        data: rubric,
        isLoading: isLoadingRubric,
        isError: isErrorRubric,
        error: rubricError,
    } = useEssayRubricQuery(selectedExamId ?? undefined);

    const saveMutation = useUpdateExamEssayRubricMutation({
        onSuccess: () => {
            toast.success('Exam essay rubric custom override saved successfully.');
            setEditorDirty(false);
        },
        onError: (error: any) => {
            if (
                error?.status === 403 ||
                error?.statusCode === 403 ||
                error?.message?.includes('403')
            ) {
                toast.error(
                    'Permission denied: You do not have permission to override the rubric for this exam.',
                );
                // Stale permission state -> invalidate active permissions and current rubric to revert UI to read-only
                queryClient.invalidateQueries({ queryKey: ['user'] });
                if (selectedExamId) {
                    queryClient.invalidateQueries({ queryKey: ['essayRubric', selectedExamId] });
                }
            } else {
                toast.error(error?.message || 'Failed to save essay rubric override.');
            }
        },
    });

    const resetMutation = useResetExamEssayRubricMutation({
        onSuccess: () => {
            toast.success('Rubric custom override cleared. Reset to baseline successfully.');
            setEditorDirty(false);
        },
        onError: (error: any) => {
            if (
                error?.status === 403 ||
                error?.statusCode === 403 ||
                error?.message?.includes('403')
            ) {
                toast.error(
                    'Permission denied: You do not have permission to reset this exam rubric.',
                );
                queryClient.invalidateQueries({ queryKey: ['user'] });
                if (selectedExamId) {
                    queryClient.invalidateQueries({ queryKey: ['essayRubric', selectedExamId] });
                }
            } else {
                toast.error(error?.message || 'Failed to reset essay rubric to baseline.');
            }
        },
    });

    const handleSelectExam = (examId: string) => {
        if (editorDirty) {
            const confirmDiscard = window.confirm(
                'You have unsaved changes in the rubric editor. Switching exams will discard these changes. Proceed?',
            );
            if (!confirmDiscard) return;
        }
        setSelectedExamId(examId);
        setEditorDirty(false);
        setBuilderOpen(false);
    };

    const handleSave = async (criteria: any) => {
        if (!selectedExamId) return;
        await saveMutation.mutateAsync({
            examId: selectedExamId,
            payload: { criteria },
        });
    };

    const handleReset = async () => {
        if (!selectedExamId) return;
        await resetMutation.mutateAsync(selectedExamId);
    };

    if (isLoadingExams) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Spinner className="text-primary h-8 w-8" />
                <span className="ml-3 text-sm font-medium text-slate-500">
                    Loading exams list...
                </span>
            </div>
        );
    }

    if (isErrorExams) {
        return (
            <div className="rounded-lg border border-red-200 bg-red-50/50 p-6 text-center text-red-900 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-200">
                <p className="text-sm font-semibold">Failed to load examinations</p>
                <p className="mt-1 text-xs text-red-700/80 dark:text-red-300/80">
                    Please check your network and try again.
                </p>
            </div>
        );
    }

    if (exams.length === 0) {
        return (
            <div className="flex flex-col gap-6">
                <PageHeader
                    title="Custom Essay Rubrics"
                    description="Customize essay grading criteria and scoring guidelines per exam."
                />
                <Separator />
                <div className="bg-muted/50 border-border flex flex-col items-center justify-center rounded-2xl border border-dashed py-20 text-center">
                    <div className="bg-muted mb-4 flex h-16 w-16 items-center justify-center rounded-full">
                        <BookOpen className="text-muted-foreground h-8 w-8" />
                    </div>
                    <h3 className="text-foreground mb-2 text-xl font-semibold">No exams found</h3>
                    <p className="text-muted-foreground mx-auto max-w-md">
                        Create an examination first before you can configure or customize its essay
                        grading rubric.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title="Custom Essay Rubrics"
                description="Manage and customize the essay grading criteria and scoring levels for your exams."
            >
                {rubric && !isLoadingRubric && (rubric.canOverride ?? false) && (
                    <Button type="button" onClick={() => setBuilderOpen(true)} className="gap-1.5">
                        <Pencil className="h-4 w-4" />
                        Open Rubric Builder
                    </Button>
                )}
            </PageHeader>
            <Separator />

            {/* Exam Selector Panel */}
            <Card className="rounded-lg border py-0 shadow-xs">
                <CardContent className="p-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex-1 space-y-1.5">
                            <span className="text-muted-foreground/80 text-[12px] font-semibold tracking-wider uppercase">
                                Active Selection
                            </span>
                            <div className="w-full max-w-md">
                                <Select
                                    value={selectedExamId || undefined}
                                    onValueChange={handleSelectExam}
                                >
                                    <SelectTrigger className="border-border/60 bg-background focus:border-primary focus:ring-primary/20 h-10 transition-all focus:ring-2">
                                        <SelectValue placeholder="Select an exam to customize..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {exams.map((exam) => (
                                            <SelectItem key={exam.id} value={exam.id}>
                                                {exam.title} ({exam.subject})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {rubric && !isLoadingRubric && (
                            <div className="flex flex-wrap items-center gap-3">
                                {rubric.source === 'EXAM_OVERRIDE' ? (
                                    <Badge className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 shadow-none hover:bg-emerald-500/15">
                                        Custom Rubric (Version v{rubric.versionNumber})
                                    </Badge>
                                ) : (
                                    <Badge className="rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-600 shadow-none hover:bg-indigo-500/15">
                                        Inherited Baseline (Version v{rubric.versionNumber})
                                    </Badge>
                                )}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Rubric Editor Workspace */}
            {isLoadingRubric ? (
                <div className="flex h-64 items-center justify-center">
                    <Spinner className="text-primary h-8 w-8" />
                    <span className="ml-3 text-sm font-medium text-slate-500">
                        Loading exam rubric details...
                    </span>
                </div>
            ) : isErrorRubric || !rubric ? (
                <div className="rounded-lg border border-red-200 bg-red-50/50 p-6 text-center text-red-900 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-200">
                    <p className="text-sm font-semibold">Failed to load essay rubric</p>
                    <p className="mt-1 text-xs text-red-700/80 dark:text-red-300/80">
                        {rubricError?.message || 'Unknown error occurred.'}
                    </p>
                </div>
            ) : (
                <EssayRubricEditor
                    key={`${selectedExamId}-${rubric.rubricVersionId}`}
                    initialCriteria={rubric.definition.criteria}
                    onSave={handleSave}
                    isSaving={saveMutation.isPending}
                    onReset={rubric.source === 'EXAM_OVERRIDE' ? handleReset : undefined}
                    isResetting={resetMutation.isPending}
                    canOverride={rubric.canOverride ?? false}
                    onDirtyChange={setEditorDirty}
                    builderOpen={builderOpen}
                    onBuilderOpenChange={setBuilderOpen}
                    showBuilderTrigger={false}
                />
            )}
        </div>
    );
}
