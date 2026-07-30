import type { SaveBuilderWorkspacePayload } from '@sentinel/services';
import { DEFAULT_EXAMINATION_GLOBAL_SETTINGS } from '@sentinel/shared/constants';
import type { ExamQuestion, ExamQuestionSection } from '@sentinel/shared/types';
import type { ExamStoreState } from './types';
import {
    DEFAULT_EXAM_SETTINGS,
    DEFAULT_EXAM_CONFIGURATION,
    DEFAULT_SECTION_TITLE,
    UUID_PATTERN,
} from './constants';

/**
 * Generates a random section UUID.
 */
export const generateSectionId = (): string => crypto.randomUUID();

/**
 * Creates a default question section with the given index and optional title.
 *
 * @param index - The order index for the section.
 * @param title - The optional title for the section.
 * @returns A question section object.
 */
export const createQuestionSection = (
    index: number,
    title = `Section ${index + 1}`,
): ExamQuestionSection => ({
    id: generateSectionId(),
    questionType: null,
    title,
    description: null,
    orderIndex: index,
    isCollapsed: false,
});

/**
 * Atomic helper to derive section copy fields (title, description) from a QuestionTypeDefinition.
 *
 * @param definition - The question type definition from the workspace.
 * @returns The copied fields mapped to internal structure.
 */
export function buildQuestionSectionCopy(definition: { value: string; label: string; instruction: string }) {
    return {
        questionType: definition.value as any,
        title: definition.label,
        description: definition.instruction,
    };
}

export const QUESTION_TYPE_INSTRUCTIONS: Record<string, { label: string; instruction: string }> = {
    MULTIPLE_CHOICE: {
        label: 'Multiple Choice',
        instruction: 'Select the best answer from the choices provided.',
    },
    MULTIPLE_RESPONSE: {
        label: 'Multiple Response',
        instruction: 'Select all answers that apply for each question.',
    },
    TRUE_FALSE: {
        label: 'True or False',
        instruction: 'Determine whether each statement is true or false.',
    },
    IDENTIFICATION: {
        label: 'Identification',
        instruction: 'Write the correct term, concept, or short answer.',
    },
    MATCHING: {
        label: 'Matching Type',
        instruction: 'Match each item with its correct corresponding answer.',
    },
    ESSAY: {
        label: 'Essay',
        instruction: 'Answer each question clearly and completely.',
    },
    FILL_BLANK: {
        label: 'Fill in the Blank',
        instruction: 'Complete each statement with the correct word or phrase.',
    },
    ENUMERATION: {
        label: 'Enumeration',
        instruction: 'List all required answers for each question.',
    },
};

/**
 * Calculates the end date and time of an exam session based on its start time and duration.
 *
 * @param startDateTime - The ISO start date-time string.
 * @param durationMinutes - The exam duration in minutes.
 * @param fallbackEndDateTime - The fallback end date-time string.
 * @returns The ISO end date-time string, or null.
 */
export const getEndDateTime = (
    startDateTime?: string,
    durationMinutes?: number,
    fallbackEndDateTime?: string,
): string | null => {
    if (fallbackEndDateTime) {
        return fallbackEndDateTime;
    }

    if (!startDateTime || !durationMinutes) {
        return null;
    }

    const start = new Date(startDateTime);

    if (Number.isNaN(start.getTime())) {
        return null;
    }

    const end = new Date(start);
    end.setMinutes(end.getMinutes() + durationMinutes);

    return end.toISOString();
};

/**
 * Normalizes the exam structure by sorting and validating section IDs for questions.
 *
 * @param questions - The raw list of exam questions.
 * @param questionSections - The raw list of sections.
 * @returns An object containing normalized question sections and normalized questions.
 */
export function normalizeExamStructure(
    questions: ExamQuestion[],
    questionSections?: ExamQuestionSection[],
) {
    const normalizedSections = [...(questionSections ?? [])]
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((section, index) => ({
            ...section,
            orderIndex: index,
            isCollapsed: section.isCollapsed ?? false,
        }));

    const ensuredSections =
        normalizedSections.length > 0
            ? normalizedSections
            : [createQuestionSection(0, DEFAULT_SECTION_TITLE)];

    const groupedQuestions = new Map<string, ExamQuestion[]>(
        ensuredSections.map((section) => [section.id, []]),
    );
    const validSectionIds = new Set(ensuredSections.map((section) => section.id));
    const defaultSectionId = ensuredSections[0].id;

    [...questions]
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .forEach((question) => {
            const sectionId =
                question.sectionId && validSectionIds.has(question.sectionId)
                    ? question.sectionId
                    : defaultSectionId;

            groupedQuestions.get(sectionId)?.push({
                ...question,
                sectionId,
            });
        });

    const normalizedQuestions = ensuredSections
        .flatMap((section) =>
            (groupedQuestions.get(section.id) ?? []).map((question) => ({
                ...question,
                sectionId: section.id,
            })),
        )
        .map((question, index) => ({
            ...question,
            orderIndex: index,
        }));

    return {
        questionSections: ensuredSections,
        questions: normalizedQuestions,
    };
}

