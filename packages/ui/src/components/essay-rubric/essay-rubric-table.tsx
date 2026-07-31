'use client';

import React from 'react';
import type { EssayRubricCriterion } from '@sentinel/shared';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';

const PERFORMANCE_LEVELS = [
    { score: 4, label: 'Excellent' },
    { score: 3, label: 'Good' },
    { score: 2, label: 'Average' },
    { score: 1, label: 'Poor' },
    { score: 0, label: 'Zero' },
];

export interface EssayRubricTableProps {
    /**
     * The array of rubric criteria to display.
     */
    criteria: EssayRubricCriterion[];
    /**
     * Optional header title for the table view.
     * @default "Essay Grading Rubric"
     */
    title?: string;
    /**
     * Optional header description.
     */
    description?: string;
}

/**
 * EssayRubricTable displays a read-only view of the grading rubric criteria,
 * weights, and descriptions. It presents the performance level guidelines
 * in a clear, scannable format.
 *
 * @param props - Component props including criteria list and optional headers.
 */
export function EssayRubricTable({
    criteria,
    title = 'Essay Grading Rubric',
    description,
}: EssayRubricTableProps) {
    const totalWeightPercentage = Math.round(
        criteria.reduce((sum, criterion) => sum + criterion.weight, 0) * 100,
    );

    return (
        <Card className="gap-0 overflow-hidden border border-slate-200/80 py-0 shadow-sm dark:border-slate-800/80">
            <CardHeader className="gap-3 bg-slate-50/50 px-5 py-4 dark:bg-slate-900/30">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                        <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                            {title}
                        </CardTitle>
                        {description && (
                            <CardDescription className="text-sm text-slate-500 dark:text-slate-400">
                                {description}
                            </CardDescription>
                        )}
                    </div>
                    <Badge className="bg-primary text-primary-foreground hover:bg-primary w-fit rounded-md px-3 py-1">
                        Total {totalWeightPercentage}%
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4">
                {criteria.length === 0 ? (
                    <div className="flex min-h-32 items-center justify-center rounded-lg border border-dashed border-slate-200 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
                        No criteria defined for this rubric.
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {criteria.map((criterion) => (
                            <section
                                key={criterion.key}
                                className="bg-background rounded-lg border border-slate-200/80 p-3 dark:border-slate-800/80"
                            >
                                <div className="flex flex-col gap-2 border-b border-slate-100 pb-3 sm:flex-row sm:items-start sm:justify-between dark:border-slate-800">
                                    <div className="min-w-0 space-y-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                                                {criterion.name}
                                            </h3>
                                            <Badge
                                                variant="secondary"
                                                className="bg-primary/10 text-primary hover:bg-primary/10"
                                            >
                                                {Math.round(criterion.weight * 100)}%
                                            </Badge>
                                        </div>
                                        <p className="text-sm leading-normal break-words text-slate-600 dark:text-slate-300">
                                            {criterion.description}
                                        </p>
                                    </div>
                                    <p className="font-mono text-xs break-all text-slate-400 sm:text-right">
                                        {criterion.key}
                                    </p>
                                </div>

                                <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                                    {PERFORMANCE_LEVELS.map((level) => (
                                        <div
                                            key={level.score}
                                            className="rounded-md border border-slate-100 bg-slate-50/70 p-2.5 dark:border-slate-800 dark:bg-slate-900/30"
                                        >
                                            <div className="mb-2 flex items-center gap-2">
                                                <span className="bg-primary/10 text-primary flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold">
                                                    {level.score}
                                                </span>
                                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                                    {level.label}
                                                </span>
                                            </div>
                                            <p className="text-sm leading-normal break-words text-slate-600 dark:text-slate-300">
                                                {criterion.levels[level.score] || (
                                                    <span className="text-slate-400">Not set</span>
                                                )}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
