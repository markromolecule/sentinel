import { CircleOff, Check } from 'lucide-react';
import { cn } from '@sentinel/ui';
import type { ExamQuestionRendererProps } from '../../types';

export function MultipleChoiceQuestion({
    question,
    value,
    onChange,
    showCorrectAnswer,
    crossOutEnabled = false,
    crossedOutOptions = [],
    onToggleOptionCrossOut,
}: ExamQuestionRendererProps) {
    const options = question.content.options ?? [];
    const optionTokens = question.content.optionTokens ?? [];

    return (
        <fieldset className="m-0 grid gap-3 border-0 p-0">
            <legend className="sr-only">{question.content.prompt}</legend>
            {options.map((option, index) => {
                const optionValue = optionTokens[index] ?? index;
                const isSelected = value === optionValue || value === index;
                const isCorrect =
                    showCorrectAnswer &&
                    (question.content.correctAnswer === index ||
                        (typeof question.content.correctAnswer === 'string' &&
                            option === question.content.correctAnswer));
                const isCrossedOut = crossedOutOptions.includes(index);
                const optionId = `option-${question.id}-${index}`;

                return (
                    <div
                        key={`${question.id}:${index}`}
                        className={cn(
                            'grid gap-2',
                            crossOutEnabled ? 'md:grid-cols-[minmax(0,1fr)_auto]' : 'grid-cols-1',
                        )}
                    >
                        <div className="relative flex">
                            <input
                                type="radio"
                                id={optionId}
                                name={question.id}
                                checked={isSelected}
                                disabled={isCrossedOut}
                                onChange={() => onChange(optionValue)}
                                className="sr-only"
                            />
                            <label
                                htmlFor={optionId}
                                className={cn(
                                    'focus-within:ring-primary flex min-h-11 w-full cursor-pointer items-center justify-between rounded-md border px-4 py-4 text-left transition select-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:outline-hidden',
                                    isSelected
                                        ? 'border-primary/40 bg-primary/5'
                                        : 'border-border/60 bg-background hover:border-primary/20 hover:bg-muted/20',
                                    isCrossedOut
                                        ? 'text-muted-foreground cursor-not-allowed border-dashed opacity-60'
                                        : '',
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <span
                                        className={cn(
                                            'flex min-w-10 items-center justify-center text-sm font-semibold',
                                            isSelected
                                                ? 'text-foreground'
                                                : 'text-muted-foreground',
                                        )}
                                    >
                                        {String.fromCharCode(65 + index)}.
                                    </span>
                                    <span
                                        className={cn(
                                            'text-sm leading-6 font-medium',
                                            isCrossedOut ? 'line-through' : '',
                                        )}
                                    >
                                        {option}
                                    </span>
                                </div>

                                {isCorrect ? <Check className="h-4 w-4 text-emerald-600" /> : null}
                            </label>
                        </div>

                        {crossOutEnabled ? (
                            <button
                                type="button"
                                onClick={() => onToggleOptionCrossOut?.(index)}
                                className={cn(
                                    'border-border/60 text-muted-foreground hover:text-foreground bg-background flex h-full min-h-14 items-center justify-center rounded-md border px-4 transition',
                                    isCrossedOut
                                        ? 'border-amber-300 bg-amber-50 text-amber-700'
                                        : 'hover:bg-muted/20',
                                )}
                                aria-pressed={isCrossedOut}
                                aria-label={
                                    isCrossedOut
                                        ? `Restore option ${String.fromCharCode(65 + index)}`
                                        : `Cross out option ${String.fromCharCode(65 + index)}`
                                }
                            >
                                <CircleOff className="h-4 w-4" />
                            </button>
                        ) : null}
                    </div>
                );
            })}
        </fieldset>
    );
}
