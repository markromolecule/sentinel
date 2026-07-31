'use client';

import { use } from 'react';
import { Card } from '@sentinel/ui';
import { FileText } from 'lucide-react';
import { useGradingAttempt } from './_hooks/use-grading-attempt';
import { GradingLoading } from './_components/grading-loading';
import { GradingError } from './_components/grading-error';
import { GradingHeader } from './_components/grading-header';
import { GradingScoreHighlights } from './_components/grading-score-highlights';
import { GradingQuestionPane } from './_components/grading-question-pane';
import { GradingRubricPane } from './_components/grading-rubric-pane';

interface AttemptGradingPageProps {
    params: Promise<{
        examId: string;
        attemptId: string;
    }>;
}

/**
 * Main instructor grading page entry component. Coordinates child views
 * and the useGradingAttempt business state logic hook.
 */
function AttemptGradingPage({ params }: AttemptGradingPageProps) {
    const { examId, attemptId } = use(params);
    const {
        attemptDetail,
        isLoading,
        isError,
        essayQuestions,
        activeQuestionId,
        setActiveQuestionId,
        activeQuestion,
        activeEval,
        overallFeedback,
        setOverallFeedback,
        scoreSummary,
        isSubmitting,
        handleScoreChange,
        handleFeedbackChange,
        handleSubmit,
    } = useGradingAttempt({ examId, attemptId });

    if (isLoading) {
        return <GradingLoading />;
    }

    if (isError || !attemptDetail) {
        return <GradingError examId={examId} />;
    }

    return (
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 md:p-6">
            <GradingHeader
                studentName={attemptDetail.attempt.studentName}
                studentNumber={attemptDetail.attempt.studentNumber}
                examTitle={attemptDetail.attempt.examTitle}
                subjectTitle={attemptDetail.attempt.subjectTitle}
                examId={examId}
                isSubmitting={isSubmitting}
                onSubmit={handleSubmit}
            />

            <GradingScoreHighlights
                scoreSummary={scoreSummary}
                status={attemptDetail.attempt.status}
                completedAt={attemptDetail.attempt.completedAt}
            />

            {essayQuestions.length === 0 ? (
                <Card className="border-dashed p-6 text-center">
                    <FileText className="text-muted-foreground mx-auto mb-3 h-12 w-12" />
                    <h3 className="text-lg font-semibold">No Essay Questions</h3>
                    <p className="text-muted-foreground mx-auto mt-1 max-w-sm text-sm">
                        This exam does not contain any essay-type questions requiring manual review.
                        All items are autograded.
                    </p>
                </Card>
            ) : (
                <div className="grid items-start gap-6 lg:grid-cols-12">
                    <GradingQuestionPane
                        essayQuestions={essayQuestions}
                        activeQuestionId={activeQuestionId}
                        setActiveQuestionId={setActiveQuestionId}
                        activeQuestion={activeQuestion}
                        activeEval={activeEval}
                        onFeedbackChange={handleFeedbackChange}
                        answers={attemptDetail.attempt.answers}
                    />

                    <GradingRubricPane
                        activeQuestion={activeQuestion}
                        activeEval={activeEval}
                        onScoreChange={handleScoreChange}
                        overallFeedback={overallFeedback}
                        onOverallFeedbackChange={setOverallFeedback}
                        rubric={attemptDetail?.attempt.rubric}
                    />
                </div>
            )}
        </div>
    );
}

export default AttemptGradingPage;
