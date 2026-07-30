import {
    isCorrectAnswer,
    resolveQuestionAnswerForDisplay,
    resolveQuestionCorrectAnswer,
} from './score-exam-attempt-answer-resolvers';
import type {
    BuildExamAttemptQuestionReportsArgs,
    ExamAttemptQuestionReport,
    ExamAttemptQuestionReportAnswerValue,
} from './score-exam-attempt.types';

function toQuestionReportAnswerValue(value: unknown): ExamAttemptQuestionReportAnswerValue {
    return value === undefined ? null : (value as ExamAttemptQuestionReportAnswerValue);
}

/**
 * Builds item-level report data for an exam attempt so instructor and student
 * report views can render answers, correct answers, and awarded points from
 * one shared helper.
 *
 * @param args - Questions, submitted answers, and optional essay evaluations
 * @returns Question-by-question grading report data in exam order
 */
export function buildExamAttemptQuestionReports(
    args: BuildExamAttemptQuestionReportsArgs,
): ExamAttemptQuestionReport[] {
    const { questions, answers, evaluations = {}, itemOverrides = {}, scoringVersion = 'legacy' } = args;

    return questions.map((question) => {
        const submittedAnswer = toQuestionReportAnswerValue(answers[question.id]);
        const displayAnswer = toQuestionReportAnswerValue(
            resolveQuestionAnswerForDisplay(question, submittedAnswer),
        );
        const isCorrect = isCorrectAnswer(question, submittedAnswer);
        const evaluation = evaluations[question.id] ?? null;
        const itemOverride = itemOverrides[question.id] ?? null;
        const objectiveAwardedScore =
            isCorrect === null ? null : isCorrect ? question.points : 0;
        const awardedScore =
            typeof itemOverride?.awardedScore === 'number'
                ? itemOverride.awardedScore
                : isCorrect === null
                  ? typeof evaluation?.score === 'number'
                      ? evaluation.score
                      : null
                  : isCorrect
                    ? question.points
                    : 0;

        return {
            questionId: question.id,
            questionType: question.type,
            prompt: question.content.prompt,
            submittedAnswer,
            displayAnswer,
            answer: displayAnswer,
            correctAnswer: resolveQuestionCorrectAnswer(question),
            isCorrect,
            objectiveAwardedScore,
            awardedScore,
            maxScore: question.points,
            manualReviewState:
                isCorrect === null ? (evaluation ? 'REVIEWED' : 'PENDING_REVIEW') : 'NOT_REQUIRED',
            scoringVersion,
            evaluation,
            override: itemOverride,
        };
    });
}
