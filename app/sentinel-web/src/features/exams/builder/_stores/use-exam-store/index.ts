import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { DEFAULT_EXAMINATION_GLOBAL_SETTINGS } from '@sentinel/shared/constants';
import type { ExamQuestion } from '@sentinel/shared/types';
import type { ExamStore } from './types';
import {
    DEFAULT_EXAM_SETTINGS,
    DEFAULT_SECTION_TITLE,
    DEFAULT_EXAM_CONFIGURATION,
    DEFAULT_EXAM_STORE_STATE,
} from './constants';
import {
    createQuestionSection,
    getEndDateTime,
    normalizeExamStructure,
    QUESTION_TYPE_INSTRUCTIONS,
} from './helpers';

export * from './types';
export * from './constants';
export * from './helpers';

export const useExamStore = create(
    immer<ExamStore>((set) => ({
        ...DEFAULT_EXAM_STORE_STATE,
        questionSections: [createQuestionSection(0, DEFAULT_SECTION_TITLE)],

        hydrateExam: (exam) => {
            const normalizedStructure = normalizeExamStructure(
                exam.questions || [],
                exam.questionSections,
            );

            set((state) => {
                const shouldPreserveLocalQuestions = state.examId === exam.id && state.isDirty;

                state.examId = exam.id;
                state.title = exam.title;
                state.description = exam.description || '';
                state.classroomId = exam.classroomId || null;
                state.classroomName = exam.classroomName || 'Classroom';
                state.subjectId = exam.subjectId || null;
                state.subject = exam.subject || 'General Subject';
                state.section = exam.section || '';
                state.sectionIds = exam.sectionIds || [];
                state.startDateTime = exam.scheduledDate || null;
                state.endDateTime = getEndDateTime(
                    exam.scheduledDate,
                    exam.duration,
                    exam.endDateTime,
                );
                state.durationMinutes =
                    exam.duration ?? DEFAULT_EXAMINATION_GLOBAL_SETTINGS.defaultDurationMinutes;
                state.passingScore =
                    exam.passingScore ?? DEFAULT_EXAMINATION_GLOBAL_SETTINGS.defaultPassingScore;
                state.settings = exam.settings || { ...DEFAULT_EXAM_SETTINGS };
                state.configuration = exam.configuration || { ...DEFAULT_EXAM_CONFIGURATION };
                if (!shouldPreserveLocalQuestions) {
                    state.questionSections = normalizedStructure.questionSections;
                    state.questions = normalizedStructure.questions;
                    state.isDirty = false;
                }
                state.status = exam.status === 'published' ? 'published' : 'draft';
            });
        },

        setSetupDraft: (setup) => {
            set((state) => {
                state.examId = setup.examId;
                state.title = setup.title;
                state.description = setup.description;
                state.classroomId = setup.classroomId;
                state.classroomName = setup.classroomName;
                state.subjectId = setup.subjectId;
                state.subject = setup.subject;
                state.section = setup.section;
                state.sectionIds = setup.sectionIds;
                state.startDateTime = setup.startDateTime;
                state.endDateTime = setup.endDateTime;
                state.durationMinutes = setup.durationMinutes;
                state.passingScore = setup.passingScore;
                state.settings = { ...setup.settings };
                state.configuration = setup.configuration || { ...DEFAULT_EXAM_CONFIGURATION };
                state.questionSections = [createQuestionSection(0, DEFAULT_SECTION_TITLE)];
                state.questions = [];
                state.status = 'draft';
                state.isDirty = false;
            });
        },

        setExamId: (id) => {
            set((state) => {
                state.examId = id;
            });
        },

        setTitle: (title) => {
            set((state) => {
                state.title = title;
                state.isDirty = true;
            });
        },

        setDescription: (description) => {
            set((state) => {
                state.description = description;
                state.isDirty = true;
            });
        },

        markClean: () => {
            set((state) => {
                state.isDirty = false;
            });
        },

        updateSetting: (key, value) => {
            set((state) => {
                state.settings[key] = value;
                state.isDirty = true;
            });
        },

        updateConfiguration: (key, value) => {
            set((state) => {
                state.configuration[key] = value;
                state.isDirty = true;
            });
        },

        addQuestionSection: (title) => {
            set((state) => {
                state.questionSections.push(
                    createQuestionSection(
                        state.questionSections.length,
                        title || `Section ${state.questionSections.length + 1}`,
                    ),
                );
                state.isDirty = true;
            });
        },

        updateQuestionSection: (sectionId, updates) => {
            set((state) => {
                const sectionIndex = state.questionSections.findIndex(
                    (section) => section.id === sectionId,
                );
                if (sectionIndex !== -1) {
                    const currentSection = state.questionSections[sectionIndex];
                    let finalUpdates = { ...updates };
                    if ('questionType' in updates && updates.questionType !== undefined) {
                        const newType = updates.questionType;
                        if (newType === null) {
                            finalUpdates.questionType = null;
                        } else {
                            const meta = QUESTION_TYPE_INSTRUCTIONS[newType];
                            if (meta) {
                                finalUpdates.questionType = newType;
                                finalUpdates.title = meta.label;
                                finalUpdates.description = meta.instruction;
                            }
                        }
                    }
                    Object.assign(currentSection, finalUpdates);
                    state.isDirty = true;
                }
            });
        },

        deleteQuestionSection: (sectionId) => {
            set((state) => {
                if (state.questionSections.length <= 1) {
                    return;
                }

                const remainingSections = state.questionSections.filter(
                    (section) => section.id !== sectionId,
                );
                const remainingQuestions = state.questions.filter(
                    (question) => question.sectionId !== sectionId,
                );
                const normalizedStructure = normalizeExamStructure(
                    remainingQuestions,
                    remainingSections,
                );

                state.questionSections = normalizedStructure.questionSections;
                state.questions = normalizedStructure.questions;
                state.isDirty = true;
            });
        },

        toggleQuestionSectionCollapse: (sectionId) => {
            set((state) => {
                const sectionIndex = state.questionSections.findIndex(
                    (section) => section.id === sectionId,
                );
                if (sectionIndex !== -1) {
                    state.questionSections[sectionIndex].isCollapsed =
                        !state.questionSections[sectionIndex].isCollapsed;
                    state.isDirty = true;
                }
            });
        },

        reorderQuestionSections: (startIndex, endIndex) => {
            set((state) => {
                const reorderedSections = Array.from(state.questionSections);
                const [movedSection] = reorderedSections.splice(startIndex, 1);

                if (!movedSection) {
                    return;
                }

                reorderedSections.splice(endIndex, 0, movedSection);
                const sectionsWithUpdatedOrder = reorderedSections.map((section, index) => ({
                    ...section,
                    orderIndex: index,
                }));

                const normalizedStructure = normalizeExamStructure(
                    state.questions,
                    sectionsWithUpdatedOrder,
                );
                state.questionSections = normalizedStructure.questionSections;
                state.questions = normalizedStructure.questions;
                state.isDirty = true;
            });
        },

        setQuestions: (questions) => {
            set((state) => {
                const normalizedStructure = normalizeExamStructure(
                    questions,
                    state.questionSections,
                );
                state.questionSections = normalizedStructure.questionSections;
                state.questions = normalizedStructure.questions;
                state.isDirty = true;
            });
        },

        addQuestion: (question) => {
            set((state) => {
                const defaultSectionId = state.questionSections[0]?.id;
                const normalizedStructure = normalizeExamStructure(
                    [
                        ...state.questions,
                        {
                            ...question,
                            sectionId: question.sectionId || defaultSectionId,
                        },
                    ],
                    state.questionSections,
                );

                state.questionSections = normalizedStructure.questionSections;
                state.questions = normalizedStructure.questions;
                state.isDirty = true;
            });
        },

        updateQuestion: (id, updates) => {
            set((state) => {
                const index = state.questions.findIndex((q) => q.id === id);
                if (index !== -1) {
                    Object.assign(state.questions[index], updates);
                    state.isDirty = true;
                }
            });
        },

        deleteQuestion: (id) => {
            set((state) => {
                const normalizedStructure = normalizeExamStructure(
                    state.questions.filter((q) => q.id !== id),
                    state.questionSections,
                );

                state.questionSections = normalizedStructure.questionSections;
                state.questions = normalizedStructure.questions;
                state.isDirty = true;
            });
        },

        reorderQuestions: (startIndex, endIndex) => {
            set((state) => {
                const result = Array.from(state.questions);
                const [movedQuestion] = result.splice(startIndex, 1);

                if (!movedQuestion) {
                    return;
                }

                result.splice(endIndex, 0, movedQuestion);
                const questionsWithUpdatedOrder = result.map((question, index) => ({
                    ...question,
                    orderIndex: index,
                }));
                const normalizedStructure = normalizeExamStructure(
                    questionsWithUpdatedOrder,
                    state.questionSections,
                );
                state.questionSections = normalizedStructure.questionSections;
                state.questions = normalizedStructure.questions;
                state.isDirty = true;
            });
        },

        reorderQuestionsInSection: (sectionId, startIndex, endIndex) => {
            set((state) => {
                const groupedQuestions = new Map<string, ExamQuestion[]>(
                    state.questionSections.map((section) => [section.id, []]),
                );

                state.questions.forEach((question) => {
                    const targetSectionId = question.sectionId || state.questionSections[0]?.id;
                    if (!targetSectionId) {
                        return;
                    }

                    groupedQuestions.get(targetSectionId)?.push({
                        ...question,
                        sectionId: targetSectionId,
                    });
                });

                const sectionQuestions = groupedQuestions.get(sectionId) || [];
                const [movedQuestion] = sectionQuestions.splice(startIndex, 1);

                if (!movedQuestion) {
                    return;
                }

                sectionQuestions.splice(endIndex, 0, movedQuestion);
                groupedQuestions.set(sectionId, sectionQuestions);

                const reorderedQuestions = state.questionSections
                    .flatMap((section) => groupedQuestions.get(section.id) || [])
                    .map((question, index) => ({
                        ...question,
                        orderIndex: index,
                    }));
                const normalizedStructure = normalizeExamStructure(
                    reorderedQuestions,
                    state.questionSections,
                );

                state.questionSections = normalizedStructure.questionSections;
                state.questions = normalizedStructure.questions;
                state.isDirty = true;
            });
        },
    })),
);
