import { scoreExamAttempt } from '@sentinel/shared';
import type {
    Exam,
    ExamAttemptAnswers,
    ExamAttemptScoreSummary,
    ExamQuestion,
    QuestionType,
} from '@sentinel/shared/types';

type MobileDifficulty = 'Easy' | 'Medium' | 'Hard';

export type MobileExamDisplay = Omit<Exam, 'questions' | 'difficulty'> & {
    professor: string;
    questions: number;
    passingPercentage: number;
    difficulty: MobileDifficulty;
    instructions: string[];
    startDate?: string;
    scheduledStartDate?: string;
};

export type MobileSessionQuestion = {
    id: string;
    text: string;
    type: QuestionType;
    points: number;
    /** Structured options for MULTIPLE_CHOICE, MULTIPLE_RESPONSE, and TRUE_FALSE. */
    options: {
        id: string;
        text: string;
    }[];
    /** Matching pairs for MATCHING questions. */
    pairs?: {
        left: string;
        right: string;
    }[];
    /** Expected blanks/items for FILL_BLANK and ENUMERATION questions. */
    blanks?: string[];
    /** Passage body text shown above the question, if any. */
    passage?: string | null;
    /** Passage title, if provided. */
    passageTitle?: string | null;
    /** Placeholder text for SHORT_ANSWER / ESSAY text inputs. */
    placeholder?: string;
    /** Maximum character length for SHORT_ANSWER / ESSAY inputs. */
    maxLength?: number;
    originalContent: ExamQuestion['content'];
};

const DEFAULT_INSTRUCTIONS = [
    'Review the privacy and readiness steps before joining the live session.',
    'Stay inside the app while the exam is active.',
    'Keep camera and microphone access available when required.',
    'Submit your answers before the timer ends.',
];

function toDisplayDifficulty(value?: Exam['difficulty']): MobileDifficulty {
    switch (value) {
        case 'easy':
            return 'Easy';
        case 'hard':
            return 'Hard';
        case 'medium':
        default:
            return 'Medium';
    }
}

function buildInstructions(exam: Exam): string[] {
    const instructions = [...DEFAULT_INSTRUCTIONS];

    if (exam.configuration?.lobbyAdmissionMode === 'INSTRUCTOR_GATED') {
        instructions.unshift('Wait for instructor approval in the lobby before entering.');
    }

    if (exam.configuration?.mobileSecurity?.prevent_backgrounding) {
        instructions.push('Backgrounding the app may be flagged by the proctoring policy.');
    }

    return instructions;
}

/**
 * Converts a raw API exam object into a lightweight display model for the
 * mobile exam list and lobby screens.
 */
export function adaptExamForMobile(exam: Exam): MobileExamDisplay {
    const questionCount =
        exam.questionCount ??
        (Array.isArray(exam.questions) ? exam.questions.length : 0);

    return {
        ...exam,
        professor: exam.professor || 'Instructor',
        questions: questionCount,
        passingPercentage: exam.passingScore,
        difficulty: toDisplayDifficulty(exam.difficulty),
        instructions: buildInstructions(exam),
        startDate:
            exam.scheduledDate || (exam as any).startDate || (exam as any).scheduledStartDate,
        scheduledStartDate:
            (exam as any).scheduledStartDate || exam.scheduledDate || (exam as any).startDate,
    };
}

/**
 * Safely parses raw content into an object even if provided as stringified JSON.
 */
function parseQuestionContent(rawContent: unknown): Record<string, any> {
    if (!rawContent) return {};
    if (typeof rawContent === 'string') {
        try {
            return JSON.parse(rawContent);
        } catch {
            return { prompt: rawContent };
        }
    }
    if (typeof rawContent === 'object') {
        return rawContent as Record<string, any>;
    }
    return {};
}

/**
 * Extracts question prompt text across standard and fallback property keys.
 */
