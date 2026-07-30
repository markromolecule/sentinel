import {
    Schema,
    type AttemptAssessmentSnapshot,
    type AttemptScoreSnapshot,
    type ExamAttemptQuestionReport,
    type ExamQuestion,
} from '@sentinel/shared';
import { HTTPException } from 'hono/http-exception';
import type {
    GradingAttemptSnapshotMetadata,
    GradingQuestionRow,
    ParsedAttemptSnapshots,
} from './get-grading-attempt-detail.types';

export function extractSnapshotMetadata(
    answerSnapshot: Record<string, any> | null | undefined,
): GradingAttemptSnapshotMetadata {
    const snapshotObject = (answerSnapshot ?? {}) as Record<string, any>;
    const answers: Record<string, any> = {};

    for (const [key, value] of Object.entries(snapshotObject)) {
        if (!key.startsWith('_')) {
            answers[key] = value;
        }
    }

    return {
        answers,
        evaluations: (snapshotObject._evaluations ?? {}) as Record<string, any>,
        overallFeedback: (snapshotObject._feedback ?? null) as string | null,
        itemOverrides: (snapshotObject._itemOverrides ?? {}) as Record<string, any>,
        grading: (snapshotObject._grading ?? {}) as Record<string, any>,
    };
}

export function parseAttemptSnapshots(args: {
    assessmentSnapshot: unknown;
    scoreSnapshot: unknown;
}): ParsedAttemptSnapshots {
    const parsedAssessment = Schema.attemptAssessmentSnapshotSchema.safeParse(
        args.assessmentSnapshot,
    );
    const parsedScore = Schema.attemptScoreSnapshotSchema.safeParse(args.scoreSnapshot);

    return {
        assessmentSnapshot: parsedAssessment.success ? parsedAssessment.data : null,
        scoreSnapshot: parsedScore.success ? parsedScore.data : null,
    };
}

export function normalizeSnapshotQuestion(
    question: AttemptAssessmentSnapshot['questions'][number],
): ExamQuestion {
    return {
        ...question,
        sectionId: question.sectionId ?? undefined,
        sourceQuestionBankQuestionId: question.sourceQuestionBankQuestionId ?? undefined,
        sourceCollectionId: question.sourceCollectionId ?? undefined,
        tags: question.tags ?? [],
        content: question.content as ExamQuestion['content'],
    };
}

export function mapQuestionRowToExamQuestion(question: GradingQuestionRow): ExamQuestion {
    return {
        id: question.id,
        examId: question.examId,
        type: question.type as ExamQuestion['type'],
        sourceFileName: question.sourceFileName ?? null,
        sourcePageNumber: question.sourcePageNumber ?? null,
        sourceEvidence: question.sourceEvidence ?? null,
        passageContent: question.passageContent ?? null,
        passageType: question.passageType,
        points: question.points,
        orderIndex: question.orderIndex,
        content: question.content as ExamQuestion['content'],
        tags: [],
    };
}

export function buildQuestionsFromAssessmentSnapshot(
    assessmentSnapshot: AttemptAssessmentSnapshot | null,
) {
    if (!assessmentSnapshot) {
        return null;
    }

    return assessmentSnapshot.questions.map(normalizeSnapshotQuestion);
}

export function normalizeQuestionReports(args: {
    questionReports: AttemptScoreSnapshot['questionReports'];
    questions: ExamQuestion[];
    scoringVersion: string;
}): ExamAttemptQuestionReport[] {
    const promptByQuestionId = new Map(
        args.questions.map((question) => [question.id, question.content.prompt] as const),
    );
    const questionTypeByQuestionId = new Map(
        args.questions.map((question) => [question.id, question.type] as const),
    );

    type QuestionReportAnswerValue = ExamAttemptQuestionReport['answer'];
    const toAnswerValue = (
        value: QuestionReportAnswerValue | undefined,
    ): QuestionReportAnswerValue => value ?? null;

    return args.questionReports.map((report) => {
        const parsedQuestionType = Schema.questionTypeSchema.safeParse(report.questionType);
        const questionType =
            questionTypeByQuestionId.get(report.questionId) ??
            (parsedQuestionType.success ? parsedQuestionType.data : null);

        if (!questionType) {
            throw new HTTPException(500, {
                message: 'Exam attempt score snapshot contains an invalid question type.',
            });
        }

        return {
            ...report,
            questionType,
            prompt: report.prompt ?? promptByQuestionId.get(report.questionId) ?? '',
            submittedAnswer: toAnswerValue(report.submittedAnswer),
            displayAnswer: toAnswerValue(report.displayAnswer),
            answer: toAnswerValue(report.answer ?? report.displayAnswer ?? report.submittedAnswer),
            objectiveAwardedScore:
                report.objectiveAwardedScore ??
                (report.isCorrect === null ? null : report.awardedScore),
            manualReviewState:
                report.manualReviewState ??
                (report.isCorrect === null
                    ? report.evaluation
                        ? 'REVIEWED'
                        : 'PENDING_REVIEW'
                    : 'NOT_REQUIRED'),
            scoringVersion: report.scoringVersion ?? args.scoringVersion,
        };
    });
}
