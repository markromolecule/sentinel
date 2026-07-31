import { describe, expect, it } from 'vitest';
import { updateGradingAttemptBodySchema } from './grading-schema';
import { essayRubricDefinitionSchema } from './essay-rubric-schema';

describe('updateGradingAttemptBodySchema', () => {
    it('validates successfully when evaluations are omitted', () => {
        const payload = {
            itemOverrides: {
                '4a542627-7091-44c5-b606-80f0b04439d8': {
                    awardedScore: 4,
                    reason: 'Accepted alternate reasoning.',
                },
            },
            finalize: true,
        };

        const result = updateGradingAttemptBodySchema.safeParse(payload);
        expect(result.success).toBe(true);
    });

    it('validates successfully when evaluations are provided with custom keys', () => {
        const payload = {
            evaluations: {
                '7813756c-b61f-4a25-b237-3e38250e9f8d': {
                    scores: {
                        creativity: 3,
                        logic: 4,
                        someOtherCustomKey: 2,
                    },
                    feedback: 'Good job!',
                },
            },
            finalize: true,
        };

        const result = updateGradingAttemptBodySchema.safeParse(payload);
        expect(result.success).toBe(true);
    });

    it('fails validation when score values are out of bounds', () => {
        const payload = {
            evaluations: {
                '7813756c-b61f-4a25-b237-3e38250e9f8d': {
                    scores: {
                        creativity: 5, // Invalid: max is 4
                    },
                },
            },
        };

        const result = updateGradingAttemptBodySchema.safeParse(payload);
        expect(result.success).toBe(false);
    });
});

describe('essayRubricDefinitionSchema', () => {
    const validLevels = {
        '0': 'Level 0 description',
        '1': 'Level 1 description',
        '2': 'Level 2 description',
        '3': 'Level 3 description',
        '4': 'Level 4 description',
    };

    it('validates successfully with correct parameters', () => {
        const validRubric = {
            criteria: [
                {
                    key: 'c1',
                    name: 'Crit 1',
                    weight: 0.5,
                    description: 'Desc 1',
                    levels: validLevels,
                },
                {
                    key: 'c2',
                    name: 'Crit 2',
                    weight: 0.5,
                    description: 'Desc 2',
                    levels: validLevels,
                },
            ],
        };

        const result = essayRubricDefinitionSchema.safeParse(validRubric);
        expect(result.success).toBe(true);
    });

    it('fails when criteria keys are duplicate', () => {
        const invalidRubric = {
            criteria: [
                {
                    key: 'c1',
                    name: 'Crit 1',
                    weight: 0.5,
                    description: 'Desc 1',
                    levels: validLevels,
                },
                {
                    key: 'c1', // Duplicate key
                    name: 'Crit 2',
                    weight: 0.5,
                    description: 'Desc 2',
                    levels: validLevels,
                },
            ],
        };

        const result = essayRubricDefinitionSchema.safeParse(invalidRubric);
        expect(result.success).toBe(false);
    });

    it('fails when weights do not total 1.0', () => {
        const invalidRubric = {
            criteria: [
                {
                    key: 'c1',
                    name: 'Crit 1',
                    weight: 0.4,
                    description: 'Desc 1',
                    levels: validLevels,
                },
                {
                    key: 'c2',
                    name: 'Crit 2',
                    weight: 0.4, // Total = 0.8
                    description: 'Desc 2',
                    levels: validLevels,
                },
            ],
        };

        const result = essayRubricDefinitionSchema.safeParse(invalidRubric);
        expect(result.success).toBe(false);
    });

    it('fails when levels do not define exactly keys 0..4', () => {
        const invalidRubric = {
            criteria: [
                {
                    key: 'c1',
                    name: 'Crit 1',
                    weight: 1.0,
                    description: 'Desc 1',
                    levels: {
                        '0': 'Zero',
                        '1': 'One',
                        '2': 'Two',
                        '3': 'Three',
                        // Missing '4'
                    },
                },
            ],
        };

        const result = essayRubricDefinitionSchema.safeParse(invalidRubric);
        expect(result.success).toBe(false);
    });

    it('fails when criteria count is 0', () => {
        const invalidRubric = {
            criteria: [],
        };

        const result = essayRubricDefinitionSchema.safeParse(invalidRubric);
        expect(result.success).toBe(false);
    });

    it('fails when criteria count exceeds 10', () => {
        const invalidRubric = {
            criteria: Array.from({ length: 11 }, (_, i) => ({
                key: `c${i}`,
                name: `Crit ${i}`,
                weight: 1 / 11,
                description: `Desc ${i}`,
                levels: validLevels,
            })),
        };

        const result = essayRubricDefinitionSchema.safeParse(invalidRubric);
        expect(result.success).toBe(false);
    });
});
