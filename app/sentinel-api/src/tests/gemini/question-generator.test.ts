import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GenerateQuestionPreviewConfig } from '@sentinel/shared';
import { buildResponseJsonSchema } from '../../lib/gemini/services/prompt-builder';
import { normalizeGeneratedQuestions } from '../../lib/gemini/services/question-normalizer';
import { QuestionGeneratorService } from '../../lib/gemini/services/question-generator';
import { GeminiProvider } from '../../lib/gemini/gemini.provider';

const baseConfig: GenerateQuestionPreviewConfig = {
    target: 'QUESTION_COLLECTION',
    institutionId: '33560732-ef36-4670-b20c-a718f31179a0',
    tags: [],
    isPublic: false,
    questionType: 'MULTIPLE_CHOICE',
    questionCount: 2,
};

const sourceDocuments = [
    {
        fileName: 'algebra.pdf',
        pageCount: 2,
        pages: [
            {
                fileName: 'algebra.pdf',
                pageNumber: 1,
                text: 'What is 2 + 2? The correct answer is 4. The Earth revolves around the Sun.',
            },
            {
                fileName: 'algebra.pdf',
                pageNumber: 2,
                text: 'Effectuation focuses on available means, affordable loss, and strategic partnerships.',
            },
        ],
    },
];

