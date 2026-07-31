import type {
    ExamAttemptAnswers,
    GradingQuestionType,
    AttemptEssayRubricSnapshot,
} from '@sentinel/shared';
import type { ScoreSummary, CriteriaScores, QuestionEvaluationState } from '../_types';

type GradingErrorProps = {
    examId: string;
};

type GradingHeaderProps = {
    studentName: string;
    studentNumber: string;
    examTitle: string;
    subjectTitle: string;
    examId: string;
    isSubmitting: boolean;
    onSubmit: (finalize: boolean) => void;
};

type GradingScoreHighlightsProps = {
    scoreSummary: ScoreSummary;
    status: string | null;
    completedAt: string | null;
};

type GradingQuestionPaneProps = {
    essayQuestions: GradingQuestionType[];
    activeQuestionId: string | null;
    setActiveQuestionId: (id: string) => void;
    activeQuestion: GradingQuestionType | undefined;
    activeEval: QuestionEvaluationState | null;
    onFeedbackChange: (qId: string, text: string) => void;
    answers: ExamAttemptAnswers;
};

type GradingRubricPaneProps = {
    activeQuestion: GradingQuestionType | undefined;
    activeEval: QuestionEvaluationState | null;
    onScoreChange: (qId: string, criterionKey: keyof CriteriaScores, value: number) => void;
    overallFeedback: string;
    onOverallFeedbackChange: (text: string) => void;
    rubric?: AttemptEssayRubricSnapshot;
};

export type {
    GradingErrorProps,
    GradingHeaderProps,
    GradingScoreHighlightsProps,
    GradingQuestionPaneProps,
    GradingRubricPaneProps,
};
