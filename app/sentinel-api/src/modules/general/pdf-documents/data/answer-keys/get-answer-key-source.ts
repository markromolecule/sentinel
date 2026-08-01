import { type DbClient } from '@sentinel/db';
import type {
    ExamQuestionContent,
    MatchingPair as ProductMatchingPair,
} from '@sentinel/shared/types';
import { UnrecoverableError } from 'bullmq';
import type {
    ExamAnswerKeyData,
    EssayRubricItem,
    MatchingPair,
    QuestionOption,
    QuestionType,
    QuestionViewModel,
} from '../../rendering/exam-answer-key-view-model';

export type AnswerKeySource = {
    examId: string;
    institutionId: string;
    examTitle: string;
    subjectCode: string;
    subjectName: string;
    durationMinutes: number;
    difficulty: string;
    passingScore: number;
    institutionName: string;
    questions: QuestionViewModel[];
};

type LegacyOption = {
    id?: unknown;
    optionId?: unknown;
    text?: unknown;
    optionText?: unknown;
    isCorrect?: unknown;
    is_correct?: unknown;
};

type LegacyPair = {
    left?: unknown;
    right?: unknown;
    premise?: unknown;
    response?: unknown;
    key?: unknown;
    value?: unknown;
    question?: unknown;
    answer?: unknown;
};

type QuestionContentRecord = Partial<ExamQuestionContent> & {
    text?: unknown;
    choices?: unknown;
    trueFalseAnswer?: unknown;
    shortAnswerPattern?: unknown;
    blankAnswers?: unknown;
    correctAnswers?: unknown;
    matchingPairs?: unknown;
    orderedItems?: unknown;
    correctOrder?: unknown;
};

const PRODUCT_TO_RENDERER_QUESTION_TYPE: Record<string, QuestionType> = {
    MULTIPLE_CHOICE: 'MULTIPLE_CHOICE',
    MULTIPLE_RESPONSE: 'MULTIPLE_SELECT',
    TRUE_FALSE: 'TRUE_FALSE',
    IDENTIFICATION: 'SHORT_ANSWER',
    ENUMERATION: 'SHORT_ANSWER',
    MATCHING: 'MATCHING',
    FILL_BLANK: 'FILL_IN_BLANK',
    ESSAY: 'ESSAY',
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined;
}

function asBoolean(value: unknown): boolean | undefined {
    return typeof value === 'boolean' ? value : undefined;
}

function stringifyAnswer(value: string | number | boolean): string {
    return String(value).trim();
}

function asStringArray(value: unknown): string[] | undefined {
    if (!Array.isArray(value)) {
        return undefined;
    }

    const strings = value
        .filter((item): item is string | number | boolean =>
            ['string', 'number', 'boolean'].includes(typeof item),
        )
        .map(stringifyAnswer)
        .filter(Boolean);

    return strings.length ? strings : [];
}

