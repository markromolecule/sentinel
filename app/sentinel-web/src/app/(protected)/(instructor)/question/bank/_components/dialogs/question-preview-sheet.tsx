'use client';

import { renderPassage } from '@sentinel/shared';
import { Sheet, SheetContent, Badge, Separator } from '@sentinel/ui';
import { QuestionTableItem } from '@/app/(protected)/(instructor)/question/bank/_components/tables/columns';

// Modular Sub-components
import {
    QuestionHeader,
    QuestionMetadataSection,
    QuestionActions,
    QuestionContentRenderer,
} from '@/app/(protected)/(instructor)/question/bank/_components/dialogs/question-preview';

// Logic Hook
import { useQuestionPreview } from '@/app/(protected)/(instructor)/question/bank/_components/dialogs/question-preview/use-question-preview';

interface QuestionPreviewSheetProps {
    question: QuestionTableItem | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onEdit?: (question: QuestionTableItem) => void;
    onDuplicate?: (question: QuestionTableItem) => void;
    onDelete?: (question: QuestionTableItem) => void | Promise<void>;
}

export function QuestionPreviewSheet({
    question,
    open,
    onOpenChange,
    onEdit,
    onDuplicate,
    onDelete,
}: QuestionPreviewSheetProps) {
    const {
        timeAgo,
        difficulty,
        typeLabel,
        prompt,
        id,
        tags,
        sourceLabel,
        sourceEvidence,
        passageContent,
        passageType,
    } = useQuestionPreview(question);
    const renderedPassage = renderPassage({
        sourceEvidence,
        passageContent,
        passageType,
        fallbackToSourceEvidence: false,
    });

    if (!question) return null;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="flex h-full w-full flex-col overflow-y-hidden px-0 sm:max-w-md md:max-w-lg lg:max-w-xl">
                <div className="min-h-0 flex-1 overflow-y-auto">
                    <QuestionHeader
                        typeLabel={typeLabel}
                        tags={tags}
                        prompt={prompt}
                        timeAgo={timeAgo}
                        points={question.points}
                    />

                    <Separator className="bg-zinc-100 dark:bg-zinc-800" />

                    <div className="space-y-7 px-5 py-5 text-left sm:px-6 sm:py-6">
                        <div className="space-y-5">
                            <div className="flex items-center justify-between gap-3">
                                <h4 className="text-sm font-bold tracking-tight text-zinc-900 uppercase dark:text-zinc-100">
                                    Question Configuration
                                </h4>
                                <Badge
                                    variant="outline"
                                    className="shrink-0 text-[10px] font-medium opacity-60"
                                >
                                    ID: {id.slice(0, 8)}
                                </Badge>
                            </div>
                            <div className="rounded-2xl border border-zinc-100/50 bg-zinc-50/50 p-1 dark:border-zinc-800/50 dark:bg-zinc-900/30">
                                <QuestionContentRenderer question={question} />
                            </div>

                            {renderedPassage ? (
                                <div className="space-y-3">
                                    <h4 className="text-sm font-bold tracking-tight text-zinc-900 uppercase dark:text-zinc-100">
                                        Passage
                                    </h4>
                                    <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-5 text-sm leading-relaxed text-zinc-700 dark:border-zinc-800/50 dark:bg-zinc-900/30 dark:text-zinc-200">
                                        <div
                                            dangerouslySetInnerHTML={{
                                                __html: renderedPassage.html,
                                            }}
                                        />
                                    </div>
                                </div>
                            ) : null}
                        </div>

                        <QuestionMetadataSection
                            difficulty={difficulty}
                            points={question.points}
                            sourceLabel={sourceLabel}
                            sourceEvidence={sourceEvidence}
                        />
                    </div>
                </div>

                <QuestionActions
                    onEdit={() => {
                        if (!question) {
                            return;
                        }

                        onOpenChange(false);
                        onEdit?.(question);
                    }}
                    onDuplicate={() => {
                        if (!question) {
                            return;
                        }

                        void onDuplicate?.(question);
                    }}
                    onDelete={() => {
                        if (!question) {
                            return;
                        }

                        onOpenChange(false);
                        void onDelete?.(question);
                    }}
                />
            </SheetContent>
        </Sheet>
    );
}
