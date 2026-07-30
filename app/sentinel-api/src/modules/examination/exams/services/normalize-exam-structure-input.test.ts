import { describe, expect, it } from 'vitest';
import { HTTPException } from 'hono/http-exception';
import { normalizeExamStructureInput } from './normalize-exam-structure-input.service';

describe('normalizeExamStructureInput', () => {
    it('trims section descriptions and stores blank descriptions as null', () => {
        const result = normalizeExamStructureInput({
            examId: '11111111-1111-4111-8111-111111111111',
            questionSections: [
                {
                    id: '22222222-2222-4222-8222-222222222222',
                    title: 'Part I',
                    description: '  Read the scenario before answering.  ',
                    orderIndex: 0,
                },
                {
                    id: '33333333-3333-4333-8333-333333333333',
                    title: 'Part II',
                    description: '   ',
                    orderIndex: 1,
                },
            ],
            questions: [],
        });

        expect(result.normalizedSections).toMatchObject([
            {
                exam_section_id: '22222222-2222-4222-8222-222222222222',
                description: 'Read the scenario before answering.',
            },
            {
                exam_section_id: '33333333-3333-4333-8333-333333333333',
                description: null,
            },
        ]);
    });

    it('rejects question sets whose total score is not positive', () => {
        expect(() =>
            normalizeExamStructureInput({
                examId: '11111111-1111-4111-8111-111111111111',
                questionSections: [],
                questions: [
                    {
                        id: '44444444-4444-4444-8444-444444444444',
                        type: 'TRUE_FALSE',
                        points: 0,
                        content: {
                            prompt: 'The earth revolves around the sun.',
                            correctAnswer: true,
                        },
                    } as any,
                ],
            }),
        ).toThrowError(HTTPException);
    });

    describe('section-question type invariants', () => {
        it('allows typed section to contain questions of matching type', () => {
            const sectionId = '22222222-2222-4222-8222-222222222222';
            const result = normalizeExamStructureInput({
                examId: '11111111-1111-4111-8111-111111111111',
                questionSections: [
                    {
                        id: sectionId,
                        title: 'Multiple Choice Part',
                        orderIndex: 0,
                        questionType: 'MULTIPLE_CHOICE',
                    } as any,
                ],
                questions: [
                    {
                        id: '44444444-4444-4444-8444-444444444444',
                        sectionId: sectionId,
                        type: 'MULTIPLE_CHOICE',
                        points: 5,
                        orderIndex: 0,
                        content: {
                            prompt: 'Select A.',
                            options: ['A', 'B'],
                            correctAnswer: 'A',
                        },
                    } as any,
                ],
            });

            expect(result.normalizedSections[0]).toMatchObject({
                exam_section_id: sectionId,
                question_type: 'MULTIPLE_CHOICE',
            });
        });

        it('rejects typed section containing question of incompatible type', () => {
            const sectionId = '22222222-2222-4222-8222-222222222222';
            expect(() =>
                normalizeExamStructureInput({
                    examId: '11111111-1111-4111-8111-111111111111',
                    questionSections: [
                        {
                            id: sectionId,
                            title: 'Multiple Choice Part',
                            orderIndex: 0,
                            questionType: 'MULTIPLE_CHOICE',
                        } as any,
                    ],
                    questions: [
                        {
                            id: '44444444-4444-4444-8444-444444444444',
                            sectionId: sectionId,
                            type: 'TRUE_FALSE', // Incompatible type!
                            points: 5,
                            orderIndex: 0,
                            content: {
                                prompt: 'True or False?',
                                correctAnswer: true,
                            },
                        } as any,
                    ],
                }),
            ).toThrowError(HTTPException);
        });

        it('allows untyped legacy section to contain questions of mixed types', () => {
            const sectionId = '22222222-2222-4222-8222-222222222222';
            const result = normalizeExamStructureInput({
                examId: '11111111-1111-4111-8111-111111111111',
                questionSections: [
                    {
                        id: sectionId,
                        title: 'Mixed Legacy Part',
                        orderIndex: 0,
                        questionType: null, // Untyped legacy section
                    } as any,
                ],
                questions: [
                    {
                        id: '44444444-4444-4444-8444-444444444444',
                        sectionId: sectionId,
                        type: 'MULTIPLE_CHOICE',
                        points: 5,
                        orderIndex: 0,
                        content: {
                            prompt: 'Select A.',
                            options: ['A', 'B'],
                            correctAnswer: 'A',
                        },
                    } as any,
                    {
                        id: '55555555-5555-5555-8555-555555555555',
                        sectionId: sectionId,
                        type: 'TRUE_FALSE',
                        points: 5,
                        orderIndex: 1,
                        content: {
                            prompt: 'True or False?',
                            correctAnswer: true,
                        },
                    } as any,
                ],
            });

            expect(result.normalizedSections[0]).toMatchObject({
                exam_section_id: sectionId,
                question_type: null,
            });
        });
    });
});
