import { describe, expect, it } from 'vitest';
import {
    multipleChoiceContentSchema,
    multipleResponseContentSchema,
} from './question-content-schema';

describe('question-content-schema', () => {
    it('rejects duplicate multiple-choice options', () => {
        const result = multipleChoiceContentSchema.safeParse({
            prompt: 'Select the correct answer.',
            options: ['Alpha', 'alpha', 'Beta'],
            correctAnswer: 'Alpha',
        });

        expect(result.success).toBe(false);
        expect(result.error?.issues[0]?.message).toBe('Options must be unique.');
    });

    it('rejects duplicate multiple-response answer keys', () => {
        const result = multipleResponseContentSchema.safeParse({
            prompt: 'Select all correct answers.',
            options: ['One', 'Two', 'Three'],
            correctAnswer: ['One', 'one'],
        });

        expect(result.success).toBe(false);
        expect(result.error?.issues.some((issue) => issue.message === 'Correct answers must be unique.')).toBe(true);
    });
});
