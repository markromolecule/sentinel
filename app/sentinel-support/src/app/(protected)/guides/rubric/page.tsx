'use client';

import React, { useState } from 'react';
import { PageHeader, Separator, Spinner, Button } from '@sentinel/ui';
import {
    useAccessControlEssayRubricQuery,
    useAccessControlEssayRubricMutation,
} from '@sentinel/hooks';
import { EssayRubricEditor } from '@sentinel/ui';
import { Pencil } from 'lucide-react';

/**
 * SupportGuideRubricPage enables support agents to manage and update the global
 * system-wide baseline essay grading rubric.
 */
export default function SupportGuideRubricPage() {
    const [editorDirty, setEditorDirty] = useState(false);
    const [builderOpen, setBuilderOpen] = useState(false);

    const {
        data: rubric,
        isLoading: isLoadingRubric,
        isError: isErrorRubric,
        error: rubricError,
    } = useAccessControlEssayRubricQuery();

    const saveMutation = useAccessControlEssayRubricMutation({
        onSuccess: () => {
            setEditorDirty(false);
        },
    });

    const handleSave = async (criteria: any) => {
        await saveMutation.mutateAsync({
            criteria,
        });
    };

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title="Global Essay Rubric Baseline"
                description="Manage and customize the system-wide baseline essay grading criteria. All examinations inherit this baseline unless explicitly overridden."
            >
                {rubric && !isLoadingRubric && (rubric.canOverride ?? true) && (
                    <Button type="button" onClick={() => setBuilderOpen(true)} className="gap-1.5">
                        <Pencil className="h-4 w-4" />
                        Open Rubric Builder
                    </Button>
                )}
            </PageHeader>
            <Separator />

            {/* Rubric Editor Workspace */}
            {isLoadingRubric ? (
                <div className="flex h-64 items-center justify-center">
                    <Spinner className="text-primary h-8 w-8" />
                    <span className="ml-3 text-sm font-medium text-slate-500">
                        Loading system baseline rubric...
                    </span>
                </div>
            ) : isErrorRubric || !rubric ? (
                <div className="rounded-lg border border-red-200 bg-red-50/50 p-6 text-center text-red-900 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-200">
                    <p className="text-sm font-semibold">Failed to load system baseline rubric</p>
                    <p className="mt-1 text-xs text-red-700/80 dark:text-red-300/80">
                        {rubricError?.message || 'Unknown error occurred.'}
                    </p>
                </div>
            ) : (
                <EssayRubricEditor
                    key={`baseline-${rubric.rubricVersionId}`}
                    initialCriteria={rubric.definition.criteria}
                    onSave={handleSave}
                    isSaving={saveMutation.isPending}
                    canOverride={true}
                    onDirtyChange={setEditorDirty}
                    builderOpen={builderOpen}
                    onBuilderOpenChange={setBuilderOpen}
                    showBuilderTrigger={false}
                />
            )}
        </div>
    );
}