describe('Gemini question generator contracts', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('uploads PDFs to Gemini File API and attaches file data for generation', async () => {
        const uploadSpy = vi.spyOn(GeminiProvider, 'uploadFile').mockResolvedValue({
            name: 'files/lesson-123',
            uri: 'https://generativelanguage.googleapis.com/v1beta/files/lesson-123',
            mimeType: 'application/pdf',
            displayName: 'lesson.pdf',
        });
        const deleteSpy = vi.spyOn(GeminiProvider, 'deleteFile').mockResolvedValue(undefined);
        const generateSpy = vi
            .spyOn(GeminiProvider, 'generateStructuredJson')
            .mockImplementation(async (args) => {
                if (args.prompt.includes('Return the exact page count')) {
                    return {
                        documents: [
                            {
                                fileName: 'lesson.pdf',
                                pageCount: 8,
                            },
                        ],
                    };
                }

                return {
                    MULTIPLE_CHOICE: [
                        {
                            sourceFileName: 'lesson.pdf',
                            sourcePageNumber: 3,
                            sourceEvidence: 'The correct answer is 4.',
                            difficulty: 'MODERATE',
                            points: 1,
                            content: {
                                prompt: 'What is 2 + 2?',
                                options: ['3', '4', '5', '6'],
                                correctAnswer: '4',
                            },
                        },
                    ],
                };
            });

        const preview = await QuestionGeneratorService.generatePreviewFromPdf({
            files: [
                new File(['%PDF-1.7 fake lesson'], 'lesson.pdf', {
                    type: 'application/pdf',
                }),
            ],
            config: {
                ...baseConfig,
                questionCount: 1,
            },
        });

        expect(uploadSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                mimeType: 'application/pdf',
                displayName: 'lesson.pdf',
            }),
        );
        expect(generateSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                files: [
                    {
                        uri: 'https://generativelanguage.googleapis.com/v1beta/files/lesson-123',
                        mimeType: 'application/pdf',
                    },
                ],
            }),
        );
        expect(deleteSpy).toHaveBeenCalledWith('files/lesson-123');
        expect(preview.pageCount).toBe(8);
        expect(preview.questions[0]).toMatchObject({
            sourceOrigin: 'AI_PDF',
            sourceFileName: 'lesson.pdf',
            sourcePageNumber: 3,
        });
    });

    it('normalizes human-readable Gemini enums before parsing question inputs', () => {
        const result = normalizeGeneratedQuestions(
            [
                {
                    type: 'multiple choice',
                    sourceFileName: 'algebra.pdf',
                    sourcePageNumber: 1,
                    sourceEvidence: 'The correct answer is 4.',
                    difficulty: 'medium',
                    points: 2,
                    tags: [' algebra ', 'algebra', ''],
                    content: {
                        prompt: 'What is 2 + 2?',
                        options: ['3', '4', '5', '6'],
                        correctAnswer: '4',
                    },
                },
            ],
            baseConfig,
            sourceDocuments,
        );

        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            type: 'MULTIPLE_CHOICE',
            difficulty: 'MODERATE',
            points: 2,
            tags: ['algebra'],
        });
    });

    it('constrains Gemini response schema enums to internal values', () => {
        const mixedDifficultySchema = buildResponseJsonSchema(baseConfig) as any;
        const fixedDifficultySchema = buildResponseJsonSchema({
            ...baseConfig,
            difficulty: 'HARD',
        }) as any;

        expect(
            mixedDifficultySchema.properties.MULTIPLE_CHOICE.items.properties.difficulty.enum,
        ).toEqual(['EASY', 'MODERATE', 'HARD']);
        expect(
            fixedDifficultySchema.properties.MULTIPLE_CHOICE.items.properties.difficulty.enum,
        ).toEqual(['HARD']);
        expect(mixedDifficultySchema.properties.MULTIPLE_CHOICE.items.required).toContain(
            'sourcePageNumber',
        );
    });

    it('normalizes mixed question content aliases before validating', () => {
        const result = normalizeGeneratedQuestions(
            [
                {
                    type: 'TRUE_FALSE',
                    sourceFileName: 'algebra.pdf',
                    sourcePageNumber: 1,
                    sourceEvidence: 'The Earth revolves around the Sun.',
                    difficulty: 'moderate',
                    points: 1,
                    content: {
                        statement: 'The Earth revolves around the Sun.',
                        answer: 'true',
                    },
                },
            ],
            {
                ...baseConfig,
                questionType: undefined,
                questionTypeDistribution: [
                    {
                        type: 'TRUE_FALSE',
                        count: 1,
                    },
                ],
                questionCount: 1,
            },
            sourceDocuments,
        );

        expect(result[0]).toMatchObject({
            type: 'TRUE_FALSE',
            content: {
                prompt: 'The Earth revolves around the Sun.',
                correctAnswer: true,
            },
        });
    });

    it('keeps AI PDF attribution when evidence matches fuzzily after normalization', () => {
        const result = normalizeGeneratedQuestions(
            [
                {
                    type: 'MULTIPLE_CHOICE',
                    sourceFileName: 'algebra.pdf',
                    sourcePageNumber: 2,
                    sourceEvidence: 'available means and affordable loss',
                    difficulty: 'moderate',
                    points: 1,
                    content: {
                        prompt: 'Which principle is associated with effectuation?',
                        options: [
                            'Affordable loss',
                            'Net present value',
                            'Porter five forces',
                            'EOQ',
                        ],
                        correctAnswer: 'Affordable loss',
                    },
                },
            ],
            baseConfig,
            sourceDocuments,
        );

        expect(result[0]).toMatchObject({
            sourceOrigin: 'AI_PDF',
            sourceFileName: 'algebra.pdf',
            sourcePageNumber: 2,
        });
        expect(result[0].sourceEvidence).toContain('affordable loss');
    });

    it('matches source file names when Gemini changes PDF punctuation formatting', () => {
        const result = normalizeGeneratedQuestions(
            [
                {
                    type: 'MULTIPLE_CHOICE',
                    sourceFileName: 'Week 3 – Global Server OS Statistics.pdf',
                    sourcePageNumber: 1,
                    sourceEvidence: 'The correct answer is 4.',
                    difficulty: 'moderate',
                    points: 1,
                    content: {
                        prompt: 'What is 2 + 2?',
                        options: ['3', '4', '5', '6'],
                        correctAnswer: '4',
                    },
                },
            ],
            baseConfig,
            [
                {
                    fileName: 'Week 3 - Global Server OS Statistics.pdf',
                    pageCount: 1,
                    pages: [
                        {
                            fileName: 'Week 3 - Global Server OS Statistics.pdf',
                            pageNumber: 1,
                            text: 'What is 2 + 2? The correct answer is 4.',
                        },
                    ],
                },
            ],
        );

        expect(result[0]).toMatchObject({
            sourceOrigin: 'AI_PDF',
            sourceFileName: 'Week 3 - Global Server OS Statistics.pdf',
            sourcePageNumber: 1,
        });
    });

    it('corrects the page number when the cited page is wrong but the source matches elsewhere in the same PDF', () => {
        const result = normalizeGeneratedQuestions(
            [
                {
                    type: 'MULTIPLE_CHOICE',
                    sourceFileName: 'algebra.pdf',
                    sourcePageNumber: 1,
                    sourceEvidence: 'available means affordable loss strategic partnerships',
                    difficulty: 'moderate',
                    points: 1,
                    content: {
                        prompt: 'Which set of concepts is tied to effectuation?',
                        options: [
                            'Available means, affordable loss, strategic partnerships',
                            'Capital budgeting, depreciation, amortization',
                            'Elasticity, inflation, recession',
                            'Segmentation, targeting, positioning',
                        ],
                        correctAnswer: 'Available means, affordable loss, strategic partnerships',
                    },
                },
            ],
            baseConfig,
            sourceDocuments,
        );

        expect(result[0]).toMatchObject({
            sourceOrigin: 'AI_PDF',
            sourceFileName: 'algebra.pdf',
            sourcePageNumber: 2,
        });
    });

    it('normalizes multiple choice correct answer to match options exactly (ignoring case/whitespace)', () => {
        const result = normalizeGeneratedQuestions(
            [
                {
                    type: 'MULTIPLE_CHOICE',
                    sourceFileName: 'algebra.pdf',
                    sourcePageNumber: 1,
                    sourceEvidence: 'The correct answer is 4.',
                    difficulty: 'moderate',
                    points: 1,
                    content: {
                        prompt: 'What is 2 + 2?',
                        options: [' Option A: 4 ', 'Option B: 5'],
                        correctAnswer: 'option a: 4',
                    },
                },
            ],
            baseConfig,
            sourceDocuments,
        );

        expect(result[0].content).toMatchObject({
            options: ['Option A: 4', 'Option B: 5'],
            correctAnswer: 'Option A: 4',
        });
    });

    it('normalizes multiple response correct answers to match options exactly', () => {
        const result = normalizeGeneratedQuestions(
            [
                {
                    type: 'MULTIPLE_RESPONSE',
                    sourceFileName: 'algebra.pdf',
                    sourcePageNumber: 1,
                    sourceEvidence: 'The correct answer is 4.',
                    difficulty: 'moderate',
                    points: 1,
                    content: {
                        prompt: 'Select even numbers',
                        options: ['Two', 'Three', 'Four'],
                        correctAnswer: ['two', ' FOUR '],
                    },
                },
            ],
            {
                ...baseConfig,
                questionType: 'MULTIPLE_RESPONSE',
            },
            sourceDocuments,
        );

        expect(result[0].content).toMatchObject({
            options: ['Two', 'Three', 'Four'],
            correctAnswer: ['Two', 'Four'],
        });
    });

    it('handles multiple documents, using index-based, fuzzy-token, and first-document fallback matching', () => {
        const multiDocs = [
            {
                fileName: 'physics-lecture.pdf',
                pageCount: 3,
                pages: [],
            },
            {
                fileName: 'chemistry-notes.pdf',
                pageCount: 5,
                pages: [],
            },
        ];

        // 1. Index-based match
        const resultIndex = normalizeGeneratedQuestions(
            [
                {
                    type: 'MULTIPLE_CHOICE',
                    sourceFileName: 'input_file_1.pdf',
                    sourcePageNumber: 2,
                    sourceEvidence: 'Evidence content',
                    content: {
                        prompt: 'Question?',
                        options: ['A', 'B'],
                        correctAnswer: 'A',
                    },
                },
            ],
            baseConfig,
            multiDocs,
        );
        expect(resultIndex[0].sourceFileName).toBe('chemistry-notes.pdf');

        // 2. Fuzzy token match
        const resultFuzzy = normalizeGeneratedQuestions(
            [
                {
                    type: 'MULTIPLE_CHOICE',
                    sourceFileName: 'chemistry-study-guide',
                    sourcePageNumber: 2,
                    sourceEvidence: 'Evidence content',
                    content: {
                        prompt: 'Question?',
                        options: ['A', 'B'],
                        correctAnswer: 'A',
                    },
                },
            ],
            baseConfig,
            multiDocs,
        );
        expect(resultFuzzy[0].sourceFileName).toBe('chemistry-notes.pdf');

        // 3. Fallback to first document
        const resultFallback = normalizeGeneratedQuestions(
            [
                {
                    type: 'MULTIPLE_CHOICE',
                    sourceFileName: 'totally-hallucinated-name.pdf',
                    sourcePageNumber: 2,
                    sourceEvidence: 'Evidence content',
                    content: {
                        prompt: 'Question?',
                        options: ['A', 'B'],
                        correctAnswer: 'A',
                    },
                },
            ],
            baseConfig,
            multiDocs,
        );
        expect(resultFallback[0].sourceFileName).toBe('physics-lecture.pdf');
    });
});
