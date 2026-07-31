import type { GradingQuestionType, AttemptEssayRubricSnapshot } from '@sentinel/shared';
import {
    Badge,
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    Input,
    Label,
    Textarea,
} from '@sentinel/ui';
import type { AttemptReportOverrideDrafts } from '../attempt-report-utils';
import {
    formatAnswerValue,
    formatCorrectAnswer,
    getQuestionPassage,
} from '../attempt-report-utils';

type AttemptReportQuestionCardProps = {
    report: {
        questionId: string;
        questionType: string;
        prompt: string;
        answer: unknown;
        correctAnswer: unknown;
        isCorrect: boolean | null;
        awardedScore: number | null;
        maxScore: number;
        evaluation: {
            scores?: Record<string, unknown> | null;
        } | null;
        question?: GradingQuestionType;
    };
    index: number;
    editable: boolean;
    overrideDraft?: AttemptReportOverrideDrafts[string];
    onOverrideChange: (questionId: string, field: 'awardedScore' | 'reason', value: string) => void;
    rubric?: AttemptEssayRubricSnapshot;
};

/**
 * Humanizes a criterion key or returns its configured rubric name when available.
 */
function getCriterionLabel(key: string, rubric?: AttemptEssayRubricSnapshot): string {
    const criterion = rubric?.definition.criteria.find((c) => c.key === key);
    if (criterion) {
        return criterion.name;
    }
    const humanized = key
        .replace(/([A-Z])/g, ' $1')
        .replace(/_/g, ' ')
        .trim();
    return humanized.charAt(0).toUpperCase() + humanized.slice(1);
}

export function AttemptReportQuestionCard({
    report,
    index,
    editable,
    overrideDraft,
    onOverrideChange,
    rubric,
}: AttemptReportQuestionCardProps) {
    const renderedPassage = getQuestionPassage(report.question);

    return (
        <Card>
            <CardHeader className="space-y-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                        <p className="text-muted-foreground text-xs font-semibold tracking-[0.2em] uppercase">
                            Question {index + 1}
                        </p>
                        <CardTitle className="mt-2 text-lg">
                            {report.question?.content.prompt ?? report.prompt}
                        </CardTitle>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">{report.questionType}</Badge>
                        <Badge variant={report.isCorrect ? 'default' : 'secondary'}>
                            {report.awardedScore ?? 0} / {report.maxScore} pts
                        </Badge>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-5">
                {renderedPassage ? (
                    <AttemptReportPassage
                        question={report.question}
                        renderedPassage={renderedPassage}
                    />
                ) : null}

                <div className="grid gap-4 lg:grid-cols-2">
                    <div className="space-y-2">
                        <p className="text-muted-foreground text-xs font-semibold uppercase">
                            Student Answer
                        </p>
                        <div className="bg-muted/30 rounded-lg border p-3 text-sm">
                            {formatAnswerValue(report.answer)}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <p className="text-muted-foreground text-xs font-semibold uppercase">
                            Correct Answer
                        </p>
                        <div className="bg-muted/30 rounded-lg border p-3 text-sm">
                            {formatCorrectAnswer(report.correctAnswer)}
                        </div>
                    </div>
                </div>

                {report.evaluation ? (
                    <AttemptReportEvaluation evaluation={report.evaluation} rubric={rubric} />
                ) : null}

                {editable ? (
                    <AttemptReportOverrideForm
                        questionId={report.questionId}
                        maxScore={report.maxScore}
                        overrideDraft={overrideDraft}
                        onOverrideChange={onOverrideChange}
                    />
                ) : null}
            </CardContent>
        </Card>
    );
}

type AttemptReportPassageProps = {
    question?: GradingQuestionType;
    renderedPassage: NonNullable<ReturnType<typeof getQuestionPassage>>;
};

function AttemptReportPassage({ question, renderedPassage }: AttemptReportPassageProps) {
    return (
        <div className="space-y-3 rounded-xl border bg-slate-50/70 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-muted-foreground text-xs font-semibold tracking-[0.18em] uppercase">
                    Passage
                </p>
                <div className="text-muted-foreground flex flex-wrap gap-3 text-xs">
                    <span>{question?.sourceFileName ?? 'No linked document'}</span>
                    <span>
                        {question?.sourcePageNumber !== null &&
                            question?.sourcePageNumber !== undefined
                            ? `Referenced page ${question.sourcePageNumber}`
                            : 'No page reference'}
                    </span>
                </div>
            </div>
            <div
                className="text-sm leading-7 sm:text-[15px] [&_img]:max-h-64 [&_img]:w-auto [&_img]:rounded-md [&_img]:border"
                dangerouslySetInnerHTML={{
                    __html: renderedPassage.html,
                }}
            />
        </div>
    );
}

type AttemptReportEvaluationProps = {
    evaluation: {
        scores?: Record<string, unknown> | null;
    };
    rubric?: AttemptEssayRubricSnapshot;
};

function AttemptReportEvaluation({ evaluation, rubric }: AttemptReportEvaluationProps) {
    return (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {Object.entries(evaluation.scores ?? {}).map(([criterion, value]) => (
                <div key={criterion} className="rounded-lg border bg-white p-3 text-sm">
                    <p className="text-muted-foreground text-xs uppercase">
                        {getCriterionLabel(criterion, rubric)}
                    </p>
                    <p className="mt-2 text-lg font-semibold">{formatAnswerValue(value)}</p>
                </div>
            ))}
        </div>
    );
}

type AttemptReportOverrideFormProps = {
    questionId: string;
    maxScore: number;
    overrideDraft?: AttemptReportOverrideDrafts[string];
    onOverrideChange: (questionId: string, field: 'awardedScore' | 'reason', value: string) => void;
};

function AttemptReportOverrideForm({
    questionId,
    maxScore,
    overrideDraft,
    onOverrideChange,
}: AttemptReportOverrideFormProps) {
    return (
        <div className="grid gap-4 rounded-xl border border-dashed p-4 lg:grid-cols-[160px_minmax(0,1fr)]">
            <div className="space-y-2">
                <Label htmlFor={`override-score-${questionId}`}>Override Score</Label>
                <Input
                    id={`override-score-${questionId}`}
                    type="number"
                    min={0}
                    max={maxScore}
                    step="0.1"
                    value={overrideDraft?.awardedScore ?? ''}
                    onChange={(event) =>
                        onOverrideChange(questionId, 'awardedScore', event.target.value)
                    }
                    placeholder={String(maxScore)}
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor={`override-reason-${questionId}`}>Override Reason</Label>
                <Textarea
                    id={`override-reason-${questionId}`}
                    value={overrideDraft?.reason ?? ''}
                    onChange={(event) => onOverrideChange(questionId, 'reason', event.target.value)}
                    placeholder="Explain why this score was adjusted."
                />
            </div>
        </div>
    );
}
