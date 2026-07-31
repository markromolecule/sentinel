import type { ExamQuestion } from '@sentinel/shared';
import type {
    BuildGradingAttemptDetailArgs,
    GradingAttemptDetailResponse,
} from './get-grading-attempt-detail.types';

function mapQuestionsForResponse(
    questions: ExamQuestion[],
): GradingAttemptDetailResponse['questions'] {
    return questions.map((question) => ({
        id: question.id,
        examId: question.examId,
        type: question.type,
        sourceFileName: question.sourceFileName ?? null,
        sourcePageNumber: question.sourcePageNumber ?? null,
        sourceEvidence: question.sourceEvidence ?? null,
        passageContent: question.passageContent ?? null,
        passageType: question.passageType ?? null,
        content: question.content,
        points: question.points,
        orderIndex: question.orderIndex,
    }));
}

export function buildGradingAttemptDetailResponse(
    args: BuildGradingAttemptDetailArgs,
): GradingAttemptDetailResponse {
    const { attemptRow, questions, questionReports, snapshotMetadata } = args;

    return {
        attempt: {
            attemptId: attemptRow.attemptId,
            examId: attemptRow.examId,
            examTitle: attemptRow.examTitle,
            subjectTitle: attemptRow.subjectTitle ?? '',
            studentId: attemptRow.studentId,
            studentName: attemptRow.studentName ?? 'Unknown Student',
            studentNumber: attemptRow.studentNumber,
            completedAt: attemptRow.completedAt ? attemptRow.completedAt.toISOString() : null,
            score: attemptRow.score,
            totalScore: attemptRow.totalScore,
            initialScore: attemptRow.initialScore,
            status: attemptRow.status,
            answers: snapshotMetadata.answers,
            evaluations: snapshotMetadata.evaluations,
            rubric: args.rubric,
            feedback: snapshotMetadata.overallFeedback,
            itemOverrides: snapshotMetadata.itemOverrides,
            grading: {
                finalizedAt: attemptRow.finalizedAt
                    ? attemptRow.finalizedAt.toISOString()
                    : typeof snapshotMetadata.grading.finalizedAt === 'string'
                      ? snapshotMetadata.grading.finalizedAt
                      : null,
                finalizedBy:
                    attemptRow.finalizedBy ??
                    (typeof snapshotMetadata.grading.finalizedBy === 'string'
                        ? snapshotMetadata.grading.finalizedBy
                        : null),
            },
            lifecycleState: attemptRow.lifecycleState ?? null,
            scoreState: attemptRow.scoreState ?? null,
            questionReports,
        },
        questions: mapQuestionsForResponse(questions),
    };
}