function getQuestionPromptText(question: any, content: Record<string, any>): string {
    if (!content && !question) return '';
    const candidates = [
        content?.prompt,
        content?.question,
        content?.text,
        content?.title,
        content?.body,
        content?.promptText,
        content?.questionPrompt,
        content?.question_text,
        question?.prompt,
        question?.question,
        question?.text,
        question?.title,
        question?.body,
        question?.question_text,
        question?.promptText,
        question?.questionPrompt,
    ];

    for (const cand of candidates) {
        if (typeof cand === 'string' && cand.trim().length > 0) {
            return cand.trim();
        }
    }
    return '';
}

/**
 * Derives rendered option rows for MULTIPLE_CHOICE and MULTIPLE_RESPONSE
 * questions from the raw content, supporting both string arrays and object arrays.
 */
function getChoiceOptions(content: Record<string, any>, question?: any): { id: string; text: string }[] {
    const rawOptions =
        content?.options ??
        content?.choices ??
        content?.items ??
        content?.answers ??
        content?.optionTokens ??
        content?.option_list ??
        question?.options ??
        question?.choices ??
        question?.items ??
        question?.answers;

    if (!Array.isArray(rawOptions) || rawOptions.length === 0) {
        return [];
    }

    return rawOptions.map((opt, index) => {
        const defaultId = String.fromCharCode(65 + index); // 'A', 'B', 'C', ...
        if (typeof opt === 'string' || typeof opt === 'number') {
            return {
                id: defaultId,
                text: String(opt),
            };
        }
        if (opt && typeof opt === 'object') {
            const text =
                opt.text ??
                opt.label ??
                opt.value ??
                opt.prompt ??
                opt.option_text ??
                opt.optionText ??
                opt.choice ??
                String(opt);
            const id = opt.id ?? opt.key ?? defaultId;
            return {
                id: String(id),
                text: String(text),
            };
        }
        return {
            id: defaultId,
            text: String(opt),
        };
    });
}

/**
 * Derives the TRUE_FALSE option rows (always "True" then "False").
 */
function getTrueFalseOptions(): { id: string; text: string }[] {
    return [
        { id: 'true', text: 'True' },
        { id: 'false', text: 'False' },
    ];
}

/**
 * Converts raw ExamQuestion objects from the API into the MobileSessionQuestion
 * format consumed by the mobile session screen. Handles all question types:
 * MULTIPLE_CHOICE, MULTIPLE_RESPONSE, TRUE_FALSE, IDENTIFICATION, ESSAY,
 * FILL_BLANK, ENUMERATION, and MATCHING. Questions with missing or malformed
 * fields default gracefully so no question silently fails to render.
 */