/**
 * Checks if a string value is a valid UUID.
 *
 * @param value - The value to test.
 * @returns True if the value is a valid UUID.
 */
export function isUuid(value?: string | null): boolean {
    return Boolean(value && UUID_PATTERN.test(value));
}

/**
 * Generates the default state object for the exam store.
 *
 * @returns Default store state object.
 */
export function createDefaultState(): ExamStoreState {
    return {
        examId: null,
        title: 'Untitled Exam',
        description: '',
        classroomId: null,
        classroomName: 'Classroom',
        subjectId: null,
        subject: 'General Subject',
        section: '',
        sectionIds: [],
        startDateTime: null,
        endDateTime: null,
        durationMinutes: DEFAULT_EXAMINATION_GLOBAL_SETTINGS.defaultDurationMinutes,
        passingScore: DEFAULT_EXAMINATION_GLOBAL_SETTINGS.defaultPassingScore,
        settings: { ...DEFAULT_EXAM_SETTINGS },
        configuration: { ...DEFAULT_EXAM_CONFIGURATION },
        questionSections: [createQuestionSection(0, DEFAULT_SECTION_TITLE)],
        questions: [],
        status: 'draft',
        isDirty: false,
    };
}

/**
 * Prepares the payload for saving the builder workspace by normalising sections, section maps, and questions.
 *
 * @param state - The current Zustand store state.
 * @returns The structured workspace payload.
 */
export function buildBuilderWorkspacePayload(state: ExamStoreState): SaveBuilderWorkspacePayload {
    const sectionIdMap = new Map<string, string>();

    const normalizedSections = state.questionSections
        .slice()
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((section, index) => {
            const nextId = isUuid(section.id) ? section.id : crypto.randomUUID();
            sectionIdMap.set(section.id, nextId);

            return {
                id: nextId,
                questionType: section.questionType || null,
                title: section.title,
                description: section.description?.trim() || null,
                orderIndex: index,
            };
        });

    const normalizedQuestions = state.questions
        .slice()
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((question, index) => ({
            ...(isUuid(question.id) ? { id: question.id } : {}),
            ...(question.sectionId
                ? { sectionId: sectionIdMap.get(question.sectionId) ?? question.sectionId }
                : {}),
            ...(question.sourceQuestionBankQuestionId
                ? { sourceQuestionBankQuestionId: question.sourceQuestionBankQuestionId }
                : {}),
            ...(question.sourceCollectionId
                ? { sourceCollectionId: question.sourceCollectionId }
                : {}),
            ...(question.sourceOrigin ? { sourceOrigin: question.sourceOrigin } : {}),
            ...(question.sourceFileName ? { sourceFileName: question.sourceFileName } : {}),
            ...(question.sourcePageNumber ? { sourcePageNumber: question.sourcePageNumber } : {}),
            ...(question.sourceEvidence ? { sourceEvidence: question.sourceEvidence } : {}),
            ...(question.passageContent ? { passageContent: question.passageContent } : {}),
            ...(question.passageType ? { passageType: question.passageType } : {}),
            type: question.type,
            points: question.points,
            orderIndex: index,
            content: question.content,
        }));

    return {
        title: state.title,
        description: state.description,
        classroomId: state.classroomId ?? undefined,
        subjectId: state.subjectId ?? undefined,
        section: state.section || undefined,
        startDateTime: state.startDateTime ?? undefined,
        endDateTime:
            state.endDateTime ||
            getEndDateTime(state.startDateTime || undefined, state.durationMinutes) ||
            undefined,
        durationMinutes: state.durationMinutes,
        passingScore: state.passingScore,
        settings: { ...state.settings },
        configuration: { ...state.configuration },
        shuffleQuestions: state.settings.shuffleQuestions,
        showCorrectAnswers: state.settings.showCorrectAnswers,
        allowReview: state.settings.allowReview,
        randomizeChoices: state.settings.randomizeChoices,
        questionSections: normalizedSections,
        questions: normalizedQuestions,
    };
}
