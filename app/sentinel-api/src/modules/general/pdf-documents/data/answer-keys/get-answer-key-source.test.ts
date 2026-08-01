import { describe, expect, it, vi } from 'vitest';
import { UnrecoverableError } from 'bullmq';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
    getAnswerKeySource,
    mapAnswerKeySourceToViewModel,
    normalizeAnswerKeyQuestion,
    normalizeAnswerKeyOptions,
    parseAnswerKeyQuestionContent,
} from './get-answer-key-source';

function buildExamLookupStub(examRow: any) {
    const whereMock = { executeTakeFirst: vi.fn().mockResolvedValue(examRow) };
    const selectMock = { where: () => whereMock };
    const joinInst = { select: () => selectMock };
    const joinSubj = { leftJoin: () => joinInst };
    return { leftJoin: () => joinSubj };
}

function buildQuestionLookupStub(rows: any[]) {
    const orderByMock = { execute: vi.fn().mockResolvedValue(rows) };
    const whereMock = { orderBy: () => orderByMock };
    const selectMock = { where: () => whereMock };
    const joinMock = { select: () => selectMock };
    return { leftJoin: () => joinMock };
}

const examRow = {
    exam_id: 'exam-123',
    title: 'Final Exam',
    duration_minutes: 120,
    difficulty: 'HARD',
    passing_score: 80,
    institution_id: 'inst-abc',
    subject_code: 'CS-101',
    subject_name: 'Computer Science',
    institution_name: 'Test University',
};

function questionRow(question_type: string, content: unknown, order_index = 1) {
    return {
        question_id: `q-${order_index}`,
        question_type,
        content: JSON.stringify(content),
        passage_content: order_index === 1 ? '<p>Stored passage</p>' : null,
        points: order_index,
        order_index,
    };
}

describe('answer-key source normalization helpers', () => {
    it('parses malformed JSON as empty content', () => {
        expect(parseAnswerKeyQuestionContent('{nope')).toEqual({});
    });

    it('builds stable option IDs and marks correct current string options', () => {
        const first = normalizeAnswerKeyOptions({
            prompt: 'Pick two',
            options: ['Alpha', 'Beta', 'Gamma'],
            correctAnswer: ['Alpha', 'Gamma'],
        });
        const second = normalizeAnswerKeyOptions({
            prompt: 'Pick two',
            options: ['Alpha', 'Beta', 'Gamma'],
            correctAnswer: ['Alpha', 'Gamma'],
        });

        expect(first).toEqual(second);
        expect(first).toEqual([
            { optionId: 'option-1', optionText: 'Alpha', isCorrect: true },
            { optionId: 'option-2', optionText: 'Beta', isCorrect: false },
            { optionId: 'option-3', optionText: 'Gamma', isCorrect: true },
        ]);
    });

    it('does not use Math.random for deterministic output identifiers', () => {
        const sourcePath = fileURLToPath(new URL('./get-answer-key-source.ts', import.meta.url));

        expect(readFileSync(sourcePath, 'utf8')).not.toContain('Math.random');
    });

    it('uses persisted passage_content and never substitutes source_evidence', () => {
        const question = normalizeAnswerKeyQuestion(
            {
                question_id: 'source-evidence-safety',
                question_type: 'MULTIPLE_CHOICE',
                content: {
                    prompt: 'Which sentence summarizes the passage?',
                    source_evidence: 'Do not render this extracted source evidence.',
                    options: ['Stored passage summary', 'Source evidence summary'],
                    correctAnswer: 'Stored passage summary',
                },
                passage_content: 'Render this persisted passage content.',
                points: 1,
            },
            0,
        );

        expect(question.passageText).toBe('Render this persisted passage content.');
        expect(question.passageText).not.toContain('extracted source evidence');
    });

    it('normalizes malformed and unsupported content to safe renderer defaults', () => {
        const malformedQuestion = normalizeAnswerKeyQuestion(
            {
                question_id: 'malformed',
                question_type: 'ALIEN_TYPE',
                content: '{this is not json',
                passage_content: null,
                points: null,
            },
            0,
        );

        expect(malformedQuestion).toMatchObject({
            questionId: 'malformed',
            type: 'MULTIPLE_CHOICE',
            points: 1,
            text: '',
            passageText: null,
        });
        expect(malformedQuestion.options).toBeUndefined();
    });

    it('keeps targeted legacy option compatibility', () => {
        const question = normalizeAnswerKeyQuestion(
            {
                question_id: 'legacy-mc',
                question_type: 'MULTIPLE_CHOICE',
                content: {
                    text: 'Legacy text',
                    options: [
                        { id: 'a', text: 'Old A', is_correct: false },
                        { id: 'b', text: 'Old B', is_correct: true },
                    ],
                },
                passage_content: null,
                points: 2,
            },
            0,
        );

        expect(question.text).toBe('Legacy text');
        expect(question.options).toEqual([
            { optionId: 'a', optionText: 'Old A', isCorrect: false },
            { optionId: 'b', optionText: 'Old B', isCorrect: true },
        ]);
    });

    it('keeps targeted legacy fill-blank and matching compatibility', () => {
        expect(
            normalizeAnswerKeyQuestion(
                {
                    question_id: 'legacy-fib',
                    question_type: 'FILL_BLANK',
                    content: { text: 'Legacy blank', blankAnswers: ['one'] },
                    passage_content: null,
                    points: 1,
                },
                0,
            ).blankAnswers,
        ).toEqual(['one']);

        expect(
            normalizeAnswerKeyQuestion(
                {
                    question_id: 'legacy-match',
                    question_type: 'MATCHING',
                    content: {
                        text: 'Legacy matching',
                        matchingPairs: [{ premise: 'Left', response: 'Right' }],
                    },
                    passage_content: null,
                    points: 1,
                },
                0,
            ).matchingPairs,
        ).toEqual([{ premise: 'Left', response: 'Right' }]);
    });
});

