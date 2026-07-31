'use client';

import { memo } from 'react';
import { Badge, Checkbox, cn } from '@sentinel/ui';
import { ChevronRight } from 'lucide-react';
import type { QuestionRecord } from '@sentinel/services';
import { getQuestionPrompt } from '../utils';

interface QuestionRowProps {
    question: QuestionRecord;
    selected: boolean;
    isAlreadyAdded?: boolean;
    onToggle: () => void;
    disabled?: boolean;
}

export const QuestionRow = memo(function QuestionRow({
    question,
    selected,
    isAlreadyAdded = false,
    onToggle,
    disabled = false,
}: QuestionRowProps) {
    const isInteractionDisabled = isAlreadyAdded || disabled;

    return (
        <div
            className={cn(
                'group flex items-start gap-3 rounded-lg border p-3 transition-all',
                selected
                    ? 'border-primary/20 bg-primary/[0.03]'
                    : 'bg-background hover:border-border hover:bg-muted/20',
                isAlreadyAdded && 'cursor-default',
                disabled &&
                    'hover:bg-background cursor-not-allowed opacity-40 hover:border-zinc-200',
                !isInteractionDisabled && 'cursor-pointer',
            )}
            onClick={() => {
                if (!isInteractionDisabled) {
                    onToggle();
                }
            }}
        >
            <div className="pt-0.5">
                <Checkbox
                    checked={selected}
                    disabled={disabled}
                    onCheckedChange={() => undefined}
                    className="data-[state=checked]:bg-primary pointer-events-none h-4 w-4 rounded-md"
                />
            </div>
            <div className="flex-1 space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge
                            variant="secondary"
                            className="bg-muted text-muted-foreground border-none px-1.5 py-0 text-[10px] font-medium tracking-normal"
                        >
                            {question.type.replaceAll('_', ' ')}
                        </Badge>
                        {isAlreadyAdded ? (
                            <Badge
                                variant="secondary"
                                className="bg-primary/10 text-primary border-none px-1.5 py-0 text-[10px] font-medium tracking-normal"
                            >
                                Already in exam
                            </Badge>
                        ) : null}
                    </div>
                    <span className="text-muted-foreground text-[10px] font-medium">
                        {question.points} Pts
                    </span>
                </div>
                <p className="text-foreground pr-6 text-sm leading-6 font-medium">
                    {getQuestionPrompt(question)}
                </p>
                <p className="text-muted-foreground text-[11px]">
                    {question.sourceOrigin === 'AI_PDF'
                        ? `${question.sourceFileName} • Page ${question.sourcePageNumber}`
                        : 'Manual entry'}
                </p>
                {question.tags && question.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-1 pt-0.5">
                        {question.tags.map((tag) => (
                            <span
                                key={tag}
                                className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[10px]"
                            >
                                #{tag}
                            </span>
                        ))}
                    </div>
                ) : null}
            </div>
            <div className="self-center">
                <ChevronRight
                    className={cn(
                        'h-4 w-4 -translate-x-2 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100',
                        selected
                            ? 'text-primary translate-x-0 opacity-100'
                            : 'text-muted-foreground',
                    )}
                />
            </div>
        </div>
    );
});
