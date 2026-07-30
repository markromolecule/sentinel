import { describe, expect, it } from 'vitest';
import { reconcileQuestionSlots } from './reconcile-question-slots';
import type { GenerateQuestionPreviewConfig } from '@sentinel/shared';

describe('ReconcileQuestionSlots', () => {
    const config: GenerateQuestionPreviewConfig = {
        target: 'QUESTION_COLLECTION',
        institutionId: '123',
        tags: [],
        isPublic: false,
        questionCount: 3,
        questionTypeDistribution: [
            { type: 'MULTIPLE_CHOICE', count: 2 },
            { type: 'TRUE_FALSE', count: 1 },
        ],
    };

    it('matches questions in order of distribution slots', () => {
        const questions = [
            { type: 'MULTIPLE_CHOICE', prompt: 'MC 1' },
            { type: 'TRUE_FALSE', prompt: 'TF 1' },
            { type: 'MULTIPLE_CHOICE', prompt: 'MC 2' },
        ];

        const result = reconcileQuestionSlots(questions, config);

        expect(result.slots).toHaveLength(3);
        expect(result.slots[0]).toMatchObject({
            slotId: 'slot-0',
            type: 'MULTIPLE_CHOICE',
            question: { prompt: 'MC 1' },
        });
        expect(result.slots[1]).toMatchObject({
            slotId: 'slot-1',
            type: 'MULTIPLE_CHOICE',
            question: { prompt: 'MC 2' },
        });
        expect(result.slots[2]).toMatchObject({
            slotId: 'slot-2',
            type: 'TRUE_FALSE',
            question: { prompt: 'TF 1' },
        });
        expect(result.deficits).toHaveLength(0);
        expect(result.excess).toHaveLength(0);
    });

    it('handles deficits when some types are missing', () => {
        const questions = [{ type: 'MULTIPLE_CHOICE', prompt: 'MC 1' }];

        const result = reconcileQuestionSlots(questions, config);

        expect(result.slots).toHaveLength(3);
        expect(result.slots[0].question).not.toBeNull();
        expect(result.slots[1].question).toBeNull();
        expect(result.slots[2].question).toBeNull();
        expect(result.deficits).toEqual([
            { type: 'MULTIPLE_CHOICE', count: 1 },
            { type: 'TRUE_FALSE', count: 1 },
        ]);
        expect(result.excess).toHaveLength(0);
    });

    it('handles excess questions', () => {
        const questions = [
            { type: 'MULTIPLE_CHOICE', prompt: 'MC 1' },
            { type: 'MULTIPLE_CHOICE', prompt: 'MC 2' },
            { type: 'TRUE_FALSE', prompt: 'TF 1' },
            { type: 'MULTIPLE_CHOICE', prompt: 'MC Excess' },
        ];

        const result = reconcileQuestionSlots(questions, config);

        expect(result.slots).toHaveLength(3);
        expect(result.deficits).toHaveLength(0);
        expect(result.excess).toHaveLength(1);
        expect(result.excess[0].prompt).toBe('MC Excess');
    });
});
