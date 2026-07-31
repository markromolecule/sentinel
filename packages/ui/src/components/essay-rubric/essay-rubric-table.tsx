'use client';

import React from 'react';
import type { EssayRubricCriterion } from '@sentinel/shared';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';

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
    return (
        <Card className="border border-slate-200/80 shadow-sm dark:border-slate-800/80">
            <CardHeader className="bg-slate-50/50 pb-4 dark:bg-slate-900/30">
                <CardTitle className="text-xl font-semibold text-slate-900 dark:text-slate-50">
                    {title}
                </CardTitle>
                {description && (
                    <CardDescription className="text-sm text-slate-500 dark:text-slate-400">
                        {description}
                    </CardDescription>
                )}
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-b border-slate-100 bg-slate-50/30 hover:bg-slate-50/30 dark:border-slate-800/50 dark:bg-slate-900/10">
                                <TableHead className="w-[200px] font-medium text-slate-600 dark:text-slate-400">
                                    Criterion
                                </TableHead>
                                <TableHead className="w-[100px] text-center font-medium text-slate-600 dark:text-slate-400">
                                    Weight
                                </TableHead>
                                <TableHead className="font-medium text-slate-600 dark:text-slate-400">
                                    Description & Scoring Levels
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {criteria.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={3}
                                        className="h-24 text-center text-slate-500 dark:text-slate-400"
                                    >
                                        No criteria defined for this rubric.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                criteria.map((criterion) => (
                                    <TableRow
                                        key={criterion.key}
                                        className="border-b border-slate-100/80 hover:bg-slate-50/10 dark:border-slate-800/80"
                                    >
                                        <TableCell className="align-top font-semibold text-slate-800 dark:text-slate-200">
                                            {criterion.name}
                                        </TableCell>
                                        <TableCell className="text-center align-top">
                                            <Badge
                                                variant="secondary"
                                                className="bg-slate-100 text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300"
                                            >
                                                {Math.round(criterion.weight * 100)}%
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="space-y-4 py-4 align-top">
                                            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                                                {criterion.description}
                                            </p>
                                            <div className="grid gap-2 border-t border-slate-100/50 pt-3 dark:border-slate-800/30">
                                                <h4 className="text-xs font-semibold tracking-wider text-slate-400 uppercase dark:text-slate-500">
                                                    Performance Levels
                                                </h4>
                                                <div className="grid gap-2 sm:grid-cols-5">
                                                    {[4, 3, 2, 1, 0].map((score) => {
                                                        const levelDesc = criterion.levels[score];
                                                        if (!levelDesc) return null;
                                                        return (
                                                            <div
                                                                key={score}
                                                                className="rounded-lg border border-slate-100/50 bg-slate-50/40 p-2.5 dark:border-slate-800/50 dark:bg-slate-900/20"
                                                            >
                                                                <div className="mb-1 flex items-center gap-1.5">
                                                                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                                                        {score}
                                                                    </span>
                                                                    <span className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                                                                        {score === 4
                                                                            ? 'Excellent'
                                                                            : score === 3
                                                                              ? 'Good'
                                                                              : score === 2
                                                                                ? 'Average'
                                                                                : score === 1
                                                                                  ? 'Poor'
                                                                                  : 'Zero'}
                                                                    </span>
                                                                </div>
                                                                <p className="line-clamp-4 text-[11px] leading-normal text-slate-500 transition-all duration-200 hover:line-clamp-none dark:text-slate-400">
                                                                    {levelDesc}
                                                                </p>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
