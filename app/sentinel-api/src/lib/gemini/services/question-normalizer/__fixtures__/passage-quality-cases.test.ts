import { describe, expect, it } from 'vitest';
import { passageQualityCases } from './passage-quality-cases';
import { validateGeneratedPassage } from '../passage-leak-validator';

describe('Passage Quality Test Cases', () => {
    passageQualityCases.forEach((testCase) => {
        it(`case ${testCase.id}: ${testCase.description}`, () => {
            const result = validateGeneratedPassage(
                testCase.type,
                testCase.content,
                testCase.passageContent,
            );

            expect(result.isValid).toBe(testCase.shouldPass);
            if (!testCase.shouldPass && testCase.expectedViolation) {
                const violationCodes = result.violations.map((v) => v.code);
                expect(violationCodes).toContain(testCase.expectedViolation);
            }
        });
    });
});