describe('getAnswerKeySource', () => {
    it('throws UnrecoverableError when exam is not found', async () => {
        const mockDb = {
            selectFrom: vi.fn().mockReturnValue(buildExamLookupStub(undefined)),
        } as any;

        await expect(getAnswerKeySource(mockDb, 'exam-uuid', 'inst-uuid')).rejects.toThrow(
            UnrecoverableError,
        );
    });

    it('throws UnrecoverableError when exam belongs to a different institution', async () => {
        const mockDb = {
            selectFrom: vi
                .fn()
                .mockReturnValue(
                    buildExamLookupStub({ ...examRow, institution_id: 'other-institution' }),
                ),
        } as any;

        await expect(getAnswerKeySource(mockDb, 'exam-uuid', 'inst-uuid')).rejects.toThrow(
            UnrecoverableError,
        );
    });

    it('maps current persisted shapes for all eight supported product question types', async () => {
        const rows = [
            questionRow(
                'MULTIPLE_CHOICE',
                {
                    prompt: 'What is 2+2?',
                    options: ['3', '4', '5'],
                    correctAnswer: '4',
                },
                1,
            ),
            questionRow(
                'MULTIPLE_RESPONSE',
                {
                    prompt: 'Select vowels.',
                    options: ['A', 'B', 'E'],
                    correctAnswer: ['A', 'E'],
                },
                2,
            ),
            questionRow('TRUE_FALSE', { prompt: 'The sky is blue.', correctAnswer: true }, 3),
            questionRow(
                'IDENTIFICATION',
                {
                    prompt: 'Name the capital.',
                    acceptedAnswers: ['Manila', 'City of Manila'],
                },
                4,
            ),
            questionRow(
                'ENUMERATION',
                {
                    prompt: 'List primary colors.',
                    acceptedAnswers: ['Red', 'Blue', 'Yellow'],
                },
                5,
            ),
            questionRow(
                'MATCHING',
                {
                    prompt: 'Match terms.',
                    pairs: [
                        { left: 'CPU', right: 'Processor' },
                        { left: 'RAM', right: 'Memory' },
                    ],
                },
                6,
            ),
            questionRow(
                'FILL_BLANK',
                {
                    prompt: 'The capital is ____.',
                    blanks: ['Manila'],
                },
                7,
            ),
            questionRow(
                'ESSAY',
                {
                    prompt: 'Explain dependency injection.',
                    rubric: 'Mention inversion of control and testability.',
                },
                8,
            ),
        ];

        const mockDb = {
            selectFrom: vi
                .fn()
                .mockReturnValueOnce(buildExamLookupStub(examRow))
                .mockReturnValueOnce(buildQuestionLookupStub(rows)),
        } as any;

        const result = await getAnswerKeySource(mockDb, 'exam-123', 'inst-abc');

        expect(result.questions.map((question) => question.type)).toEqual([
            'MULTIPLE_CHOICE',
            'MULTIPLE_SELECT',
            'TRUE_FALSE',
            'SHORT_ANSWER',
            'SHORT_ANSWER',
            'MATCHING',
            'FILL_IN_BLANK',
            'ESSAY',
        ]);
        expect(result.questions[0]).toMatchObject({
            text: 'What is 2+2?',
            passageText: '<p>Stored passage</p>',
            options: [
                { optionId: 'option-1', optionText: '3', isCorrect: false },
                { optionId: 'option-2', optionText: '4', isCorrect: true },
                { optionId: 'option-3', optionText: '5', isCorrect: false },
            ],
        });
        expect(result.questions[1].options?.filter((option) => option.isCorrect)).toHaveLength(2);
        expect(result.questions[2].trueFalseAnswer).toBe(true);
        expect(result.questions[3].shortAnswerPattern).toBe('Manila, City of Manila');
        expect(result.questions[4].shortAnswerPattern).toBe('Red\nBlue\nYellow');
        expect(result.questions[5].matchingPairs).toEqual([
            { premise: 'CPU', response: 'Processor' },
            { premise: 'RAM', response: 'Memory' },
        ]);
        expect(result.questions[6].blankAnswers).toEqual(['Manila']);
        expect(result.questions[7].rubric).toEqual([
            {
                criterion: 'Answer guidance',
                maxPoints: 0,
                description: 'Mention inversion of control and testability.',
            },
        ]);
    });
});

