'use client';
import { Badge, Button } from '@sentinel/ui';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type ExamAttemptRuntimeFooterProps = {
    progress: number;
    isFlagged: boolean;
    onMove: (direction: 'previous' | 'next') => void;
    currentQuestionIndex: number;
    totalQuestions: number;
    isLastQuestion: boolean;
    onSubmit: () => void;
    isSubmitting?: boolean;
};

export function ExamAttemptRuntimeFooter({
    progress,
    isFlagged,
    onMove,
    currentQuestionIndex,
    totalQuestions,
    isLastQuestion,
    onSubmit,
    isSubmitting,
}: ExamAttemptRuntimeFooterProps) {
    return (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="rounded-md px-3 py-1">
                    {progress}% complete
                </Badge>
                {isFlagged ? (
                    <Badge
                        variant="outline"
                        className="rounded-md border-amber-300 bg-amber-50 px-3 py-1 text-amber-700"
                    >
                        Flagged for review
                    </Badge>
                ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2 min-[380px]:gap-3 lg:flex-nowrap lg:justify-end">
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => onMove('previous')}
                    disabled={totalQuestions === 0 || currentQuestionIndex === 0}
                    className="rounded-md"
                >
                    <ChevronLeft className="h-4 w-4 min-[380px]:mr-2" />
                    <span className="hidden min-[380px]:inline">Previous</span>
                </Button>
                <div className="border-border/60 bg-muted/20 border px-3 py-2 text-center text-xs font-medium min-[380px]:px-4 min-[380px]:text-sm">
                    Question {totalQuestions ? currentQuestionIndex + 1 : 0} of {totalQuestions}
                </div>
                <Button
                    type="button"
                    onClick={isLastQuestion ? onSubmit : () => onMove('next')}
                    disabled={totalQuestions === 0 || isSubmitting}
                    className="rounded-md"
                >
                    {isLastQuestion ? (
                        isSubmitting ? 'Preparing...' : 'Turn In'
                    ) : (
                        <span className="hidden min-[380px]:inline">Next</span>
                    )}
                    <ChevronRight className={`h-4 w-4 ${!isLastQuestion ? 'min-[380px]:ml-2' : ''}`} />
                </Button>
            </div>
        </div>
    );
}
