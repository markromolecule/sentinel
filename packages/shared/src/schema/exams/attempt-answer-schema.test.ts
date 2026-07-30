import { describe, expect, it } from 'vitest';
import { examAttemptAnswersSchema } from './attempt-answer-schema';

describe('examAttemptAnswersSchema', () => {
    it('accepts tokenized and legacy attempt answer shapes', () => {
        expect(
            examAttemptAnswersSchema.parse({
                mc: 'tok-c',
                mcLegacy: 2,
                tf: true,
                mrTokens: ['mr-a', 'mr-c'],
                mrLegacy: [0, 2],
                matching: {
                    leftA: 'right-1',
                    leftB: 'right-2',
                },
                cleared: null,
            }),
        ).toEqual({
            mc: 'tok-c',
            mcLegacy: 2,
            tf: true,
            mrTokens: ['mr-a', 'mr-c'],
            mrLegacy: [0, 2],
            matching: {
                leftA: 'right-1',
                leftB: 'right-2',
            },
            cleared: null,
        });
    });

    it('rejects unsupported mixed-type arrays', () => {
        expect(() =>
            examAttemptAnswersSchema.parse({
                invalid: ['tok-a', 2],
            }),
        ).toThrow();
    });
});
