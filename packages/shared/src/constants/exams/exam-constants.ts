import type { ExamCreateFormValues } from '../../schema/exams/exam-create-schema';
import type { ExaminationGlobalSettings } from '../../types';
import type { QuestionType } from '../../types';
import { DEFAULT_EXAMINATION_GLOBAL_SETTINGS } from '../access-control';

export const EXAM_STATUS_OPTIONS = [
    { label: 'Active', value: 'active' },
    { label: 'Draft', value: 'draft' },
    { label: 'Completed', value: 'completed' },
    { label: 'Scheduled', value: 'scheduled' },
] as const;

export const EXAM_FILTER_TABS = [{ value: 'all', label: 'All' }, ...EXAM_STATUS_OPTIONS] as const;

export const EXAM_QUERY_KEYS = {
    all: ['exams'] as const,
    details: (id: string) => ['exams', id] as const,
    configuration: (id: string) => ['exams', id, 'configuration'] as const,
    configurationDefaults: () => ['exams', 'configuration', 'defaults'] as const,
    lobbyCount: (id: string) => ['exams', id, 'lobby', 'count'] as const,
    report: (id: string) => ['exams', id, 'report'] as const,
    essayRubric: (id: string) => ['exams', id, 'essay-rubric'] as const,
    attemptReport: (attemptId: string) => ['exams', 'attempt-report', attemptId] as const,
    monitoring: (id: string) => ['exams', id, 'monitoring'] as const,
    monitoringStudent: (id: string, studentId: string) =>
        ['exams', id, 'monitoring', studentId] as const,
    history: (params?: object) => ['exams', 'history', params ?? {}] as const,
    historyDetail: (id: string) => ['exams', 'history', id] as const,
    sectionAssignments: (id: string) => ['exams', id, 'section-assignments'] as const,
};

export const BUILDER_QUERY_KEYS = {
    all: ['builder'] as const,
    workspace: (id: string) => ['builder', 'workspace', id] as const,
};

export const QUESTION_QUERY_KEYS = {
    all: ['questions'] as const,
    list: (params?: object) => ['questions', 'list', params ?? {}] as const,
    infinite: (params?: object) => ['questions', 'infinite', params ?? {}] as const,
    typeCounts: (params?: object) => ['questions', 'type-counts', params ?? {}] as const,
    details: (id: string) => ['questions', id] as const,
};

export const QUESTION_TYPE_QUERY_KEYS = {
    all: ['question-types'] as const,
    details: (type: QuestionType) => ['question-types', type] as const,
};

export const QUESTION_BANK_COLLECTION_QUERY_KEYS = {
    all: ['question-bank', 'collections'] as const,
    details: (id: string) => ['question-bank', 'collections', id] as const,
};

export const QUESTION_COLLECTION_QUERY_KEYS = {
    all: ['question-collection', 'collections'] as const,
    details: (id: string) => ['question-collection', 'collections', id] as const,
};

export const EXAM_DIFFICULTY_OPTIONS = [
    { label: 'Easy', value: 'EASY' },
    { label: 'Medium', value: 'MEDIUM' },
    { label: 'Hard', value: 'HARD' },
] as const;

export const QUESTION_TYPE_OPTIONS = [
    { label: 'Multiple Choice', value: 'MULTIPLE_CHOICE' },
    { label: 'True / False', value: 'TRUE_FALSE' },
    { label: 'Multiple Response', value: 'MULTIPLE_RESPONSE' },
    { label: 'Identification', value: 'IDENTIFICATION' },
    { label: 'Essay / Short Answer', value: 'ESSAY' },
    { label: 'Enumeration', value: 'ENUMERATION' },
    { label: 'Matching', value: 'MATCHING' },
    { label: 'Fill in the Blank', value: 'FILL_BLANK' },
] as const;

const padDatePart = (value: number) => value.toString().padStart(2, '0');

const formatDateTimeLocal = (date: Date) =>
    `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}T${padDatePart(
        date.getHours(),
    )}:${padDatePart(date.getMinutes())}`;

const createSuggestedExamWindow = (durationMinutes: number) => {
    const now = new Date();
    const startDateTime = new Date(now);

    startDateTime.setSeconds(0, 0);

    const currentMinutes = startDateTime.getMinutes();

    if (currentMinutes === 0) {
        startDateTime.setMinutes(30, 0, 0);
    } else if (currentMinutes < 30) {
        startDateTime.setMinutes(30, 0, 0);
    } else {
        startDateTime.setHours(startDateTime.getHours() + 1, 0, 0, 0);
    }

    const endDateTime = new Date(startDateTime);
    endDateTime.setMinutes(endDateTime.getMinutes() + durationMinutes);

    return {
        startDateTime: formatDateTimeLocal(startDateTime),
        endDateTime: formatDateTimeLocal(endDateTime),
        durationMinutes,
    };
};

export const getExamCreateFormDefaults = (
    defaults: ExaminationGlobalSettings = DEFAULT_EXAMINATION_GLOBAL_SETTINGS,
): ExamCreateFormValues => {
    const suggestedWindow = createSuggestedExamWindow(defaults.defaultDurationMinutes);

    return {
        title: '',
        description: '',
        subjectId: '',
        classroomIds: [],
        roomId: undefined,
        startDateTime: suggestedWindow.startDateTime,
        endDateTime: suggestedWindow.endDateTime,
        durationMinutes: suggestedWindow.durationMinutes,
        passingScore: defaults.defaultPassingScore,
        shuffleQuestions: defaults.defaultShuffleQuestions,
        showCorrectAnswers: defaults.defaultShowCorrectAnswers,
        allowReview: defaults.defaultAllowReview,
        randomizeChoices: defaults.defaultRandomizeChoices,
        instructorId: undefined,
        instructorIds: [],
        isPublic: false,
    };
};

export const EXAM_CREATE_FORM_DEFAULTS: ExamCreateFormValues = getExamCreateFormDefaults();
