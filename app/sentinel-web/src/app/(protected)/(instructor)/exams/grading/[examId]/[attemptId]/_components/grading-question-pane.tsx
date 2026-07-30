import {
    Button,
    Card,
    CardHeader,
    CardTitle,
    Label,
    Badge,
    Textarea,
    CardContent,
} from '@sentinel/ui';
import { FileText } from 'lucide-react';
import type { GradingQuestionPaneProps } from './_types';

function formatSubmittedAnswer(value: GradingQuestionPaneProps['answers'][string]): string {
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) return value.map((item) => String(item)).join(', ');
    if (value && typeof value === 'object') {
        return Object.entries(value)
            .map(([key, entryValue]) => `${key}: ${entryValue}`)
            .join('\n');
    }

    return '';
}

/**
 * Displays the list of essay questions, prompt switcher, student response,
 * and question-specific feedback.
 */
function GradingQuestionPane({
    essayQuestions,
    activeQuestionId,
    setActiveQuestionId,
    activeQuestion,
    activeEval,
    onFeedbackChange,
    answers,
}: GradingQuestionPaneProps) {
    const submittedAnswer = activeQuestion ? formatSubmittedAnswer(answers[activeQuestion.id]) : '';

    return (
        <div className="space-y-6 lg:col-span-6">
            {/* Essay Question Switcher if multiple */}
            {essayQuestions.length > 1 && (
                <div className="flex gap-2 overflow-x-auto border-b pb-2">
                    {essayQuestions.map((q, index) => (
                        <Button
                            key={q.id}
                            variant={activeQuestionId === q.id ? 'default' : 'outline'}
                            onClick={() => setActiveQuestionId(q.id)}
                            size="sm"
                            className="shrink-0"
                        >
                            Question {index + 1}
                        </Button>
                    ))}
                </div>
            )}

            {activeQuestion && (
                <Card className="shadow-sm">
                    <CardHeader className="bg-muted/30 border-b p-4">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-muted-foreground flex items-center gap-2 text-sm font-bold tracking-wider uppercase">
                                <FileText className="h-4 w-4" /> Essay Question Prompt
                            </CardTitle>
                            <Badge variant="outline">{activeQuestion.points} Points Max</Badge>
                        </div>
                        <p className="text-foreground mt-2 leading-relaxed font-semibold">
                            {activeQuestion.content.prompt}
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-4 p-5">
                        <div>
                            <Label className="text-muted-foreground text-xs font-bold uppercase">
                                Student Response
                            </Label>
                            <div className="bg-muted/20 mt-2 max-h-[400px] overflow-y-auto rounded-xl border p-4 font-mono text-sm leading-relaxed whitespace-pre-wrap select-text">
                                {submittedAnswer || (
                                    <span className="text-muted-foreground italic">
                                        No response submitted
                                    </span>
                                )}
                            </div>
                        </div>

                        {activeEval && (
                            <div className="pt-2">
                                <Label
                                    htmlFor="question-feedback"
                                    className="text-muted-foreground text-xs font-bold uppercase"
                                >
                                    Question-Specific Feedback
                                </Label>
                                <Textarea
                                    id="question-feedback"
                                    placeholder="Provide feedback specifically for this essay question..."
                                    className="mt-2 min-h-[80px]"
                                    value={activeEval.feedback}
                                    onChange={(e) =>
                                        onFeedbackChange(activeQuestion.id, e.target.value)
                                    }
                                />
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

export { GradingQuestionPane };
