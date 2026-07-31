import { createHash } from 'node:crypto';
import {
    ATTEMPT_ASSESSMENT_SNAPSHOT_VERSION,
    LEGACY_ESSAY_RUBRIC_VERSION_ID,
    ATTEMPT_SCORE_SNAPSHOT_VERSION,
    buildExamAttemptQuestionReports,
    LEGACY_ESSAY_RUBRIC,
    type EssayRubricDefinition,
    randomizeQuestionChoices,
    scoreExamAttempt,
    shuffleExamQuestions,
    type AttemptEssayRubricSnapshot,
    type ExamAttemptAnswers,
    type ExamQuestion,
    Schema,
    type AttemptAssessmentSnapshot,
    type AttemptScoreSnapshot,
} from '@sentinel/shared';
import type { ExamConfigurationState } from '../../configuration/configuration.dto';
import type { getExamQuestionsData } from '../../exams/data/get-exam-questions';

export const ATTEMPT_SCORING_VERSION = 'fix-001-student-score-integrity-v1';

type BuildAssessmentSnapshotArgs = {
    attemptId: string;
    examId: string;
    configurationState: ExamConfigurationState;
    questions: ExamQuestionDataRow[];
    rubric?: AttemptEssayRubricSnapshot;
};

type BuildScoreSnapshotArgs = {
    questions: ExamQuestion[];
    answers: ExamAttemptAnswers;
    answerChecksum: string;
    evaluations?: Record<string, any>;
    itemOverrides?: Record<string, any>;
    rubric?: AttemptEssayRubricSnapshot;
};

type ExamQuestionDataRow = Awaited<ReturnType<typeof getExamQuestionsData>>[number];

function mapQuestionRecordToExamQuestion(question: ExamQuestionDataRow): ExamQuestion {
    return {
        id: question.question_id,
        examId: question.exam_id,
        sectionId: question.exam_section_id ?? undefined,
        sourceQuestionBankQuestionId: question.source_question_bank_question_id ?? undefined,
        sourceCollectionId: question.source_collection_id ?? undefined,
        sourceOrigin:
            question.source_origin === 'AI_PDF' || question.source_origin === 'MANUAL'
                ? question.source_origin
                : undefined,
        sourceFileName: question.source_file_name ?? null,
        sourcePageNumber: question.source_page_number ?? null,
        sourceEvidence: question.source_evidence ?? null,
        passageContent: question.passage_content ?? null,
        passageType: question.passage_type === 'html' ? 'html' : 'plain',
        type: question.question_type as ExamQuestion['type'],
        points: question.points,
        orderIndex: question.order_index,
        content: question.content as ExamQuestion['content'],
        tags: [],
    };
}