export function adaptExamQuestionsForMobile(exam: Exam | ExamQuestion[] | any): MobileSessionQuestion[] {
    if (!exam) return [];

    const rawList: any[] = Array.isArray(exam)
        ? exam
        : Array.isArray(exam.questions)
            ? exam.questions
            : Array.isArray(exam.rawQuestions)
                ? exam.rawQuestions
                : Array.isArray(exam.examQuestions)
                    ? exam.examQuestions
                    : Array.isArray(exam.data?.questions)
                        ? exam.data.questions
                        : [];

    return [...rawList]
        .sort((left, right) => (left?.orderIndex ?? left?.order_index ?? 0) - (right?.orderIndex ?? right?.order_index ?? 0))
        .map((question, index) => {
            const content = parseQuestionContent(question?.content ?? question);
            const rawType = String(
                question?.type ||
                question?.question_type ||
                question?.questionType ||
                content?.type ||
                'MULTIPLE_CHOICE'
            ).toUpperCase().replace(/[-\s]/g, '_');

            let normalizedType: QuestionType = 'MULTIPLE_CHOICE';
            if (['MULTIPLE_CHOICE', 'SINGLE_CHOICE', 'MCQ'].includes(rawType)) {
                normalizedType = 'MULTIPLE_CHOICE';
            } else if (['MULTIPLE_RESPONSE', 'MULTI_SELECT', 'CHECKBOX', 'CHECKBOXES'].includes(rawType)) {
                normalizedType = 'MULTIPLE_RESPONSE';
            } else if (['TRUE_FALSE', 'BOOLEAN', 'TRUEFALSE', 'TF'].includes(rawType)) {
                normalizedType = 'TRUE_FALSE';
            } else if (['IDENTIFICATION', 'SHORT_ANSWER', 'IDENTIFY'].includes(rawType)) {
                normalizedType = 'IDENTIFICATION';
            } else if (['ENUMERATION', 'LIST'].includes(rawType)) {
                normalizedType = 'ENUMERATION';
            } else if (['FILL_BLANK', 'FILL_IN_THE_BLANK', 'FILL_IN_BLANK', 'CLOZE'].includes(rawType)) {
                normalizedType = 'FILL_BLANK';
            } else if (['MATCHING', 'MATCH'].includes(rawType)) {
                normalizedType = 'MATCHING';
            } else if (['ESSAY', 'LONG_ANSWER'].includes(rawType)) {
                normalizedType = 'ESSAY';
            } else {
                normalizedType = rawType as QuestionType;
            }

            let options: { id: string; text: string }[] = [];
            let placeholder: string | undefined;
            let maxLength: number | undefined;
            let pairs: { left: string; right: string }[] | undefined;
            let blanks: string[] | undefined;

            switch (normalizedType) {
                case 'MULTIPLE_CHOICE':
                case 'MULTIPLE_RESPONSE':
                    options = getChoiceOptions(content, question);
                    break;

                case 'TRUE_FALSE':
                    options = getTrueFalseOptions();
                    break;

                case 'IDENTIFICATION':
                    placeholder = 'Enter your answer here…';
                    maxLength = 250;
                    break;

                case 'ENUMERATION':
                    placeholder = 'Enter item here…';
                    maxLength = 250;
                    if (Array.isArray(content.acceptedAnswers) && content.acceptedAnswers.length > 0) {
                        blanks = content.acceptedAnswers.map((b: any) => String(b ?? ''));
                    } else if (Array.isArray(content.blanks) && content.blanks.length > 0) {
                        blanks = content.blanks.map((b: any) => String(b ?? ''));
                    }
                    break;

                case 'ESSAY':
                    placeholder = 'Write your response here…';
                    maxLength =
                        typeof content.maxLength === 'number' ? content.maxLength : 5000;
                    break;

                case 'FILL_BLANK':
                    placeholder = 'Fill in the blank…';
                    maxLength = 250;
                    if (Array.isArray(content.blanks) && content.blanks.length > 0) {
                        blanks = content.blanks.map((b: any) => String(b ?? ''));
                    } else if (Array.isArray(content.acceptedAnswers) && content.acceptedAnswers.length > 0) {
                        blanks = content.acceptedAnswers.map((b: any) => String(b ?? ''));
                    }
                    break;

                case 'MATCHING':
                    placeholder = 'Type the matching value…';
                    if (Array.isArray(content.pairs) && content.pairs.length > 0) {
                        pairs = content.pairs.map((p: any) => ({
                            left: String(p?.left ?? ''),
                            right: String(p?.right ?? ''),
                        }));
                    }
                    break;

                default:
                    placeholder = 'Enter your answer here…';
            }

            // Passage can live on the question record (passageContent) or embedded in content.
            const rawPassage =
                question?.passageContent ??
                question?.passage_content ??
                content?.passage ??
                content?.passageContent ??
                content?.passage_content ??
                content?.passageText ??
                content?.passage_text ??
                question?.sourceEvidence ??
                question?.source_evidence ??
                content?.sourceEvidence ??
                content?.source_evidence ??
                null;

            const passageBody: string | null =
                typeof rawPassage === 'string' && rawPassage.trim().length > 0
                    ? rawPassage.trim()
                    : null;

            const rawPassageTitle =
                content?.passageTitle ??
                content?.passage_title ??
                question?.passageTitle ??
                question?.passage_title ??
                content?.passageHeader ??
                content?.passage_header ??
                null;

            const passageTitle: string | null =
                typeof rawPassageTitle === 'string' && rawPassageTitle.trim().length > 0
                    ? rawPassageTitle.trim()
                    : null;

            const text = getQuestionPromptText(question, content);
            const questionId = String(question?.id ?? question?.question_id ?? question?.questionId ?? `q-${index}`);
            const points = typeof question?.points === 'number' ? question.points : typeof (question as any)?.point === 'number' ? (question as any).point : 1;

            return {
                id: questionId,
                text,
                type: normalizedType,
                points,
                options,
                pairs,
                blanks,
                passage: passageBody,
                passageTitle: passageTitle,
                ...(placeholder !== undefined && { placeholder }),
                ...(maxLength !== undefined && { maxLength }),
                originalContent: question?.content ?? content,
            };
        });
}

