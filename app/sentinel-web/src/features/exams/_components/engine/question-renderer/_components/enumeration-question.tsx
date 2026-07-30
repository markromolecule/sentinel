import { Input } from '@sentinel/ui';
import type { ExamQuestionRendererProps } from '../../types';

export function EnumerationQuestion({
    question,
    value,
    onChange,
    showCorrectAnswer,
}: ExamQuestionRendererProps) {
    const blanks = question.content.acceptedAnswers ?? question.content.blanks ?? ['', '', ''];
    const values: string[] = Array.isArray(value) ? value.map((item) => String(item ?? '')) : blanks.map(() => '');

    const updateItem = (index: number, nextValue: string) => {
        const nextValues = [...values];
        nextValues[index] = nextValue;
        onChange(nextValues);
    };

    return (
        <div className="grid gap-3">
            {blanks.map((_, index) => {
                const inputId = `enum-input-${question.id}-${index}`;
                return (
                    <div key={`${question.id}:enum:${index}`} className="space-y-2">
                        <div className="flex items-center gap-3">
                            <label
                                htmlFor={inputId}
                                className="text-muted-foreground bg-muted/60 flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center text-sm font-semibold"
                            >
                                <span className="sr-only">{`${question.content.prompt} - Item `}</span>
                                <span>{index + 1}</span>
                            </label>
                            <Input
                                id={inputId}
                                value={values[index] ?? ''}
                                onChange={(event) => updateItem(index, event.target.value)}
                                placeholder={`Item ${index + 1}`}
                                className="h-12 rounded-md"
                            />
                        </div>
                        {showCorrectAnswer && blanks[index] ? (
                            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                                <span className="font-semibold">Accepted answer:</span>{' '}
                                {blanks[index]}
                            </div>
                        ) : null}
                    </div>
                );
            })}
        </div>
    );
}
