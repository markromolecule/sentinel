type CriteriaScores = Record<string, number>;

type QuestionEvaluationState = {
    scores: CriteriaScores;
    feedback: string;
};

type EvaluationsState = Record<string, QuestionEvaluationState>;

type ScoreSummary = {
    objectiveScore: number;
    essayScore: number;
    totalScore: number;
    maxScore: number | null;
};

export type { CriteriaScores, QuestionEvaluationState, EvaluationsState, ScoreSummary };