function normalizeChoiceComparison(value: string): string {
    return value
        .normalize('NFKC')
        .replace(/\s+/g, ' ')
        .replace(/^(['"])(.*)\1$/, '$2')
        .replace(/[.!?]+$/, '')
        .trim()
        .toLocaleLowerCase();
}

function getCorrectAnswerSet(content: QuestionContentRecord): Set<string> {
    const answerValues = Array.isArray(content.correctAnswer)
        ? content.correctAnswer
        : content.correctAnswer === undefined
          ? []
          : [content.correctAnswer];

    return new Set(
        answerValues
            .filter((answer): answer is string | number | boolean =>
                ['string', 'number', 'boolean'].includes(typeof answer),
            )
            .map((answer) => normalizeChoiceComparison(stringifyAnswer(answer))),
    );
}

function normalizeLegacyOption(option: LegacyOption, index: number): QuestionOption {
    const optionText = asString(option.optionText) ?? asString(option.text) ?? '';

    return {
        optionId: asString(option.optionId) ?? asString(option.id) ?? `option-${index + 1}`,
        optionText,
        isCorrect: asBoolean(option.isCorrect) ?? asBoolean(option.is_correct) ?? false,
    };
}

/**
 * Parses persisted question content into a record while tolerating malformed JSON as empty content.
 *
 * @param rawContent - Database JSON/JSONB value or serialized JSON string from `exam_questions.content`
 * @returns Parsed content record suitable for answer-key normalization
 */
export function parseAnswerKeyQuestionContent(rawContent: unknown): QuestionContentRecord {
    if (typeof rawContent === 'string') {
        try {
            const parsed = JSON.parse(rawContent) as unknown;
            return isRecord(parsed) ? (parsed as QuestionContentRecord) : {};
        } catch {
            return {};
        }
    }

    return isRecord(rawContent) ? (rawContent as QuestionContentRecord) : {};
}

/**
 * Maps persisted product question types to the answer-key renderer's supported question types.
 *
 * @param questionType - Product question type from the examination/question tables
 * @returns Renderer question type used by the answer-key PDF view model
 */
export function mapProductQuestionTypeToAnswerKeyType(
    questionType: string | null | undefined,
): QuestionType {
    return (
        PRODUCT_TO_RENDERER_QUESTION_TYPE[questionType?.toUpperCase() ?? ''] ?? 'MULTIPLE_CHOICE'
    );
}

/**
 * Builds deterministic answer-key option objects from current string options or documented legacy
 * object options.
 *
 * @param content - Parsed question content
 * @returns Option view models with stable IDs and correctness flags
 */
export function normalizeAnswerKeyOptions(
    content: QuestionContentRecord,
): QuestionOption[] | undefined {
    if (
        Array.isArray(content.options) &&
        content.options.every((option) => typeof option === 'string')
    ) {
        const correctAnswers = getCorrectAnswerSet(content);

        return content.options.map((option, index) => ({
            optionId: `option-${index + 1}`,
            optionText: option,
            isCorrect: correctAnswers.has(normalizeChoiceComparison(option)),
        }));
    }

    const legacyOptions = Array.isArray(content.options)
        ? content.options
        : Array.isArray(content.choices)
          ? content.choices
          : undefined;

    if (!legacyOptions?.every(isRecord)) {
        return undefined;
    }

    return legacyOptions.map((option, index) => normalizeLegacyOption(option, index));
}

/**
 * Normalizes accepted short-answer guidance from current and legacy answer fields.
 *
 * @param content - Parsed question content
 * @param questionType - Product question type
 * @returns A single display string for renderer guidance
 */
export function normalizeShortAnswerGuidance(
    content: QuestionContentRecord,
    questionType: string | null | undefined,
): string {
    const answers =
        asStringArray(content.acceptedAnswers) ??
        asStringArray(content.correctAnswer) ??
        asStringArray(content.shortAnswerPattern);

    if (!answers?.length) {
        return '';
    }

    return questionType?.toUpperCase() === 'ENUMERATION' ? answers.join('\n') : answers.join(', ');
}

/**
 * Normalizes fill-in-blank answers from current `blanks` or documented legacy blank answer keys.
 *
 * @param content - Parsed question content
 * @returns Ordered blank answer strings
 */
export function normalizeBlankAnswers(content: QuestionContentRecord): string[] {
    return (
        asStringArray(content.blanks) ??
        asStringArray(content.blankAnswers) ??
        asStringArray(content.correctAnswers) ??
        []
    );
}

/**
 * Normalizes matching associations from current `pairs` or documented legacy matching-pair keys.
 *
 * @param content - Parsed question content
 * @returns Renderer matching associations
 */
export function normalizeMatchingPairs(content: QuestionContentRecord): MatchingPair[] | undefined {
    const pairs = Array.isArray(content.pairs)
        ? content.pairs
        : Array.isArray(content.matchingPairs)
          ? content.matchingPairs
          : undefined;

    if (!pairs?.every(isRecord)) {
        return undefined;
    }

    return pairs
        .map((pair): MatchingPair | null => {
            const currentPair = pair as ProductMatchingPair;
            const legacyPair = pair as LegacyPair;
            const premise =
                asString(currentPair.left) ??
                asString(legacyPair.premise) ??
                asString(legacyPair.key) ??
                asString(legacyPair.question);
            const response =
                asString(currentPair.right) ??
                asString(legacyPair.response) ??
                asString(legacyPair.value) ??
                asString(legacyPair.answer);

            return premise && response ? { premise, response } : null;
        })
        .filter((pair): pair is MatchingPair => pair !== null);
}

/**
 * Converts a string essay rubric into a renderer-supported guidance item without inventing criteria
 * or point allocations.
 *
 * @param content - Parsed question content
 * @returns Explicit guidance item array, or an empty array when no guidance exists
 */
export function normalizeEssayRubric(content: QuestionContentRecord): EssayRubricItem[] {
    const rubric = asString(content.rubric)?.trim();

    if (!rubric) {
        return [];
    }

    return [
        {
            criterion: 'Answer guidance',
            maxPoints: 0,
            description: rubric,
        },
    ];
}

/**
 * Converts one persisted exam question into the answer-key renderer view model.
 *
 * @param question - Database question row
 * @param index - Zero-based order used only for deterministic fallback IDs
 * @returns Normalized question view model
 */
export function normalizeAnswerKeyQuestion(
    question: {
        question_id: string;
        question_type: string | null;
        content: unknown;
        passage_content: string | null;
        points: number | null;
    },
    index: number,
): QuestionViewModel {
    const content = parseAnswerKeyQuestionContent(question.content);
    const productType = question.question_type?.toUpperCase() ?? 'MULTIPLE_CHOICE';
    const rendererType = mapProductQuestionTypeToAnswerKeyType(productType);

    return {
        questionId: question.question_id || `question-${index + 1}`,
        type: rendererType,
        points: question.points ?? 1,
        text: asString(content.prompt) ?? asString(content.text) ?? '',
        passageText: question.passage_content ?? null,
        options:
            rendererType === 'MULTIPLE_CHOICE' || rendererType === 'MULTIPLE_SELECT'
                ? normalizeAnswerKeyOptions(content)
                : undefined,
        trueFalseAnswer:
            rendererType === 'TRUE_FALSE'
                ? (asBoolean(content.correctBoolean) ??
                  asBoolean(content.correctAnswer) ??
                  asBoolean(content.trueFalseAnswer))
                : undefined,
        shortAnswerPattern:
            rendererType === 'SHORT_ANSWER'
                ? normalizeShortAnswerGuidance(content, productType)
                : undefined,
        rubric: rendererType === 'ESSAY' ? normalizeEssayRubric(content) : undefined,
        blankAnswers: rendererType === 'FILL_IN_BLANK' ? normalizeBlankAnswers(content) : undefined,
        matchingPairs: rendererType === 'MATCHING' ? normalizeMatchingPairs(content) : undefined,
        orderedItems:
            rendererType === 'ORDERING'
                ? (asStringArray(content.orderedItems) ?? asStringArray(content.correctOrder) ?? [])
                : undefined,
    };
}

/**
 * Loads an exam answer-key source for PDF generation.
 *
 * Verifies that:
 * - The exam belongs to the given institution.
 * - Raw, unsanitized question content with correct answers is used only in the private PDF pipeline.
 *
 * @param dbClient - Database client
 * @param examId - UUID of the exam
 * @param institutionId - UUID of the requesting institution
 * @returns Typed answer-key source with unsanitized question data
 * @throws UnrecoverableError if exam not found or belongs to a different institution
 */
export async function getAnswerKeySource(
    dbClient: DbClient,
    examId: string,
    institutionId: string,
): Promise<AnswerKeySource> {
    const exam = await dbClient
        .selectFrom('exams as e')
        .leftJoin('subjects as s', 's.subject_id', 'e.subject_id')
        .leftJoin('institutions as i', 'i.id', 'e.institution_id')
        .select([
            'e.exam_id',
            'e.title',
            'e.duration_minutes',
            'e.difficulty',
            'e.passing_score',
            'e.institution_id',
            's.subject_code',
            's.subject_title as subject_name',
            'i.name as institution_name',
        ])
        .where('e.exam_id', '=', examId)
        .executeTakeFirst();

    if (!exam) {
        throw new UnrecoverableError(`Answer key source: exam not found: ${examId}`);
    }

    if (exam.institution_id !== institutionId) {
        throw new UnrecoverableError(
            `Answer key source: exam ${examId} belongs to institution ${exam.institution_id}, not ${institutionId}`,
        );
    }

    const rawQuestions = await dbClient
        .selectFrom('exam_questions as eq')
        .leftJoin(
            'question_bank_questions as qbq',
            'qbq.question_bank_question_id',
            'eq.source_question_bank_question_id',
        )
        .select([
            'eq.question_id',
            'eq.question_type',
            'eq.content',
            'eq.passage_content',
            'eq.points',
            'eq.order_index',
        ])
        .where('eq.exam_id', '=', examId)
        .orderBy('order_index', 'asc')
        .execute();

    return {
        examId: exam.exam_id,
        institutionId: exam.institution_id!,
        examTitle: exam.title,
        subjectCode: exam.subject_code ?? 'GEN-101',
        subjectName: exam.subject_name ?? 'General Course',
        durationMinutes: exam.duration_minutes ?? 60,
        difficulty: exam.difficulty ?? 'MEDIUM',
        passingScore: exam.passing_score ?? 50,
        institutionName: exam.institution_name ?? 'Sentinel Institution',
        questions: rawQuestions.map((question, index) =>
            normalizeAnswerKeyQuestion(question, index),
        ),
    };
}

/**
 * Converts an AnswerKeySource to an ExamAnswerKeyData view model suitable for rendering.
 *
 * @param source - Answer key source loaded by getAnswerKeySource
 * @param generatedBy - Actor label, such as the requesting user display name
 * @returns ExamAnswerKeyData view model
 */
export function mapAnswerKeySourceToViewModel(
    source: AnswerKeySource,
    generatedBy: string = 'Sentinel Support',
): ExamAnswerKeyData {
    return {
        examId: source.examId,
        title: source.examTitle,
        subjectCode: source.subjectCode,
        subjectName: source.subjectName,
        durationMinutes: source.durationMinutes,
        difficulty: source.difficulty,
        passingScore: source.passingScore,
        generatedAt: new Date().toISOString(),
        generatedBy,
        institutionName: source.institutionName,
        questions: source.questions,
    };
}
