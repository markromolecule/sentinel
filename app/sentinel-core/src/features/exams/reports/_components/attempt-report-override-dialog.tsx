import { useMemo } from 'react';
import {
    Badge,
    Button,
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    Input,
    Label,
    Textarea,
} from '@sentinel/ui';
import { formatAnswerValue, type AttemptReportOverrideDrafts } from '../attempt-report-utils';
import type { ReportCardType } from '../_types';

export type AttemptReportOverrideDialogProps = {
    selectedReport: ReportCardType | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    overrideDraft?: AttemptReportOverrideDrafts[string];
    onOverrideChange: (questionId: string, field: 'awardedScore' | 'reason', value: string) => void;
    questionIndex: number;
};

/**
 * Renders an expansive, ergonomic dialog modal for adjusting scores and adding override reasons.
 * Uses an asymmetric 2-column layout designed specifically for long-form student essay reading.
 *
 * @param props - AttemptReportOverrideDialogProps
 */
export function AttemptReportOverrideDialog({
    selectedReport,
    open,
    onOpenChange,
    overrideDraft,
    onOverrideChange,
    questionIndex,
}: AttemptReportOverrideDialogProps) {
    const formattedAnswer = selectedReport ? formatAnswerValue(selectedReport.answer) : '';
    const trimmedAnswer = formattedAnswer.trim();

    const { wordCount, charCount } = useMemo(() => {
        if (!trimmedAnswer) return { wordCount: 0, charCount: 0 };
        const words = trimmedAnswer.split(/\s+/).filter(Boolean);
        return {
            wordCount: words.length,
            charCount: trimmedAnswer.length,
        };
    }, [trimmedAnswer]);

    if (!selectedReport) {
        return null;
    }

    const prompt = selectedReport.question?.content?.prompt ?? selectedReport.prompt;

    const questionTypeLabel = (
        selectedReport.question?.type ??
        selectedReport.questionType ??
        'QUESTION'
    ).replaceAll('_', ' ');

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex max-h-[88vh] w-[92vw] max-w-5xl flex-col p-0 overflow-hidden sm:max-w-5xl">
                {/* Header */}
                <DialogHeader className="shrink-0 border-b px-6 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 pr-6">
                        <div>
                            <DialogTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                                Adjust Score
                            </DialogTitle>
                            <DialogDescription className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                Adjust score for Question {questionIndex + 1}
                            </DialogDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge
                                variant="outline"
                                className="text-[11px] font-semibold tracking-wider uppercase"
                            >
                                {questionTypeLabel}
                            </Badge>
                            <Badge variant="secondary" className="text-xs font-semibold">
                                Max: {selectedReport.maxScore} pts
                            </Badge>
                        </div>
                    </div>
                </DialogHeader>

                {/* Body - Asymmetric 2-Column Grid */}
                <div className="grid flex-1 grid-cols-1 gap-6 overflow-y-auto p-6 md:grid-cols-12">
                    {/* Left Column: Reader Panel (~62% width on desktop) */}
                    <div className="space-y-4 md:col-span-7 lg:col-span-8">
                        {/* Question Prompt */}
                        <div className="space-y-2">
                            <Label className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                                Question Prompt
                            </Label>
                            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 text-sm font-medium leading-relaxed text-slate-900 select-text dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-100">
                                {prompt}
                            </div>
                        </div>

                        {/* Student Answer */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                                    Student&apos;s Answer
                                </Label>
                                {trimmedAnswer ? (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                        {wordCount} {wordCount === 1 ? 'word' : 'words'} •{' '}
                                        {charCount} chars
                                    </span>
                                ) : null}
                            </div>

                            {trimmedAnswer ? (
                                <div
                                    className="max-h-[46vh] overflow-y-auto rounded-lg border border-slate-200 bg-slate-50/50 p-4 font-sans text-sm leading-relaxed whitespace-pre-wrap text-slate-800 select-text dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200"
                                    tabIndex={0}
                                    role="region"
                                    aria-label="Student answer text"
                                >
                                    {formattedAnswer}
                                </div>
                            ) : (
                                <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-400 dark:border-slate-800 dark:text-slate-500">
                                    <span className="italic">No answer provided by student</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Scoring & Adjustment Panel (~38% width on desktop) */}
                    <div className="space-y-5 md:col-span-5 lg:col-span-4">
                        {/* Score Overview Box */}
                        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/30">
                            <div className="text-xs font-semibold tracking-wider uppercase text-slate-500 dark:text-slate-400">
                                Current Awarded Score
                            </div>
                            <div className="mt-1.5 flex items-baseline gap-1.5">
                                <span className="text-2xl font-black text-slate-900 dark:text-slate-50">
                                    {selectedReport.awardedScore ?? 0}
                                </span>
                                <span className="text-sm font-medium text-slate-400">
                                    / {selectedReport.maxScore} pts
                                </span>
                            </div>
                        </div>

                        {/* Override Score Input */}
                        <div className="space-y-2">
                            <Label
                                htmlFor={`override-score-${selectedReport.questionId}`}
                                className="text-sm font-semibold"
                            >
                                Override Score
                            </Label>
                            <Input
                                id={`override-score-${selectedReport.questionId}`}
                                type="number"
                                min={0}
                                max={selectedReport.maxScore}
                                step="0.1"
                                value={overrideDraft?.awardedScore ?? ''}
                                onChange={(event) =>
                                    onOverrideChange(
                                        selectedReport.questionId,
                                        'awardedScore',
                                        event.target.value,
                                    )
                                }
                                placeholder={String(selectedReport.maxScore)}
                                className="h-10 text-sm font-medium"
                            />
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Allowed: 0 – {selectedReport.maxScore} pts (supports decimals)
                            </p>
                        </div>

                        {/* Override Reason Textarea */}
                        <div className="space-y-2">
                            <Label
                                htmlFor={`override-reason-${selectedReport.questionId}`}
                                className="text-sm font-semibold"
                            >
                                Override Reason
                            </Label>
                            <Textarea
                                id={`override-reason-${selectedReport.questionId}`}
                                className="min-h-[140px] resize-none text-sm leading-relaxed"
                                value={overrideDraft?.reason ?? ''}
                                onChange={(event) =>
                                    onOverrideChange(
                                        selectedReport.questionId,
                                        'reason',
                                        event.target.value,
                                    )
                                }
                                placeholder="Explain why this score was adjusted (e.g., student demonstrated strong conceptual reasoning)."
                            />
                        </div>
                    </div>
                </div>

                {/* Sticky Footer */}
                <DialogFooter className="shrink-0 border-t bg-slate-50/70 px-6 py-3.5 sm:justify-end dark:bg-slate-900/40">
                    <div className="flex items-center gap-2">
                        <DialogClose asChild>
                            <Button variant="outline" size="sm">
                                Cancel
                            </Button>
                        </DialogClose>
                        <DialogClose asChild>
                            <Button
                                size="sm"
                                className="bg-[#323d8f] text-white hover:bg-[#323d8f]/90"
                            >
                                Done
                            </Button>
                        </DialogClose>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