describe('mapAnswerKeySourceToViewModel', () => {
    it('maps AnswerKeySource to ExamAnswerKeyData view model', () => {
        const vm = mapAnswerKeySourceToViewModel(
            {
                examId: 'exam-1',
                institutionId: 'inst-1',
                examTitle: 'History Final',
                subjectCode: 'HIST-201',
                subjectName: 'World History',
                durationMinutes: 60,
                difficulty: 'MEDIUM',
                passingScore: 70,
                institutionName: 'History College',
                questions: [],
            },
            'Admin User',
        );

        expect(vm.examId).toBe('exam-1');
        expect(vm.title).toBe('History Final');
        expect(vm.subjectCode).toBe('HIST-201');
        expect(vm.institutionName).toBe('History College');
        expect(vm.generatedBy).toBe('Admin User');
        expect(vm.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('defaults generatedBy to Sentinel Support when not provided', () => {
        const vm = mapAnswerKeySourceToViewModel({
            examId: 'exam-2',
            institutionId: 'inst-2',
            examTitle: 'Quiz 1',
            subjectCode: 'GEN-101',
            subjectName: 'General',
            durationMinutes: 30,
            difficulty: 'EASY',
            passingScore: 50,
            institutionName: 'Test School',
            questions: [],
        });

        expect(vm.generatedBy).toBe('Sentinel Support');
    });
});
