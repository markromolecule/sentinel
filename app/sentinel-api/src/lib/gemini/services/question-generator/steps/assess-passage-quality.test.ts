import { describe, expect, it, vi } from 'vitest';
import { assessPassageQuality } from './assess-passage-quality';
import type { QuestionGeneratorLlmProvider } from '../types';
import type { GenerateQuestionPreviewConfig } from '@sentinel/shared';

describe('AssessPassageQualityStep', () => {
    const config: GenerateQuestionPreviewConfig = {
        target: 'QUESTION_COLLECTION',
        institutionId: '123',
        tags: [],
        isPublic: false,
        questionCount: 2,
    };

    it('short-circuits deterministic violations and runs critic on survivors', async () => {
        const slots = [
            {
                slotId: 'slot-1',
                type: 'MULTIPLE_CHOICE',
                question: {
                    content: {
                        prompt: 'What is capital of France?',
                        options: ['Paris', 'Berlin'],
                        correctAnswer: 'Paris',
                    },
                    // Leaky passage -> deterministic violation
                    passageContent: 'Paris is capital.',
                    sourceEvidence: 'Verbatim evidence.',
                },
            },
            {
                slotId: 'slot-2',
                type: 'MULTIPLE_CHOICE',
                question: {
                    content: {
                        prompt: 'What is 3+3?',
                        options: ['5', '6'],
                        correctAnswer: '6',
                    },
                    passageContent: 'A passage about arithmetic operations.',
                    sourceEvidence: 'Verbatim evidence.',
                },
            },
        ];

        const mockProvider: Partial<QuestionGeneratorLlmProvider> = {
            generateStructuredJson: vi.fn().mockResolvedValue({
                evaluations: [
                    {
                        slotId: 'slot-2',
                        leaksAnswer: false,
                        answerableFromPassage: true,
                        reasonCode: 'SAFE',
                        reason: 'Good passage.',
                    },
                ],
            }),
        };

        const result = await assessPassageQuality(
            slots,
            config,
            'gemini-model',
            mockProvider as QuestionGeneratorLlmProvider,
        );

        // slot-1 should fail deterministically
        expect(result.failedSlots).toHaveLength(1);
        expect(result.failedSlots[0].slotId).toBe('slot-1');
        expect(result.failedSlots[0].violations).toContain('ANSWER_EXACT_MATCH');

        // slot-2 should pass critic
        expect(result.passedSlots).toHaveLength(1);
        expect(result.passedSlots[0].slotId).toBe('slot-2');
        expect(mockProvider.generateStructuredJson).toHaveBeenCalledTimes(1);
    });

    it('fails closed when critic results are missing or malformed', async () => {
        const slots = [
            {
                slotId: 'slot-1',
                type: 'MULTIPLE_CHOICE',
                question: {
                    content: {
                        prompt: 'What is 3+3?',
                        options: ['5', '6'],
                        correctAnswer: '6',
                    },
                    passageContent: 'A passage about arithmetic operations.',
                    sourceEvidence: 'Verbatim.',
                },
            },
        ];

        const mockProvider: Partial<QuestionGeneratorLlmProvider> = {
            generateStructuredJson: vi.fn().mockResolvedValue({
                // missing evaluations field or empty array
                evaluations: [],
            }),
        };

        const result = await assessPassageQuality(
            slots,
            config,
            'gemini-model',
            mockProvider as QuestionGeneratorLlmProvider,
        );

        expect(result.failedSlots).toHaveLength(1);
        expect(result.failedSlots[0].violations).toContain('CRITIC_FAIL_CLOSED');
    });
});
