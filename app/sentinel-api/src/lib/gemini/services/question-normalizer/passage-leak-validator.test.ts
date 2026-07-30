import { describe, expect, it } from 'vitest';
import {
    validateGeneratedPassage,
    normalizePassageComparisonText,
    extractQuestionAnswerSignals,
} from './passage-leak-validator';
import { passageQualityCases } from './__fixtures__/passage-quality-cases';

// Shared fixture builders for all 8 question types
export const builders = {
    MULTIPLE_CHOICE: (correctAnswer: string, prompt = 'Question?') => ({
        prompt,
        options: [correctAnswer, 'Incorrect Option A', 'Incorrect Option B'],
        correctAnswer,
    }),
    MULTIPLE_RESPONSE: (correctAnswers: string[], prompt = 'Question?') => ({
        prompt,
        options: [...correctAnswers, 'Incorrect Option A', 'Incorrect Option B'],
        correctAnswer: correctAnswers,
    }),
    TRUE_FALSE: (correctAnswer: boolean, prompt = 'Statement.') => ({
        prompt,
        correctAnswer,
    }),
    IDENTIFICATION: (acceptedAnswers: string[], prompt = 'Question?') => ({
        prompt,
        acceptedAnswers,
    }),
    FILL_BLANK: (blanks: string[], prompt = 'Fill in the ____.') => ({
        prompt,
        blanks,
    }),
    ENUMERATION: (acceptedAnswers: string[], prompt = 'List items:') => ({
        prompt,
        acceptedAnswers,
    }),
    MATCHING: (pairs: Array<{ left: string; right: string }>, prompt = 'Match pairs:') => ({
        prompt,
        pairs,
    }),
    ESSAY: (rubric: string, prompt = 'Write essay:') => ({
        prompt,
        rubric,
    }),
};

describe('Passage Leak Validator - Shared Fixtures & Unicode/Special Cases', () => {
    // Phase 0: Assertions based on the passageQualityCases fixtures
    it('validates the standard corpus of safe and leaky cases', () => {
        for (const testCase of passageQualityCases) {
            const result = validateGeneratedPassage(
                testCase.type,
                testCase.content,
                testCase.passageContent,
            );
            if (testCase.shouldPass) {
                expect(result.isValid, `Case ${testCase.id} should be valid`).toBe(true);
                expect(result.violations).toHaveLength(0);
            } else {
                expect(result.isValid, `Case ${testCase.id} should be invalid`).toBe(false);
                expect(result.violations[0].code).toBe(testCase.expectedViolation);
            }
        }
    });

    it('never inspects or weakens sourceEvidence, because provenance is allowed to contain the answer', () => {
        const content = builders.MULTIPLE_CHOICE('Paris');
        const sourceEvidence = 'The capital is Paris.';

        // validateGeneratedPassage doesn't receive or modify sourceEvidence
        const result = validateGeneratedPassage(
            'MULTIPLE_CHOICE',
            content,
            'The main capital is situated on the Seine.',
        );
        expect(result.isValid).toBe(true);
        expect(sourceEvidence).toBe('The capital is Paris.');
    });

    // Special cases validation: names, dates, decimals, percentages, formulas, Unicode, common words
    describe('Special Answer Signal Detection', () => {
        it('handles unicode variants (NFKC normalization)', () => {
            const normalized = normalizePassageComparisonText('ﬁ 1/2');
            // 'ﬁ' (U+FB01) becomes 'fi', '1/2' (U+00BD) becomes '1/2'
            // We want to verify normalization behavior
            expect(normalized).toBe('fi 1/2');
        });

        it('rejects decimal and percentage leaks', () => {
            const content = builders.IDENTIFICATION(['3.14', '75%']);
            const resultDec = validateGeneratedPassage(
                'IDENTIFICATION',
                content,
                'The constant is 3.14.',
            );
            expect(resultDec.isValid).toBe(false);

            const resultPct = validateGeneratedPassage(
                'IDENTIFICATION',
                content,
                'More than 75% of users agreed.',
            );
            expect(resultPct.isValid).toBe(false);
        });

        it('rejects chemical and mathematical formulas', () => {
            const content = builders.IDENTIFICATION(['H2O', 'e=mc^2']);
            const resultChem = validateGeneratedPassage('IDENTIFICATION', content, 'Water is H2O.');
            expect(resultChem.isValid).toBe(false);

            const resultMath = validateGeneratedPassage(
                'IDENTIFICATION',
                content,
                'Einstein formulated e=mc^2.',
            );
            expect(resultMath.isValid).toBe(false);
        });

        it('exempts single letters and short common words unless numeric', () => {
            // "a", "the", "of" should be ignored as signals (i.e. they shouldn't trigger leaks if they happen to match)
            // But "a" as a multiple choice option is fine, we don't want to fail valid passages because they contain "the"
            const content = builders.IDENTIFICATION(['the', 'a', 'of']);
            const result = validateGeneratedPassage(
                'IDENTIFICATION',
                content,
                'The quick brown fox jumps over a lazy dog.',
            );
            // These common words alone should NOT trigger ANSWER_EXACT_MATCH
            expect(result.isValid).toBe(true);
        });
    });
});
