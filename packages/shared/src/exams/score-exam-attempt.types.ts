import type {
    ExamAttemptAnswerValue,
    ExamAttemptAnswers,
    ExamAttemptScoreSummary,
    ExamQuestion,
} from '../types';
import type { EssayQuestionEvaluation } from '../schema/exams/assessment-schema';

export type ExamAttemptItemOverride = {
    awardedScore: number;
    reason?: string | null;
    overriddenBy?: string | null;
    overriddenAt?: string | null;
};

export type ExamAttemptGradingMetadata = {
    finalizedAt?: string | null;
    finalizedBy?: string | null;
};

export type ExamQuestionReportCorrectAnswer =
    string | number | boolean | string[] | number[] | Record<string, string> | null;

export type ExamAttemptQuestionReport = {
    questionId: string;
    questionType: ExamQuestion['type'];
    prompt: string;
    submittedAnswer: ExamAttemptAnswerValue;
    displayAnswer: ExamAttemptAnswerValue;
    answer: ExamAttemptAnswerValue;
    correctAnswer: ExamQuestionReportCorrectAnswer;
    isCorrect: boolean | null;
    objectiveAwardedScore: number | null;
    awardedScore: number | null;
    maxScore: number;
    manualReviewState: 'NOT_REQUIRED' | 'PENDING_REVIEW' | 'REVIEWED';
    scoringVersion: string;
    evaluation: EssayQuestionEvaluation | null;
    override: ExamAttemptItemOverride | null;
};

export type ScoreExamAttemptArgs = {
    questions: ExamQuestion[];
    answers: ExamAttemptAnswers;
};

export type BuildExamAttemptQuestionReportsArgs = {
    questions: ExamQuestion[];
    answers: ExamAttemptAnswers;
    evaluations?: Record<string, EssayQuestionEvaluation>;
    itemOverrides?: Record<string, ExamAttemptItemOverride>;
    scoringVersion?: string;
};

export type ScoreExamAttemptResult = ExamAttemptScoreSummary;
