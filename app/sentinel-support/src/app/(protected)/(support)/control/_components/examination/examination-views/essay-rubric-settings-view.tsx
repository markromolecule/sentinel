'use client';

import React from 'react';
import {
    useAccessControlEssayRubricQuery,
    useAccessControlEssayRubricMutation,
} from '@sentinel/hooks';
import { EssayRubricEditor, Spinner } from '@sentinel/ui';

/**
 * EssayRubricSettingsView binds the access control query and mutation hooks
 * for baseline essay rubrics to the EssayRubricEditor component.
 * Managed by support administrators.
 */
export function EssayRubricSettingsView() {
    const { data: rubric, isLoading, isError, error } = useAccessControlEssayRubricQuery();
    const { mutateAsync: saveBaseline, isPending: isSaving } =
        useAccessControlEssayRubricMutation();

    if (isLoading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Spinner className="text-primary h-8 w-8" />
                <span className="ml-3 text-sm font-medium text-slate-500">
                    Loading baseline rubric...
                </span>
            </div>
        );
    }

    if (isError || !rubric) {
        return (
            <div className="rounded-lg border border-red-200 bg-red-50/50 p-6 text-center text-red-900 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-200">
                <p className="text-sm font-semibold">Failed to load baseline essay rubric</p>
                <p className="mt-1 text-xs text-red-700/80 dark:text-red-300/80">
                    {error?.message || 'Unknown error occurred.'}
                </p>
            </div>
        );
    }

    const handleSave = async (criteria: any) => {
        await saveBaseline({ criteria });
    };

    return (
        <div className="space-y-6">
            <div className="space-y-1.5">
                <h3 className="text-muted-foreground/80 text-[12px] font-semibold tracking-wider uppercase">
                    Rubric Governance
                </h3>
                <p className="text-foreground text-[14px] font-semibold">
                    Global Baseline Essay Rubric Definition
                </p>
                <p className="text-muted-foreground text-xs font-medium">
                    Configure the baseline grading rubric that exams inherit by default. Criteria
                    count is limited to 1..10, and total weight must sum to exactly 100%.
                </p>
            </div>

            <EssayRubricEditor
                initialCriteria={rubric.definition.criteria}
                onSave={handleSave}
                isSaving={isSaving}
                isSupport={true}
                canOverride={rubric.canOverride ?? true}
            />
        </div>
    );
}
