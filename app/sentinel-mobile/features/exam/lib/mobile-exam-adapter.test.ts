import { describe, it, expect } from 'vitest';
import {
    adaptExamQuestionsForMobile,
    buildSessionAnswerPayload,
} from './mobile-exam-adapter';
import type { Exam } from '@sentinel/shared/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeExam(questions: Exam['questions']): Exam {
    return {
        id: 'exam-1',
        title: 'Test Exam',
        description: 'desc',
        duration: 60,
        passingScore: 50,
        status: 'available',
        questionCount: questions?.length ?? 0,
        questions,
    } as unknown as Exam;
}

function makeQuestion(
    type: string,
    content: Record<string, unknown>,
    overrides: Record<string, unknown> = {},
) {
    return {
        id: `q-${type.toLowerCase()}`,
        examId: 'exam-1',
        type,
        points: 1,
        orderIndex: 0,
        tags: [],
        content,
        ...overrides,
    };
}

// ─── adaptExamQuestionsForMobile ──────────────────────────────────────────────

describe('adaptExamQuestionsForMobile', () => {
    it('adapts MULTIPLE_CHOICE questions with lettered options', () => {
        const exam = makeExam([
            makeQuestion('MULTIPLE_CHOICE', {
                prompt: 'Pick one',
                options: ['Alpha', 'Beta', 'Gamma'],
                correctAnswer: 'Alpha',
            }),
        ] as any);

        const [q] = adaptExamQuestionsForMobile(exam);

        expect(q.type).toBe('MULTIPLE_CHOICE');
        expect(q.text).toBe('Pick one');
        expect(q.options).toEqual([
            { id: 'A', text: 'Alpha' },
            { id: 'B', text: 'Beta' },
            { id: 'C', text: 'Gamma' },
        ]);
        expect(q.passage).toBeNull();
    });

    it('adapts MULTIPLE_RESPONSE questions with lettered options', () => {
        const exam = makeExam([
            makeQuestion('MULTIPLE_RESPONSE', {
                prompt: 'Pick all correct',
                options: ['One', 'Two', 'Three'],
                correctAnswer: ['One', 'Three'],
            }),
        ] as any);

        const [q] = adaptExamQuestionsForMobile(exam);

        expect(q.type).toBe('MULTIPLE_RESPONSE');
        expect(q.options.map((o) => o.text)).toEqual(['One', 'Two', 'Three']);
    });

    it('adapts TRUE_FALSE questions with true/false options', () => {
        const exam = makeExam([
            makeQuestion('TRUE_FALSE', { prompt: 'Is the sky blue?', correctAnswer: true }),
        ] as any);

        const [q] = adaptExamQuestionsForMobile(exam);

        expect(q.type).toBe('TRUE_FALSE');
        expect(q.options).toEqual([
            { id: 'true', text: 'True' },
            { id: 'false', text: 'False' },
        ]);
    });

    it('adapts ESSAY questions with placeholder and maxLength from content', () => {
        const exam = makeExam([
            makeQuestion('ESSAY', { prompt: 'Write an essay', rubric: '', maxLength: 2000 }),
        ] as any);

        const [q] = adaptExamQuestionsForMobile(exam);

        expect(q.type).toBe('ESSAY');
        expect(q.options).toHaveLength(0);
        expect(q.placeholder).toBe('Write your response here…');
        expect(q.maxLength).toBe(2000);
    });

    it('falls back to default maxLength when ESSAY content has no maxLength', () => {
        const exam = makeExam([
            makeQuestion('ESSAY', { prompt: 'Explain' }),
        ] as any);

        const [q] = adaptExamQuestionsForMobile(exam);

        expect(q.maxLength).toBe(5000);
    });

    it('adapts IDENTIFICATION questions with placeholder', () => {
        const exam = makeExam([
            makeQuestion('IDENTIFICATION', {
                prompt: 'Name the element',
                acceptedAnswers: ['Oxygen'],
            }),
        ] as any);

        const [q] = adaptExamQuestionsForMobile(exam);

        expect(q.type).toBe('IDENTIFICATION');
        expect(q.options).toHaveLength(0);
        expect(q.placeholder).toBe('Enter your answer here…');
    });

    it('extracts passageContent from question record into passage field', () => {
        const exam = makeExam([
            makeQuestion(
                'MULTIPLE_CHOICE',
                {
                    prompt: 'Based on the passage…',
                    options: ['A', 'B'],
                    correctAnswer: 'A',
                },
                { passageContent: 'Once upon a time…', passageType: 'plain' },
            ),
        ] as any);

        const [q] = adaptExamQuestionsForMobile(exam);

        expect(q.passage).toBe('Once upon a time…');
    });

    it('extracts passage embedded in content object', () => {
        const exam = makeExam([
            makeQuestion('MULTIPLE_CHOICE', {
                prompt: 'Read and answer',
                options: ['Yes', 'No'],
                correctAnswer: 'Yes',
                passage: 'The quick brown fox…',
                passageTitle: 'Reading Section',
            }),
        ] as any);

        const [q] = adaptExamQuestionsForMobile(exam);

        expect(q.passage).toBe('The quick brown fox…');
        expect(q.passageTitle).toBe('Reading Section');
    });

    it('sorts questions by orderIndex', () => {
        const exam = makeExam([
            { ...makeQuestion('MULTIPLE_CHOICE', { prompt: 'Third', options: [], correctAnswer: '' }), orderIndex: 2, id: 'q-3' },
            { ...makeQuestion('MULTIPLE_CHOICE', { prompt: 'First', options: [], correctAnswer: '' }), orderIndex: 0, id: 'q-1' },
            { ...makeQuestion('MULTIPLE_CHOICE', { prompt: 'Second', options: [], correctAnswer: '' }), orderIndex: 1, id: 'q-2' },
        ] as any);

        const questions = adaptExamQuestionsForMobile(exam);

        expect(questions.map((q) => q.text)).toEqual(['First', 'Second', 'Third']);
    });

    it('adapts questions with object options', () => {
        const exam = makeExam([
            makeQuestion('MULTIPLE_CHOICE', {
                prompt: 'Select feature',
                options: [
                    { id: 'opt-1', text: 'Feature 1' },
                    { key: 'opt-2', label: 'Feature 2' },
                ],
            }),
        ] as any);

        const [q] = adaptExamQuestionsForMobile(exam);

        expect(q.options).toEqual([
            { id: 'opt-1', text: 'Feature 1' },
            { id: 'opt-2', text: 'Feature 2' },
        ]);
    });

    it('defensively extracts prompt from fallback property keys', () => {
        const exam1 = makeExam([
            makeQuestion('MULTIPLE_CHOICE', { question: 'Fallback Question Text', options: ['A'] }),
        ] as any);
        const [q1] = adaptExamQuestionsForMobile(exam1);
        expect(q1.text).toBe('Fallback Question Text');

        const exam2 = makeExam([
            makeQuestion('MULTIPLE_CHOICE', { text: 'Fallback Text Property', options: ['A'] }),
        ] as any);
        const [q2] = adaptExamQuestionsForMobile(exam2);
        expect(q2.text).toBe('Fallback Text Property');

        const exam3 = makeExam([
            makeQuestion('MULTIPLE_CHOICE', {}, { prompt: 'Top Level Prompt' }),
        ] as any);
        const [q3] = adaptExamQuestionsForMobile(exam3);
        expect(q3.text).toBe('Top Level Prompt');
    });

    it('safely parses stringified JSON content', () => {
        const exam = makeExam([
            makeQuestion('MULTIPLE_CHOICE', JSON.stringify({
                prompt: 'Parsed JSON prompt',
                options: ['Choice 1', 'Choice 2'],
            }) as any),
        ] as any);

        const [q] = adaptExamQuestionsForMobile(exam);
        expect(q.text).toBe('Parsed JSON prompt');
        expect(q.options).toHaveLength(2);
    });

    it('returns empty array when exam has no questions', () => {
        const exam = makeExam(undefined);
        expect(adaptExamQuestionsForMobile(exam)).toEqual([]);
    });
});

