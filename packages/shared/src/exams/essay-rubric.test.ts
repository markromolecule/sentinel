import { describe, expect, it } from 'vitest';
import { calculateEssayWeightedScore, ESSAY_RUBRIC_CRITERIA } from './essay-rubric';

describe('Essay Rubric Weighted Score Calculation', () => {
    it('calculates the maximum possible points if all criteria are 4', () => {
        const scores = {
            contentSubstance: 4,
            structureOrganization: 4,
            argumentationSupport: 4,
            styleTone: 4,
            grammarConventions: 4,
        };

        const maxPoints = 15;
        const result = calculateEssayWeightedScore(scores, maxPoints);
        expect(result).toBe(maxPoints);
    });

    it('calculates 0 if all criteria are 0', () => {
        const scores = {
            contentSubstance: 0,
            structureOrganization: 0,
            argumentationSupport: 0,
            styleTone: 0,
            grammarConventions: 0,
        };

        const maxPoints = 10;
        const result = calculateEssayWeightedScore(scores, maxPoints);
        expect(result).toBe(0);
    });

    it('calculates custom weighted scores and rounds to 2 decimal places', () => {
        // Content: 3 * 0.3 = 0.9
        // Structure: 2 * 0.2 = 0.4
        // Argumentation: 4 * 0.2 = 0.8
        // Style: 3 * 0.15 = 0.45
        // Grammar: 2 * 0.15 = 0.3
        // Total Weighted Sum = 0.9 + 0.4 + 0.8 + 0.45 + 0.3 = 2.85
        // Normalized = 2.85 / 4 = 0.7125
        // Scaled score for 10 max points = 7.125
        // Rounds to 7.13
        const scores = {
            contentSubstance: 3,
            structureOrganization: 2,
            argumentationSupport: 4,
            styleTone: 3,
            grammarConventions: 2,
        };

        const maxPoints = 10;
        const result = calculateEssayWeightedScore(scores, maxPoints);
        expect(result).toBe(7.13);
    });

    it('defaults missing criteria to 0', () => {
        // Content: 4 * 0.3 = 1.2
        // All others missing: 0
        // Total Weighted Sum = 1.2
        // Normalized = 1.2 / 4 = 0.3
        // Scaled score for 5 max points = 1.5
        const scores = {
            contentSubstance: 4,
        };

        const maxPoints = 5;
        const result = calculateEssayWeightedScore(scores, maxPoints);
        expect(result).toBe(1.5);
    });

    it('contains all 5 expected criteria keys and weights summing to 1', () => {
        expect(ESSAY_RUBRIC_CRITERIA).toHaveLength(5);
        const totalWeight = ESSAY_RUBRIC_CRITERIA.reduce((sum, c) => sum + c.weight, 0);
        expect(totalWeight).toBeCloseTo(1.0);
    });

    it('calculates score with custom rubric criteria', () => {
        const customRubric = {
            criteria: [
                {
                    key: 'creativity',
                    name: 'Creativity',
                    weight: 0.6,
                    description: 'Creative elements.',
                    levels: { 0: 'a', 1: 'b', 2: 'c', 3: 'd', 4: 'e' },
                },
                {
                    key: 'logic',
                    name: 'Logic',
                    weight: 0.4,
                    description: 'Logical arguments.',
                    levels: { 0: 'a', 1: 'b', 2: 'c', 3: 'd', 4: 'e' },
                },
            ],
        };

        const scores = { creativity: 3, logic: 4 };
        const result = calculateEssayWeightedScore(scores, 20, customRubric);
        expect(result).toBe(17);
    });

    it('ignores unknown score keys and uses 0 for missing rubric keys', () => {
        const customRubric = {
            criteria: [
                {
                    key: 'creativity',
                    name: 'Creativity',
                    weight: 1.0,
                    description: 'Creative elements.',
                    levels: { 0: 'a', 1: 'b', 2: 'c', 3: 'd', 4: 'e' },
                },
            ],
        };

        const scores = { unknownKey: 4 };
        const result = calculateEssayWeightedScore(scores, 10, customRubric);
        expect(result).toBe(0);
    });
});
