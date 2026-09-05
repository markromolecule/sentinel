import type { Exam, ExamQuestion, QuestionType } from '@sentinel/shared/types';
import type { MobileSessionQuestion } from './mobile-exam-adapter.types';
import {
    extractPassageDetails,
    getQuestionPromptText,
    parseQuestionContent,
} from './mobile-question-parser';
import {
    getChoiceOptions,
    getTrueFalseOptions,
} from './mobile-question-options';
import { normalizeQuestionType } from './mobile-question-type';

export {
    extractPassageDetails,
    getQuestionPromptText,
    parseQuestionContent,
} from './mobile-question-parser';
export {
    getChoiceOptions,
    getTrueFalseOptions,
} from './mobile-question-options';
export { normalizeQuestionType } from './mobile-question-type';

interface QuestionLayoutConfig {
    options: { id: string; text: string }[];
    placeholder?: string;
    maxLength?: number;
    pairs?: { left: string; right: string }[];
    blanks?: string[];
}

function resolveQuestionLayout(
    type: QuestionType,
    content: Record<string, any>,
    question: any,
): QuestionLayoutConfig {
    switch (type) {
        case 'MULTIPLE_CHOICE':
        case 'MULTIPLE_RESPONSE':
            return {
                options: getChoiceOptions(content, question),
            };

        case 'TRUE_FALSE':
            return {
                options: getTrueFalseOptions(),
            };

        case 'IDENTIFICATION':
            return {
                options: [],
                placeholder: 'Enter your answer here…',
                maxLength: 250,
            };

        case 'ENUMERATION': {
            let blanks: string[] | undefined;
            if (Array.isArray(content.acceptedAnswers) && content.acceptedAnswers.length > 0) {
                blanks = content.acceptedAnswers.map((b: any) => String(b ?? ''));
            } else if (Array.isArray(content.blanks) && content.blanks.length > 0) {
                blanks = content.blanks.map((b: any) => String(b ?? ''));
            }
            return {
                options: [],
                placeholder: 'Enter item here…',
                maxLength: 250,
                blanks,
            };
        }

        case 'ESSAY':
            return {
                options: [],
                placeholder: 'Write your response here…',
                maxLength: typeof content.maxLength === 'number' ? content.maxLength : 5000,
            };

        case 'FILL_BLANK': {
            let blanks: string[] | undefined;
            if (Array.isArray(content.blanks) && content.blanks.length > 0) {
                blanks = content.blanks.map((b: any) => String(b ?? ''));
            } else if (Array.isArray(content.acceptedAnswers) && content.acceptedAnswers.length > 0) {
                blanks = content.acceptedAnswers.map((b: any) => String(b ?? ''));
            }
            return {
                options: [],
                placeholder: 'Fill in the blank…',
                maxLength: 250,
                blanks,
            };
        }

        case 'MATCHING': {
            let pairs: { left: string; right: string }[] | undefined;
            if (Array.isArray(content.pairs) && content.pairs.length > 0) {
                pairs = content.pairs.map((p: any) => ({
                    left: String(p?.left ?? ''),
                    right: String(p?.right ?? ''),
                }));
            }
            return {
                options: [],
                placeholder: 'Type the matching value…',
                pairs,
            };
        }

        default:
            return {
                options: [],
                placeholder: 'Enter your answer here…',
            };
    }
}

/**
 * Extracts raw questions list from various envelope structures (arrays or exam models).
 */
function extractRawQuestionsList(exam: Exam | ExamQuestion[] | any): any[] {
    if (!exam) return [];
    if (Array.isArray(exam)) return exam;
    if (Array.isArray(exam.questions)) return exam.questions;
    if (Array.isArray(exam.rawQuestions)) return exam.rawQuestions;
    if (Array.isArray(exam.examQuestions)) return exam.examQuestions;
    if (Array.isArray(exam.data?.questions)) return exam.data.questions;
    return [];
}

/**
 * Determines whether question shuffling is active based on exam settings / configuration.
 */
function shouldShuffleQuestions(exam: Exam | ExamQuestion[] | any): boolean {
    if (!exam || Array.isArray(exam)) return false;
    return Boolean(exam?.settings?.shuffleQuestions || exam?.configuration?.shuffleQuestions);
}

/**
 * Converts raw ExamQuestion objects from the API into the MobileSessionQuestion
 * format consumed by the mobile session screen. Handles all question types:
 * MULTIPLE_CHOICE, MULTIPLE_RESPONSE, TRUE_FALSE, IDENTIFICATION, ESSAY,
 * FILL_BLANK, ENUMERATION, and MATCHING. Questions with missing or malformed
 * fields default gracefully so no question silently fails to render.
 */
export function adaptExamQuestionsForMobile(
    exam: Exam | ExamQuestion[] | any,
): MobileSessionQuestion[] {
    const rawList = extractRawQuestionsList(exam);
    if (rawList.length === 0) return [];

    const isShuffle = shouldShuffleQuestions(exam);
    const questionList = isShuffle
        ? [...rawList]
        : [...rawList].sort(
            (left, right) =>
                (left?.orderIndex ?? left?.order_index ?? 0) -
                (right?.orderIndex ?? right?.order_index ?? 0),
        );

    return questionList.map((question, index) => {
        const content = parseQuestionContent(question?.content ?? question);
        const rawType =
            question?.type ||
            question?.question_type ||
            question?.questionType ||
            content?.type;
        const normalizedType = normalizeQuestionType(rawType);

        const layout = resolveQuestionLayout(normalizedType, content, question);
        const { passage, passageTitle } = extractPassageDetails(question, content);

        const text = getQuestionPromptText(question, content);
        const questionId = String(
            question?.id ?? question?.question_id ?? question?.questionId ?? `q-${index}`,
        );
        const points =
            typeof question?.points === 'number'
                ? question.points
                : typeof (question as any)?.point === 'number'
                    ? (question as any).point
                    : 1;

        return {
            id: questionId,
            text,
            type: normalizedType,
            points,
            options: layout.options,
            pairs: layout.pairs,
            blanks: layout.blanks,
            passage,
            passageTitle,
            ...(layout.placeholder !== undefined && { placeholder: layout.placeholder }),
            ...(layout.maxLength !== undefined && { maxLength: layout.maxLength }),
            originalContent: question?.content ?? content,
        };
    });
}
