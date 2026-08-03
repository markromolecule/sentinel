'use client';

import { ScrollArea } from '@sentinel/ui';
import { cn } from '@sentinel/ui';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface PreviewRow {
    code: string;
    title: string;
    sourceLabel: string;
}

interface BulkUploadPreviewProps {
    rows: PreviewRow[];
    errors: string[];
    emptyMessage: string;
}

export function BulkUploadPreview({ rows, errors, emptyMessage }: BulkUploadPreviewProps) {
    if (rows.length === 0 && errors.length === 0) {
        return (
            <div className="bg-muted/10 animate-in fade-in flex min-h-[300px] flex-1 flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center duration-300">
                <div className="bg-muted mb-4 flex h-12 w-12 items-center justify-center rounded-full">
                    <AlertCircle className="text-muted-foreground h-6 w-6" />
                </div>
                <p className="text-muted-foreground mx-auto max-w-[200px] text-sm leading-relaxed">
                    {emptyMessage}
                </p>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in slide-in-from-right-2 flex flex-col gap-4 duration-300">
            <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 p-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm font-medium text-emerald-700">
                        {rows.length} Valid Row{rows.length === 1 ? '' : 's'}
                    </span>
                </div>
                <div
                    className={cn(
                        'flex items-center gap-2 rounded-lg border p-3',
                        errors.length > 0
                            ? 'border-amber-100 bg-amber-50'
                            : 'border-border bg-muted',
                    )}
                >
                    <AlertCircle
                        className={cn(
                            'h-4 w-4',
                            errors.length > 0 ? 'text-amber-600' : 'text-muted-foreground',
                        )}
                    />
                    <span
                        className={cn(
                            'text-sm font-medium',
                            errors.length > 0 ? 'text-amber-700' : 'text-muted-foreground',
                        )}
                    >
                        {errors.length} Issue{errors.length === 1 ? '' : 's'}
                    </span>
                </div>
            </div>

            {errors.length > 0 && (
                <ScrollArea className="max-h-[120px] rounded-md border border-amber-100 bg-amber-50/40 p-3">
                    <ul className="space-y-1">
                        {errors.map((error, index) => (
                            <li
                                key={`${error}-${index}`}
                                className="flex items-start gap-2 text-xs text-amber-700"
                            >
                                <span className="mt-0.5">•</span>
                                <span>{error}</span>
                            </li>
                        ))}
                    </ul>
                </ScrollArea>
            )}

            <div className="min-h-0 flex-1 overflow-hidden rounded-lg border">
                <div className="bg-muted border-b px-4 py-2">
                    <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                        Preview
                    </p>
                </div>

                {rows.length === 0 ? (
                    <div className="text-muted-foreground flex h-full min-h-[180px] items-center justify-center px-6 text-center text-sm">
                        No subjects ready to preview.
                    </div>
                ) : (
                    <ScrollArea className="h-[260px]">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-background sticky top-0 z-10 border-b">
                                <tr>
                                    <th className="bg-muted/50 px-4 py-2 font-medium">Code</th>
                                    <th className="bg-muted/50 px-4 py-2 font-medium">Title</th>
                                    <th className="bg-muted/50 px-4 py-2 font-medium">Source</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {rows.map((row) => (
                                    <tr
                                        key={`${row.sourceLabel}-${row.code}`}
                                        className="hover:bg-muted/50"
                                    >
                                        <td className="px-4 py-2 font-mono font-medium">
                                            {row.code}
                                        </td>
                                        <td className="px-4 py-2">{row.title}</td>
                                        <td className="text-muted-foreground px-4 py-2">
                                            {row.sourceLabel}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </ScrollArea>
                )}
            </div>
        </div>
    );
}
