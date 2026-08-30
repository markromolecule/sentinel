'use client';

import * as React from 'react';
import Link from 'next/link';
import { Badge, Button, Input, Separator } from '@sentinel/ui';
import { ArrowLeft, Pencil, Save } from 'lucide-react';
import type { UseExamBuilderResult } from '@/app/(protected)/(instructor)/exams/[id]/builder/hooks/use-exam-builder/_types';

type ExamBuilderHeaderProps = Pick<
    UseExamBuilderResult,
    | 'title'
    | 'titleParam'
    | 'status'
    | 'isSaving'
    | 'isUpdatingTitle'
    | 'handleUpdateTitle'
    | 'handleSave'
>;

export function ExamBuilderHeader({
    title,
    titleParam,
    status,
    isSaving,
    isUpdatingTitle,
    handleUpdateTitle,
    handleSave,
}: ExamBuilderHeaderProps) {
    const resolvedTitle = title || titleParam;
    const [isEditingTitle, setIsEditingTitle] = React.useState(false);
    const [draftTitle, setDraftTitle] = React.useState(resolvedTitle);

    React.useEffect(() => {
        if (!isEditingTitle) {
            setDraftTitle(resolvedTitle);
        }
    }, [isEditingTitle, resolvedTitle]);

    const submitTitle = async () => {
        const trimmedTitle = draftTitle.trim();

        if (!trimmedTitle) {
            setDraftTitle(resolvedTitle);
            setIsEditingTitle(false);
            return;
        }

        const didUpdateTitle = await handleUpdateTitle(trimmedTitle);

        if (didUpdateTitle) {
            setIsEditingTitle(false);
        }
    };

    return (
        <section className="space-y-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="space-y-1">
                    {isEditingTitle ? (
                        <Input
                            value={draftTitle}
                            onChange={(event) => setDraftTitle(event.target.value)}
                            onBlur={() => void submitTitle()}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                    event.preventDefault();
                                    void submitTitle();
                                }

                                if (event.key === 'Escape') {
                                    setDraftTitle(resolvedTitle);
                                    setIsEditingTitle(false);
                                }
                            }}
                            autoFocus
                            disabled={isUpdatingTitle}
                            className="h-auto border-none bg-transparent px-0 text-2xl font-semibold tracking-tight shadow-none focus-visible:ring-0"
                            maxLength={100}
                        />
                    ) : (
                        <button
                            type="button"
                            onClick={() => setIsEditingTitle(true)}
                            className="group inline-flex items-center gap-2 text-left"
                        >
                            <h1 className="text-2xl font-semibold tracking-tight">
                                {resolvedTitle}
                            </h1>
                            <Pencil className="text-muted-foreground h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
                        </button>
                    )}
                    <p className="text-muted-foreground text-sm">
                        Build and organize questions for this exam.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={status === 'published' ? 'default' : 'secondary'}>
                        {status === 'published' ? 'Published' : 'Draft'}
                    </Badge>
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => void handleSave()}
                        disabled={isSaving}
                    >
                        <Save className="h-4 w-4" />
                        {isSaving ? 'Saving...' : 'Save Draft'}
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2" asChild>
                        <Link href="/exams">
                            <ArrowLeft className="h-4 w-4" />
                            Back to Exams
                        </Link>
                    </Button>
                </div>
            </div>
            <Separator className="mt-4" />
        </section>
    );
}
