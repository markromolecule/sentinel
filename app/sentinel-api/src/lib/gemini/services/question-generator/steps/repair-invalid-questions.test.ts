import { describe, expect, it, vi } from 'vitest';
import { repairInvalidQuestions } from './repair-invalid-questions';
import type { QuestionGeneratorLlmProvider } from '../types';
import type { GenerateQuestionPreviewConfig } from '@sentinel/shared';

describe('RepairInvalidQuestionsStep', () => {
    const config: GenerateQuestionPreviewConfig = {
        target: 'QUESTION_COLLECTION',
        institutionId: '123',
        tags: [],
        isPublic: false,
        questionCount: 1,
    };

    it('queries LLM for replacements for failed slots', async () => {
        const failedSlots = [
            {
                slotId: 'slot-1',
                type: 'MULTIPLE_CHOICE',
                question: {
                    content: {
                        prompt: 'What is 3+3?',
                        options: ['5', '6'],
                        correctAnswer: '6',
                    },
                    passageContent: 'Leaks answer 6.',
                    sourceEvidence: 'Evidence.',
                },
                violations: ['ANSWER_EXACT_MATCH'],
                reasons: ['Leaks answer.'],
            },
        ];

        const mockProvider: Partial<QuestionGeneratorLlmProvider> = {
            generateStructuredJson: vi.fn().mockResolvedValue({
                sourceFileName: 'algebra.pdf',
                sourcePageNumber: 1,
                sourceEvidence: 'Verbatim evidence.',
                passageContent: 'Repaired passage content.',
                difficulty: 'MODERATE',
                points: 1,
                content: {
                    prompt: 'What is 3+3?',
                    options: ['5', '6'],
                    correctAnswer: '6',
                },
            }),
        };

        const result = await repairInvalidQuestions({
            failedSlots,
            config,
            files: [new File([], 'algebra.pdf')],
            uploadedFiles: [{ name: 'file1', uri: 'uri1', mimeType: 'pdf' }],
            model: 'gemini-model',
            provider: mockProvider as QuestionGeneratorLlmProvider,
        });

        expect(result).toHaveLength(1);
        expect(result[0].slotId).toBe('slot-1');
        expect(result[0].rawQuestion).not.toBeNull();
        expect(result[0].rawQuestion?.passageContent).toBe('Repaired passage content.');
        expect(result[0].rawQuestion?.type).toBe('MULTIPLE_CHOICE');
    });
});