export function normalizeAssessmentSnapshotQuestion(
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

export function normalizeAssessmentSnapshotQuestions(
    questions: AttemptAssessmentSnapshot['questions'],
): ExamQuestion[] {
    return questions.map(normalizeAssessmentSnapshotQuestion);
}

/**
 * Builds the legacy rubric snapshot used for pre-feature attempts and any
 * temporary fallback path that cannot load a persisted rubric version yet.
 */
export function buildLegacyEssayRubricSnapshot(): AttemptEssayRubricSnapshot {
    return {
        id: LEGACY_ESSAY_RUBRIC_VERSION_ID,
        versionNumber: 1,
        source: 'LEGACY',
        definition: LEGACY_ESSAY_RUBRIC,
        updatedAt: null,
    };
}

/**
 * Normalizes persisted rubric-version rows into the attempt snapshot contract.
 */
export function buildAttemptEssayRubricSnapshot(args: {
    id: string;
    versionNumber: number;
    source: 'BASELINE' | 'EXAM_OVERRIDE' | 'LEGACY';
    definition: EssayRubricDefinition;
    updatedAt?: string | null;
}): AttemptEssayRubricSnapshot {
    return Schema.attemptEssayRubricSnapshotSchema.parse({
        id: args.id,
        versionNumber: args.versionNumber,
        source: args.source,
        definition: args.definition,
        updatedAt: args.updatedAt ?? null,
    });
}

/**
 * Reads the rubric captured on an attempt snapshot, falling back to the legacy
 * definition for v1 snapshots that predate rubric version support.
 */
export function resolveAssessmentSnapshotRubric(
    snapshot: AttemptAssessmentSnapshot | null | undefined,
): AttemptEssayRubricSnapshot {
    if (snapshot && 'rubric' in snapshot && snapshot.rubric) {
        return snapshot.rubric;
    }

    return buildLegacyEssayRubricSnapshot();
}

function buildOptionTokens(attemptId: string, questionId: string, options: string[]) {
    return options.map((option, index) =>
        createHash('sha256')
            .update(`${attemptId}:${questionId}:${index}:${option}`)
            .digest('hex')
            .slice(0, 24),
    );
}

export function buildAnswerPayloadChecksum(args: {
    attemptId: string;
    answers: ExamAttemptAnswers;
    elapsedSeconds: number;
}) {
    return createHash('sha256')
        .update(
            JSON.stringify({
                attemptId: args.attemptId,
                answers: args.answers,
                elapsedSeconds: args.elapsedSeconds,
            }),
        )
        .digest('hex');
}

function buildPresentedQuestions(args: {
    questions: ExamQuestionDataRow[];
    attemptId: string;
    configurationState: ExamConfigurationState;
}) {
    const mappedQuestions = args.questions.map(mapQuestionRecordToExamQuestion);
    let finalQuestions = mappedQuestions;

    if (args.configurationState.settings.shuffleQuestions) {
        finalQuestions = shuffleExamQuestions(finalQuestions, args.attemptId);
    }

    if (args.configurationState.settings.randomizeChoices) {
        finalQuestions = finalQuestions.map((question) =>
            randomizeQuestionChoices(question, `${args.attemptId}-${question.id}`),
        );
    }

    finalQuestions = finalQuestions.map((question) => {
        if (question.type !== 'MULTIPLE_CHOICE' && question.type !== 'MULTIPLE_RESPONSE') {
            return question;
        }

        const options = question.content.options ?? [];

        if (options.length === 0) {
            return question;
        }

        return {
            ...question,
            content: {
                ...question.content,
                optionTokens: buildOptionTokens(args.attemptId, question.id, options),
            },
        };
    });

    return finalQuestions;
}

export function buildAssessmentSnapshot(
    args: BuildAssessmentSnapshotArgs,
): AttemptAssessmentSnapshot {
    const presentedQuestions = buildPresentedQuestions({
        questions: args.questions,
        attemptId: args.attemptId,
        configurationState: args.configurationState,
    });
    const rubric = args.rubric ?? buildLegacyEssayRubricSnapshot();

    return Schema.attemptAssessmentSnapshotSchema.parse({
        version: ATTEMPT_ASSESSMENT_SNAPSHOT_VERSION,
        attemptId: args.attemptId,
        examId: args.examId,
        seed: args.attemptId,
        settings: args.configurationState.settings,
        configuration: args.configurationState.configuration,
        questions: presentedQuestions,
        totalScore: presentedQuestions.reduce((sum, question) => sum + question.points, 0),
        rubric,
    });
}

export function parseAssessmentSnapshot(snapshot: unknown): AttemptAssessmentSnapshot | null {
    const result = Schema.attemptAssessmentSnapshotSchema.safeParse(snapshot);
    return result.success ? result.data : null;
}

export function buildScoreSnapshot(args: BuildScoreSnapshotArgs): AttemptScoreSnapshot {
    const baseSummary = scoreExamAttempt({
        questions: args.questions,
        answers: args.answers,
    });
    const rubric = args.rubric ?? buildLegacyEssayRubricSnapshot();

    const questionReports = buildExamAttemptQuestionReports({
        questions: args.questions,
        answers: args.answers,
        evaluations: args.evaluations,
        itemOverrides: args.itemOverrides,
        scoringVersion: ATTEMPT_SCORING_VERSION,
    });

    const score = Math.round(
        questionReports.reduce((sum, report) => sum + (report.awardedScore ?? 0), 0),
    );

    return Schema.attemptScoreSnapshotSchema.parse({
        version: ATTEMPT_SCORE_SNAPSHOT_VERSION,
        scoringVersion: ATTEMPT_SCORING_VERSION,
        generatedAt: new Date().toISOString(),
        answerChecksum: args.answerChecksum,
        score,
        totalScore: baseSummary.totalScore,
        percentage:
            baseSummary.totalScore > 0 ? Math.round((score / baseSummary.totalScore) * 100) : null,
        answeredCount: baseSummary.answeredCount,
        autoGradableQuestionCount: baseSummary.autoGradableQuestionCount,
        manualReviewQuestionCount: baseSummary.manualReviewQuestionCount,
        requiresManualReview: baseSummary.requiresManualReview,
        rubric: {
            id: rubric.id,
            versionNumber: rubric.versionNumber,
            source: rubric.source,
        },
        questionReports,
    });
}

export function parseScoreSnapshot(snapshot: unknown): AttemptScoreSnapshot | null {
    const result = Schema.attemptScoreSnapshotSchema.safeParse(snapshot);
    return result.success ? result.data : null;
}
