import { describe, expect, it } from 'vitest';
import { normalizeQuestionsStep } from './normalize-questions';
import type { GenerateQuestionPreviewConfig } from '@sentinel/shared';

describe('NormalizeQuestionsStep', () => {
    const config: GenerateQuestionPreviewConfig = {
        target: 'QUESTION_COLLECTION',
        institutionId: '123',
        tags: [],
        isPublic: false,
        questionCount: 2,
        questionType: 'MULTIPLE_CHOICE',
    };

    const sourceDocuments = [
        {
            fileName: 'algebra.pdf',
            pageCount: 2,
            pages: [
                {
                    fileName: 'algebra.pdf',
                    pageNumber: 1,
                    text: 'The correct answer is 4.',
                },
            ],
        },
    ];

    it('separates successful and failed questions during normalization', () => {
        const rawQuestions = [
            {
                type: 'MULTIPLE_CHOICE',
                sourceFileName: 'algebra.pdf',
                sourcePageNumber: 1,
                sourceEvidence: 'The correct answer is 4.',
                passageContent: 'This is a passage.',
                content: {
                    prompt: 'What is 2+2?',
                    options: ['3', '4'],
                    correctAnswer: '4',
                },
            },
            {
                // Missing passageContent -> should fail normalization
                type: 'MULTIPLE_CHOICE',
                sourceFileName: 'algebra.pdf',
                sourcePageNumber: 1,
                sourceEvidence: 'The correct answer is 4.',
                content: {
                    prompt: 'What is 2+2?',
                    options: ['3', '4'],
                    correctAnswer: '4',
                },
            } as any,
        ];

        const result = normalizeQuestionsStep(rawQuestions, config, sourceDocuments);

        expect(result.successful).toHaveLength(1);
        expect(result.successful[0].content.prompt).toBe('What is 2+2?');
        expect(result.failures).toHaveLength(1);
        expect(result.failures[0]).toMatchObject({
            index: 1,
            type: 'MULTIPLE_CHOICE',
        });
    });
});