/**
 * Builds the answer payload for the API submission from the current in-session
 * answer state. Supports single-value (string option ID/text), multi-select
 * (JSON arrays), arrays (fill blanks/enumeration), objects (matching), and text.
 */
export function buildSessionAnswerPayload(
    questions: MobileSessionQuestion[],
    selectedOptionIds: Record<string, any>,
): ExamAttemptAnswers {
    const answerEntries = questions.flatMap((question) => {
        const raw = selectedOptionIds[question.id];

        if (raw === undefined || raw === null || raw === '') {
            return [];
        }

        // Multi-select answers (MULTIPLE_RESPONSE) or Array answers (FILL_BLANK / ENUMERATION)
        if (Array.isArray(raw)) {
            if (raw.length === 0) return [];
            if (question.type === 'MULTIPLE_RESPONSE' && question.options.length > 0) {
                const texts = raw
                    .map((id) => question.options.find((o) => o.id === id || o.text === id)?.text ?? id)
                    .filter(Boolean) as string[];
                return [[question.id, JSON.stringify(texts)] as const];
            }
            return [[question.id, JSON.stringify(raw)] as const];
        }

        // Object answers (MATCHING)
        if (typeof raw === 'object') {
            return [[question.id, JSON.stringify(raw)] as const];
        }

        // TRUE_FALSE: stored as literal 'true' / 'false' id
        if (question.type === 'TRUE_FALSE') {
            return [[question.id, String(raw).toLowerCase()] as const];
        }

        // Text-based answers (ESSAY, IDENTIFICATION, etc.) are stored verbatim.
        if (question.options.length === 0) {
            return [[question.id, String(raw)] as const];
        }

        // Single-choice: resolve option id → text
        const selectedOption = question.options.find((option) => option.id === raw || option.text === raw);

        if (!selectedOption) {
            return [[question.id, String(raw)] as const];
        }

        return [[question.id, selectedOption.text] as const];
    });

    return Object.fromEntries(answerEntries);
}

export function buildExamResultPreview(args: {
    questions: MobileSessionQuestion[];
    answers: Record<string, any>;
    elapsedSeconds: number;
    sessionId: string;
}): {
    summary: ExamAttemptScoreSummary;
    answers: ExamAttemptAnswers;
    elapsedSeconds: number;
    sessionId: string;
} {
    const answerPayload = buildSessionAnswerPayload(args.questions, args.answers);

    // Use shared scoring logic
    const summary = scoreExamAttempt({
        questions: args.questions.map((q) => ({
            id: q.id,
            type: q.type,
            points: q.points,
            content: q.originalContent,
        })) as unknown as ExamQuestion[],
        answers: answerPayload,
    });

    return {
        summary,
        answers: answerPayload,
        elapsedSeconds: args.elapsedSeconds,
        sessionId: args.sessionId,
    };
}
