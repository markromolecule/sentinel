import type { Exam, ExamQuestion, QuestionType } from '@sentinel/shared/types';
import type { MobileSessionQuestion } from './mobile-exam-adapter.types';

/**
 * Safely parses raw content into an object even if provided as stringified JSON.
 */
export function parseQuestionContent(rawContent: unknown): Record<string, any> {
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
export function getQuestionPromptText(question: any, content: Record<string, any>): string {
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
export function getChoiceOptions(content: Record<string, any>, question?: any): { id: string; text: string }[] {
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
export function getTrueFalseOptions(): { id: string; text: string }[] {
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
