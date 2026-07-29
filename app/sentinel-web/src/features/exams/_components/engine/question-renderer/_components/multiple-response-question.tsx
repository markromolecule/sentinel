import { CircleOff, Check } from 'lucide-react';
import { Badge, cn } from '@sentinel/ui';
import type { ExamQuestionRendererProps } from '../../types';

export function MultipleResponseQuestion({
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
    const hasOptionTokens = optionTokens.length > 0;
    const selectedTokenValues: string[] = Array.isArray(value)
        ? value.flatMap((item) => {
            if (typeof item === 'string') {
                return optionTokens.includes(item) ? [item] : [];
            }

            if (typeof item === 'number') {
                const token = optionTokens[item];
                return token ? [token] : [];
            }

            return [];
        })
        : [];
    const selectedIndexValues: number[] = Array.isArray(value)
        ? value.flatMap((item) => {
            if (typeof item === 'number') {
                return [item];
            }

            if (typeof item === 'string') {
                const optionIndex = options.indexOf(item);
                return optionIndex >= 0 ? [optionIndex] : [];
            }

            return [];
        })
        : [];
    const correctValues = Array.isArray(question.content.correctAnswer)
        ? question.content.correctAnswer
        : [];

    const isOptionCorrect = (optionIndex: number) => {
        if (!showCorrectAnswer) return false;
        const optionText = options[optionIndex];
        return correctValues.some(
            (correct) =>
                correct === optionIndex || (typeof correct === 'string' && correct === optionText),
        );
    };

    const toggleOption = (optionIndex: number) => {
        if (hasOptionTokens) {
            const optionValue = optionTokens[optionIndex];
            if (!optionValue) {
                return;
            }

            const isSelected = selectedTokenValues.includes(optionValue);

            if (isSelected) {
                onChange(selectedTokenValues.filter((item) => item !== optionValue));
                return;
            }

            onChange([...selectedTokenValues, optionValue]);
            return;
        }

        const isSelected = selectedIndexValues.includes(optionIndex);

        if (isSelected) {
            onChange(selectedIndexValues.filter((item) => item !== optionIndex));
            return;
        }

        onChange([...selectedIndexValues, optionIndex]);
    };

    return (
        <fieldset className="m-0 grid gap-3 border-0 p-0">
            <legend className="sr-only">{question.content.prompt}</legend>
            {options.map((option, index) => {
                const isSelected = hasOptionTokens
                    ? selectedTokenValues.includes(optionTokens[index] ?? '')
                    : selectedIndexValues.includes(index);
                const isCorrect = isOptionCorrect(index);
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
                                type="checkbox"
                                id={optionId}
                                name={question.id}
                                checked={isSelected}
                                disabled={isCrossedOut}
                                onChange={() => toggleOption(index)}
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
                                            'flex h-4 w-4 items-center justify-center border',
                                            isSelected
                                                ? 'border-primary bg-primary text-primary-foreground'
                                                : 'border-border/60 bg-background',
                                            isCrossedOut ? 'border-dashed' : '',
                                        )}
                                    >
                                        {isSelected ? <Check className="h-3 w-3" /> : null}
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

                                {isCorrect ? (
                                    <Badge className="rounded-md bg-emerald-500 text-white hover:bg-emerald-500">
                                        Correct
                                    </Badge>
                                ) : null}
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
