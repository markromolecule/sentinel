import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_EXAMINATION_GLOBAL_SETTINGS } from '@sentinel/shared/constants';
import type { ExamQuestion, ProctorExam } from '@sentinel/shared/types';
import { buildBuilderWorkspacePayload, useExamStore } from './use-exam-store';

function createExam(overrides: Partial<ProctorExam> = {}): ProctorExam {
    return {
        id: 'exam-1',
        title: 'Midterm Exam',
        description: '',
        subject: 'Mathematics',
        subjectId: 'subject-1',
        section: '',
        sectionIds: [],
        classroomId: 'classroom-1',
        classroomName: 'BSIT 1A',
        scheduledDate: '2026-04-13T05:00:00.000Z',
        endDateTime: '2026-04-13T06:00:00.000Z',
        duration: 60,
        passingScore: 75,
        settings: {
            shuffleQuestions: true,
            showCorrectAnswers: false,
            allowReview: true,
            randomizeChoices: true,
        },
        questionSections: [
            {
                id: 'section-1',
                title: 'Section 1',
                description: 'Answer all items in this section.',
                orderIndex: 0,
                isCollapsed: false,
            },
        ],
        questions: [],
        status: 'draft',
        ...overrides,
    } as ProctorExam;
}

function createQuestion(id: string): ExamQuestion {
    return {
        id,
        examId: 'exam-1',
        type: 'MULTIPLE_CHOICE',
        difficulty: 'EASY',
        points: 1,
        orderIndex: 0,
        sectionId: 'section-1',
        tags: [],
        content: {
            question: 'What is 2 + 2?',
            options: [
                { id: 'a', text: '3', isCorrect: false },
                { id: 'b', text: '4', isCorrect: true },
            ],
        },
    } as unknown as ExamQuestion;
}

describe('useExamStore', () => {
    beforeEach(() => {
        useExamStore.setState(useExamStore.getInitialState(), true);
    });

    it('starts from shared global default passing score and duration', () => {
        expect(useExamStore.getState().passingScore).toBe(
            DEFAULT_EXAMINATION_GLOBAL_SETTINGS.defaultPassingScore,
        );
        expect(useExamStore.getState().durationMinutes).toBe(
            DEFAULT_EXAMINATION_GLOBAL_SETTINGS.defaultDurationMinutes,
        );
    });

    it('preserves unsaved imported questions when the same exam workspace rehydrates', () => {
        const initialExam = createExam();
        const importedQuestion = createQuestion('local-imported-question');

        useExamStore.getState().hydrateExam(initialExam);
        useExamStore.getState().addQuestion(importedQuestion);
        useExamStore.getState().hydrateExam(
            createExam({
                questions: [],
            }),
        );

        expect(useExamStore.getState().questions).toHaveLength(1);
        expect(useExamStore.getState().questions[0]?.id).toBe('local-imported-question');
    });

    it('replaces questions when hydrating a different exam', () => {
        useExamStore.getState().hydrateExam(createExam());
        useExamStore.getState().addQuestion(createQuestion('local-imported-question'));
        useExamStore.getState().hydrateExam(
            createExam({
                id: 'exam-2',
                questions: [createQuestion('server-question')],
            }),
        );

        expect(useExamStore.getState().examId).toBe('exam-2');
        expect(useExamStore.getState().questions).toHaveLength(1);
        expect(useExamStore.getState().questions[0]?.id).toBe('server-question');
    });

    it('hydrates section descriptions from the exam workspace', () => {
        useExamStore.getState().hydrateExam(createExam());

        expect(useExamStore.getState().questionSections[0]?.description).toBe(
            'Answer all items in this section.',
        );
    });

    it('sends trimmed section descriptions in the builder save payload', () => {
        useExamStore.getState().hydrateExam(createExam());
        useExamStore
            .getState()
            .updateQuestionSection('section-1', { description: '  Use complete sentences.  ' });

        const payload = buildBuilderWorkspacePayload(useExamStore.getState());

        expect(payload.questionSections?.[0]).toMatchObject({
            title: 'Section 1',
            description: 'Use complete sentences.',
            orderIndex: 0,
        });
    });

    it('saves empty section descriptions as null', () => {
        useExamStore.getState().hydrateExam(createExam());
        useExamStore.getState().updateQuestionSection('section-1', { description: '   ' });

        const payload = buildBuilderWorkspacePayload(useExamStore.getState());

        expect(payload.questionSections?.[0]?.description).toBeNull();
    });

    it('preserves section descriptions when sections are reordered', () => {
        useExamStore.getState().hydrateExam(
            createExam({
                questionSections: [
                    {
                        id: 'section-1',
                        title: 'Section 1',
                        description: 'First section instructions.',
                        orderIndex: 0,
                    },
                    {
                        id: 'section-2',
                        title: 'Section 2',
                        description: 'Second section instructions.',
                        orderIndex: 1,
                    },
                ],
            }),
        );

        useExamStore.getState().reorderQuestionSections(0, 1);

        expect(
            useExamStore.getState().questionSections.map((section) => ({
                id: section.id,
                description: section.description,
            })),
        ).toEqual([
            {
                id: 'section-2',
                description: 'Second section instructions.',
            },
            {
                id: 'section-1',
                description: 'First section instructions.',
            },
        ]);
    });

    it('hydrates section questionType and description from the exam workspace', () => {
        useExamStore.getState().hydrateExam(
            createExam({
                questionSections: [
                    {
                        id: 'section-1',
                        title: 'Multiple Choice Part',
                        description:
                            'Read each question carefully. Choose the one best answer from the options provided.',
                        questionType: 'MULTIPLE_CHOICE',
                        orderIndex: 0,
                    } as any,
                ],
            }),
        );

        expect(useExamStore.getState().questionSections[0]?.questionType).toBe('MULTIPLE_CHOICE');
        expect(useExamStore.getState().questionSections[0]?.description).toBe(
            'Read each question carefully. Choose the one best answer from the options provided.',
        );
    });

    it('setting a section questionType updates questionType, title, and description atomically', () => {
        useExamStore.getState().hydrateExam(createExam());
        
        useExamStore.getState().updateQuestionSection('section-1', { questionType: 'MULTIPLE_CHOICE' });

        expect(useExamStore.getState().questionSections[0]?.questionType).toBe('MULTIPLE_CHOICE');
        expect(useExamStore.getState().questionSections[0]?.title).toBe('Multiple Choice');
        expect(useExamStore.getState().questionSections[0]?.description).toBe(
            'Read each question carefully. Choose the one best answer from the options provided.',
        );
    });
});
