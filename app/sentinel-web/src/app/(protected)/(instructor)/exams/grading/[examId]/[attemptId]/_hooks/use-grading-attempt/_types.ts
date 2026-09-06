import type { GradingAttemptDetail } from '@sentinel/services';
import type { GradingQuestionType } from '@sentinel/shared';
import type {
    CriteriaScores,
    QuestionEvaluationState,
    EvaluationsState,
    ScoreSummary,
} from '../../_types';

type UseGradingAttemptProps = {
    examId: string;
    attemptId: string;
};

type UseGradingAttemptReturn = {
    attemptDetail: GradingAttemptDetail | undefined;
    isLoading: boolean;
    isError: boolean;
    essayQuestions: GradingQuestionType[];
    activeQuestionId: string | null;
    setActiveQuestionId: (id: string | null) => void;
    activeQuestion: GradingQuestionType | undefined;
    activeEval: QuestionEvaluationState | null;
    evaluations: EvaluationsState;
    overallFeedback: string;
    setOverallFeedback: (feedback: string) => void;
    scoreSummary: ScoreSummary;
    isSubmitting: boolean;
    handleScoreChange: (qId: string, criterionKey: keyof CriteriaScores, value: number) => void;
    handleFeedbackChange: (qId: string, text: string) => void;
    handleRecalculateRubric: () => void;
    handleSubmit: (finalize: boolean) => void;
};

export type { UseGradingAttemptProps, UseGradingAttemptReturn };
