import type {
    AttemptGradingDetailType,
    GradingQuestionType,
    UpdateGradingAttemptBodyType,
} from '@sentinel/shared';
import { useAttemptReport } from './_hooks/use-attempt-report';
import { AttemptReportActions } from './_components/attempt-report-actions';
import { AttemptReportSummaryCards } from './_components/attempt-report-summary-cards';
import { AttemptReportTable } from './_components/attempt-report-table';
import { AttemptReportOverrideDialog } from './_components/attempt-report-override-dialog';

export type AttemptReportViewProps = {
    attempt: AttemptGradingDetailType;
    questions: GradingQuestionType[];
    editable?: boolean;
    showSummaryCards?: boolean;
    showQuestionTable?: boolean;
    showActions?: boolean;
    isSubmitting?: boolean;
    onSubmit?: (payload: {
        itemOverrides: NonNullable<UpdateGradingAttemptBodyType['itemOverrides']>;
        finalize: boolean;
    }) => void;
    optimisticScore?: number | null;
};

/**
 * Renders a modular exam attempt report displaying summary cards, a questions table,
 * actions panel, and an override adjustments modal dialog.
 *
 * @param props - AttemptReportViewProps containing attempt data and submit handlers.
 */
export function AttemptReportView({
    attempt,
    questions,
    editable = false,
    showSummaryCards = true,
    showQuestionTable = true,
    showActions = true,
    isSubmitting = false,
    onSubmit,
    optimisticScore = null,
}: AttemptReportViewProps) {
    const {
        overrideDrafts,
        selectedReport,
        setSelectedReport,
        reportCards,
        handleOverrideChange,
        handleSubmit,
    } = useAttemptReport({ attempt, questions, onSubmit, isSaving: isSubmitting });

    const selectedIndex = selectedReport
        ? reportCards.findIndex((card) => card.questionId === selectedReport.questionId)
        : -1;
    const isReportFinalized = !!attempt.grading.finalizedAt;
    const isEditable = editable && !isReportFinalized;

    return (
        <div className="space-y-6">
            {showSummaryCards ? (
                <AttemptReportSummaryCards attempt={attempt} optimisticScore={optimisticScore} />
            ) : null}

            {showQuestionTable ? (
                <AttemptReportTable
                    reportCards={reportCards}
                    editable={isEditable}
                    onRowClick={setSelectedReport}
                    rubric={attempt.rubric}
                />
            ) : null}

            {showActions ? (
                <AttemptReportActions
                    editable={editable}
                    hasSubmitHandler={Boolean(onSubmit)}
                    isSubmitting={isSubmitting}
                    onSaveOverrides={() => handleSubmit(false)}
                    onSaveAndFinalize={() => handleSubmit(true)}
                    isFinalized={isReportFinalized}
                />
            ) : null}

            {selectedReport && (
                <AttemptReportOverrideDialog
                    selectedReport={selectedReport}
                    open={!!selectedReport}
                    onOpenChange={(open) => !open && setSelectedReport(null)}
                    overrideDraft={overrideDrafts[selectedReport.questionId]}
                    onOverrideChange={handleOverrideChange}
                    questionIndex={selectedIndex}
                />
            )}
        </div>
    );
}
