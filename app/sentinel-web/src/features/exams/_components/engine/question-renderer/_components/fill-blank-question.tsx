import { Input } from '@sentinel/ui';
import type { ExamQuestionRendererProps } from '../../types';

export function FillBlankQuestion({
    question,
    value,
    onChange,
    showCorrectAnswer,
}: ExamQuestionRendererProps) {
    const blanks = question.content.blanks ?? [];
    const values: string[] = Array.isArray(value)
        ? value.map((item) => String(item ?? ''))
        : blanks.map(() => '');

    const updateBlank = (index: number, nextValue: string) => {
        const nextValues = [...values];
        nextValues[index] = nextValue;
        onChange(nextValues);
    };

    return (
        <div className="grid gap-3">
            {blanks.length ? (
                blanks.map((blank, index) => (
                    <label key={`${question.id}:blank:${index}`} className="space-y-2">
                        <span className="text-muted-foreground text-xs font-semibold tracking-[0.16em] uppercase">
                            Blank {index + 1}
                        </span>
                        <Input
                            value={values[index] ?? ''}
                            onChange={(event) => updateBlank(index, event.target.value)}
                            placeholder={
                                showCorrectAnswer
                                    ? blank || `Response ${index + 1}`
                                    : `Response ${index + 1}`
                            }
                            className="h-12 rounded-md"
                        />
                        {showCorrectAnswer && blank ? (
                            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                                <span className="font-semibold">Answer key:</span> {blank}
                            </div>
                        ) : null}
                    </label>
                ))
            ) : (
                <div className="space-y-2">
                    <Input
                        value={values[0] ?? ''}
                        onChange={(event) => updateBlank(0, event.target.value)}
                        placeholder={
                            showCorrectAnswer
                                ? blanks[0] || 'Type the missing value...'
                                : 'Type the missing value...'
                        }
                        className="h-12 rounded-md"
                    />
                    {showCorrectAnswer && blanks[0] ? (
                        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                            <span className="font-semibold">Answer key:</span> {blanks[0]}
                        </div>
                    ) : null}
                </div>
            )}
        </div>
    );
}
