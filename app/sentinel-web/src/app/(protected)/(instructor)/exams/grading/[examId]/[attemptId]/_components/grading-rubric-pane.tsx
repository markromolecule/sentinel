import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    Badge,
    Button,
    Slider,
    Label,
    Textarea,
} from '@sentinel/ui';
import { RotateCcw } from 'lucide-react';
import { calculateEssayWeightedScore, LEGACY_ESSAY_RUBRIC } from '@sentinel/shared';
import type { GradingRubricPaneProps } from './_types';

/**
 * Displays the criteria scoring sliders for the standardized or custom essay rubric
 * alongside the overall feedback form.
 */
function GradingRubricPane({
    activeQuestion,
    activeEval,
    onScoreChange,
    overallFeedback,
    onOverallFeedbackChange,
    rubric,
    onRecalculateRubric,
}: GradingRubricPaneProps) {
    const effectiveRubric = rubric?.definition ?? LEGACY_ESSAY_RUBRIC;
    const versionLabel = rubric
        ? `${rubric.source === 'EXAM_OVERRIDE' ? 'Exam Override' : rubric.source} (v${rubric.versionNumber})`
        : 'Legacy Rubric';

    return (
        <div className="space-y-6 lg:col-span-6">
            {activeQuestion && activeEval && (
                <Card className="shadow-md">
                    <CardHeader className="bg-muted/10 border-b p-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <CardTitle className="text-base font-bold">
                                    Rubric Evaluation Sliders
                                </CardTitle>
                                <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
                                        Rubric:
                                    </span>
                                    <Badge
                                        variant="outline"
                                        className="px-1.5 py-0 text-[10px] font-semibold uppercase"
                                    >
                                        {versionLabel}
                                    </Badge>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {onRecalculateRubric && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={onRecalculateRubric}
                                        className="h-8 gap-1.5 text-xs font-medium"
                                        title="Recalculate scores using active rubric heuristic"
                                    >
                                        <RotateCcw className="h-3.5 w-3.5" />
                                        <span>Re-calculate with Rubric</span>
                                    </Button>
                                )}
                                <div className="text-right">
                                    <div className="text-muted-foreground text-xs font-medium">
                                        Weighted Score
                                    </div>
                                    <div className="text-primary text-lg font-bold">
                                        {calculateEssayWeightedScore(
                                            activeEval.scores,
                                            activeQuestion.points,
                                            effectiveRubric,
                                        ).toFixed(2)}{' '}
                                        / {activeQuestion.points} pts
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6 p-5">
                        {effectiveRubric.criteria.map((criterion) => {
                            const score = activeEval.scores[criterion.key] ?? 4;
                            return (
                                <div
                                    key={criterion.key}
                                    className="space-y-3 border-b pb-2 last:border-b-0 last:pb-0"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <div className="flex items-center gap-2">
                                                <Label className="text-foreground text-sm font-semibold">
                                                    {criterion.name}
                                                </Label>
                                                <span className="text-muted-foreground text-[11px] font-semibold">
                                                    ({Math.round(criterion.weight * 100)}%)
                                                </span>
                                            </div>
                                            <p className="text-muted-foreground text-xs leading-snug">
                                                {criterion.description}
                                            </p>
                                        </div>
                                        <Badge className="w-16 shrink-0 justify-center px-2 py-0.5 text-center font-mono text-sm">
                                            Score: {score}
                                        </Badge>
                                    </div>
                                    <div className="px-1">
                                        <Slider
                                            value={[score]}
                                            onValueChange={(val) =>
                                                onScoreChange(
                                                    activeQuestion.id,
                                                    criterion.key,
                                                    val[0],
                                                )
                                            }
                                            min={0}
                                            max={4}
                                            step={1}
                                        />
                                    </div>
                                    <p className="text-muted-foreground bg-muted/40 border-border/40 rounded border p-2 text-[11px] leading-normal italic">
                                        <span className="text-foreground mb-0.5 block font-bold not-italic">
                                            Level {score} Description:
                                        </span>
                                        {(criterion.levels as Record<string, string>)[score] || ''}
                                    </p>
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>
            )}

            {/* Overall Feedback Card */}
            <Card className="shadow-sm">
                <CardHeader className="border-b p-4">
                    <CardTitle className="text-muted-foreground text-sm font-bold tracking-wider uppercase">
                        Overall Exam Feedback
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                    <Textarea
                        placeholder="Enter final comments and feedback for the entire exam attempt..."
                        className="min-h-[100px]"
                        value={overallFeedback}
                        onChange={(e) => onOverallFeedbackChange(e.target.value)}
                    />
                </CardContent>
            </Card>
        </div>
    );
}

export { GradingRubricPane };
