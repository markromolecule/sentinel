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
    return {
        ...exam,
        professor: exam.professor || 'Instructor',
        questions: exam.questionCount ?? exam.questions?.length ?? 0,
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
 * Derives rendered option rows for MULTIPLE_CHOICE and MULTIPLE_RESPONSE
 * questions from the raw content.
 */
function getChoiceOptions(content: ExamQuestion['content']): { id: string; text: string }[] {
    if (!Array.isArray(content.options) || content.options.length === 0) {
        return [];
    }

    return (content.options as string[]).map((text, index) => ({
        id: String.fromCharCode(65 + index), // 'A', 'B', 'C', ...
        text,
    }));
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
export function adaptExamQuestionsForMobile(exam: Exam): MobileSessionQuestion[] {
    const questions = exam.questions ?? [];

    return [...questions]
        .sort((left, right) => (left.orderIndex ?? 0) - (right.orderIndex ?? 0))
        .map((question) => {
            const content = question.content;

            let options: { id: string; text: string }[] = [];
            let placeholder: string | undefined;
            let maxLength: number | undefined;

            switch (question.type) {
                case 'MULTIPLE_CHOICE':
                case 'MULTIPLE_RESPONSE':
                    options = getChoiceOptions(content);
                    break;

                case 'TRUE_FALSE':
                    options = getTrueFalseOptions();
                    break;

                case 'IDENTIFICATION':
                case 'ENUMERATION':
                    placeholder = 'Enter your answer here…';
                    maxLength = 250;
                    break;

                case 'ESSAY':
                    placeholder = 'Write your response here…';
                    maxLength =
                        typeof content.maxLength === 'number' ? content.maxLength : 5000;
                    break;

                case 'FILL_BLANK':
                    placeholder = 'Fill in the blank…';
                    maxLength = 250;
                    break;

                case 'MATCHING':
                    // Matching rendered as plain text; options carry no meaning here
                    placeholder = 'Match the items on the left with those on the right.';
                    break;

                default:
                    placeholder = 'Enter your answer here…';
            }

            // Passage can live on the question record (passageContent) or embedded in content.
            const passageBody: string | null | undefined =
                question.passageContent ?? (content as any).passage ?? null;

            const passageTitle: string | null | undefined =
                (content as any).passageTitle ?? null;

            return {
                id: question.id,
                text: content.prompt ?? '',
                type: question.type,
                points: question.points,
                options,
                passage: passageBody || null,
                passageTitle: passageTitle || null,
                ...(placeholder !== undefined && { placeholder }),
                ...(maxLength !== undefined && { maxLength }),
                originalContent: content,
            };
        });
}

/**
 * Builds the answer payload for the API submission from the current in-session
 * answer state. Supports both single-value (string option ID) and multi-select
 * (pipe-separated option texts) answers.
 */
export function buildSessionAnswerPayload(
    questions: MobileSessionQuestion[],
    selectedOptionIds: Record<string, string | string[]>,
): ExamAttemptAnswers {
    const answerEntries = questions.flatMap((question) => {
        const raw = selectedOptionIds[question.id];

        if (!raw) {
            return [];
        }

        // Multi-select answers are stored as arrays; join chosen option texts.
        if (Array.isArray(raw)) {
            const texts = raw
                .map((id) => question.options.find((o) => o.id === id)?.text)
                .filter(Boolean) as string[];

            if (texts.length === 0) {
                return [];
            }

            return [[question.id, JSON.stringify(texts)] as const];
        }

        // TRUE_FALSE: stored as literal 'true' / 'false' id
        if (question.type === 'TRUE_FALSE') {
            return [[question.id, raw] as const];
        }

        // Text-based answers (ESSAY, IDENTIFICATION, etc.) are stored verbatim.
        if (question.options.length === 0) {
            return [[question.id, raw] as const];
        }

        // Single-choice: resolve option id → text
        const selectedOption = question.options.find((option) => option.id === raw);

        if (!selectedOption) {
            return [];
        }

        return [[question.id, selectedOption.text] as const];
    });

    return Object.fromEntries(answerEntries);
}

export function buildExamResultPreview(args: {
    questions: MobileSessionQuestion[];
    answers: Record<string, string | string[]>;
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
