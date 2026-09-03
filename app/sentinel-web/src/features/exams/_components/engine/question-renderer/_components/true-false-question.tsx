import { Check } from 'lucide-react';
import { Button, cn } from '@sentinel/ui';
import type { ExamQuestionRendererProps } from '../../types';

export function TrueFalseQuestion({
    value,
    onChange,
    showCorrectAnswer,
    question,
}: ExamQuestionRendererProps) {
    const correctBoolean =
        typeof question.content.correctAnswer === 'boolean'
            ? question.content.correctAnswer
            : question.content.correctBoolean;

    return (
        <fieldset className="m-0 grid gap-3 border-0 p-0 sm:grid-cols-2">
            <legend className="sr-only">{question.content.prompt}</legend>
            {[true, false].map((option) => {
                const resolvedValue =
                    typeof value === 'boolean'
                        ? value
                        : typeof value === 'string'
                          ? value.trim().toLowerCase() === 'true'
                              ? true
                              : value.trim().toLowerCase() === 'false'
                                ? false
                                : null
                          : null;
                const isSelected = resolvedValue === option;
                const isCorrect = showCorrectAnswer && correctBoolean === option;
                const optionId = `option-${question.id}-${option ? 'true' : 'false'}`;

                return (
                    <div key={`${question.id}-${option ? 'true' : 'false'}`} className="relative flex">
                        <input
                            type="radio"
                            id={optionId}
                            name={question.id}
                            checked={isSelected}
                            onChange={() => onChange(option)}
                            className="sr-only"
                        />
                        <label
                            htmlFor={optionId}
                            className={cn(
                                'focus-within:ring-primary flex min-h-14 w-full cursor-pointer items-center justify-between rounded-md border px-4 py-4 text-left text-sm font-semibold select-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:outline-hidden',
                                isCorrect
                                    ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                                    : '',
                                isSelected
                                    ? 'border-primary/40 bg-primary/5 text-foreground'
                                    : 'border-border/60 bg-background hover:bg-muted/20',
                            )}
                        >
                            <span>{option ? 'True' : 'False'}</span>
                            {isCorrect ? <Check className="h-4 w-4 text-emerald-600" /> : null}
                        </label>
                    </div>
                );
            })}
        </fieldset>
    );
}