// ─── buildSessionAnswerPayload ─────────────────────────────────────────────────

describe('buildSessionAnswerPayload', () => {
    const mcQuestion = {
        id: 'q-mc',
        type: 'MULTIPLE_CHOICE' as const,
        options: [
            { id: 'A', text: 'Alpha' },
            { id: 'B', text: 'Beta' },
        ],
        text: '',
        points: 1,
        originalContent: {},
    } as any;

    const essayQuestion = {
        id: 'q-essay',
        type: 'ESSAY' as const,
        options: [],
        text: '',
        points: 2,
        originalContent: {},
    } as any;

    const multiSelectQuestion = {
        id: 'q-ms',
        type: 'MULTIPLE_RESPONSE' as const,
        options: [
            { id: 'A', text: 'One' },
            { id: 'B', text: 'Two' },
            { id: 'C', text: 'Three' },
        ],
        text: '',
        points: 1,
        originalContent: {},
    } as any;

    it('maps option ID to option text for single-select questions', () => {
        const payload = buildSessionAnswerPayload([mcQuestion], { 'q-mc': 'A' });
        expect(payload['q-mc']).toBe('Alpha');
    });

    it('omits questions with no answer selected', () => {
        const payload = buildSessionAnswerPayload([mcQuestion], {});
        expect('q-mc' in payload).toBe(false);
    });

    it('stores text verbatim for essay questions', () => {
        const payload = buildSessionAnswerPayload([essayQuestion], {
            'q-essay': 'My detailed answer.',
        });
        expect(payload['q-essay']).toBe('My detailed answer.');
    });

    it('serialises multi-select answers as JSON array of option texts', () => {
        const payload = buildSessionAnswerPayload([multiSelectQuestion], {
            'q-ms': ['A', 'C'],
        });
        expect(payload['q-ms']).toBe(JSON.stringify(['One', 'Three']));
    });

    it('stores true/false answer as the id string', () => {
        const tfQuestion = {
            id: 'q-tf',
            type: 'TRUE_FALSE' as const,
            options: [
                { id: 'true', text: 'True' },
                { id: 'false', text: 'False' },
            ],
            text: '',
            points: 1,
            originalContent: {},
        } as any;

        const payload = buildSessionAnswerPayload([tfQuestion], { 'q-tf': 'true' });
        expect(payload['q-tf']).toBe('true');
    });
});
