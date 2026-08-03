import { Schema } from '@sentinel/shared';
import { z } from 'zod';

export type GeneratedPassageViolationCode =
    | 'EMPTY_PASSAGE'
    | 'ANSWER_EXACT_MATCH'
    | 'ENUMERATION_LIST_REVEALED'
    | 'MATCHING_PAIR_REVEALED'
    | 'TRUE_FALSE_PROPOSITION_RESTATED';

export interface GeneratedPassageValidationResult {
    isValid: boolean;
    violations: Array<{
        code: GeneratedPassageViolationCode;
        message: string;
    }>;
}

const COMMON_WORDS = new Set([
    'the',
    'a',
    'an',
    'and',
    'or',
    'but',
    'is',
    'are',
    'was',
    'were',
    'to',
    'of',
    'in',
    'on',
    'at',
    'by',
    'for',
    'with',
    'about',
    'against',
    'between',
    'into',
    'through',
    'during',
    'before',
    'after',
    'above',
    'below',
    'from',
    'up',
    'down',
    'out',
    'off',
    'over',
    'under',
    'again',
    'further',
    'then',
    'once',
]);

/**
 * Normalizes passage or comparison text for robust leakage evaluation.
 * Converts unicode variants (NFKC), removes HTML tags, folds casing and punctuation,
 * and collapses whitespace.
 */
export function normalizePassageComparisonText(text: string): string {
    if (!text) return '';
    return text
        .normalize('NFKC')
        .replace(/<[^>]*>/g, '') // remove HTML tags
        .toLowerCase()
        .replace(/[\u2013\u2014]/g, '-') // fold dashes
        .replace(/[.,#!$%\^&\*;:{}=\-_`~()?"'’]/g, ' ') // fold punctuation to space
        .replace(/\s+/g, ' ') // collapse whitespace
        .trim();
}

/**
 * Checks if a normalized signal is structurally meaningful and should not be ignored.
 */
function isMeaningfulSignal(normSignal: string): boolean {
    if (!normSignal) return false;
    if (/\d/.test(normSignal)) return true; // numeric values (decimals, percentages, formulas) are always meaningful
    if (normSignal.length <= 1) return false; // single letters are ignored
    if (COMMON_WORDS.has(normSignal)) return false; // common function words are ignored
    return true;
}

/**
 * Escapes characters for regular expressions.
 */
function escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Checks if a whole-phrase or token match of normSignal exists in normPassage.
 */
function containsWholePhrase(normPassage: string, normSignal: string): boolean {
    const escaped = escapeRegExp(normSignal);
    const regex = new RegExp(`(^|\\s)${escaped}(\\s|$)`);
    return regex.test(normPassage);
}

/**
 * Segments passage text into sentence or line segments.
 */
function segmentPassage(text: string): string[] {
    if (!text) return [];
    return text
        .split(/[.!?\n]/)
        .map((s) => s.trim())
        .filter(Boolean);
}

/**
 * Extracts answer-key signals to evaluate leakage.
 */
export function extractQuestionAnswerSignals(
    type: z.infer<typeof Schema.questionTypeSchema>,
    content: any,
): string[] {
    if (!content) return [];
    const signals: string[] = [];

    switch (type) {
        case 'MULTIPLE_CHOICE': {
            if (content.correctAnswer) {
                signals.push(String(content.correctAnswer));
            }
            break;
        }
        case 'MULTIPLE_RESPONSE': {
            const answers = Array.isArray(content.correctAnswer)
                ? content.correctAnswer
                : [content.correctAnswer];
            signals.push(...answers.map(String));
            break;
        }
        case 'IDENTIFICATION':
        case 'ENUMERATION': {
            const answers = Array.isArray(content.acceptedAnswers)
                ? content.acceptedAnswers
                : [content.acceptedAnswers];
            signals.push(...answers.map(String));
            break;
        }
        case 'FILL_BLANK': {
            const blanks = Array.isArray(content.blanks) ? content.blanks : [content.blanks];
            signals.push(...blanks.map(String));
            break;
        }
    }

    return signals.map(normalizePassageComparisonText).filter(isMeaningfulSignal);
}

/**
 * Validates generated passage content for leakage.
 */
export function validateGeneratedPassage(
    type: z.infer<typeof Schema.questionTypeSchema>,
    content: any,
    passageContent: string,
): GeneratedPassageValidationResult {
    if (!passageContent || passageContent.trim() === '') {
        return {
            isValid: false,
            violations: [{ code: 'EMPTY_PASSAGE', message: 'Passage content is empty' }],
        };
    }

    const normPassage = normalizePassageComparisonText(passageContent);
    const violations: GeneratedPassageValidationResult['violations'] = [];

    // 1. Exact Answer Signal matching for MC, MR, Identification, Fill in the Blank, Enumeration
    if (
        type === 'MULTIPLE_CHOICE' ||
        type === 'MULTIPLE_RESPONSE' ||
        type === 'IDENTIFICATION' ||
        type === 'FILL_BLANK' ||
        type === 'ENUMERATION'
    ) {
        const signals = extractQuestionAnswerSignals(type, content);
        for (const signal of signals) {
            if (containsWholePhrase(normPassage, signal)) {
                violations.push({
                    code:
                        type === 'ENUMERATION' ? 'ENUMERATION_LIST_REVEALED' : 'ANSWER_EXACT_MATCH',
                    message: `Answer signal "${signal}" is leaked in the passage content.`,
                });
                break;
            }
        }
    }

    // 2. Matching pairs matching (both left and right in the same segment)
    if (type === 'MATCHING') {
        const pairs = Array.isArray(content?.pairs) ? content.pairs : [];
        const segments = segmentPassage(passageContent);

        for (const pair of pairs) {
            const left = normalizePassageComparisonText(pair.left);
            const right = normalizePassageComparisonText(pair.right);

            if (isMeaningfulSignal(left) && isMeaningfulSignal(right)) {
                for (const segment of segments) {
                    const normSegment = normalizePassageComparisonText(segment);
                    if (
                        containsWholePhrase(normSegment, left) &&
                        containsWholePhrase(normSegment, right)
                    ) {
                        violations.push({
                            code: 'MATCHING_PAIR_REVEALED',
                            message: `Matching pair ("${pair.left}" - "${pair.right}") is revealed in the same passage segment: "${segment}".`,
                        });
                        break;
                    }
                }
            }
            if (violations.length > 0) break;
        }
    }

    // 3. True/False proposition restatement
    if (type === 'TRUE_FALSE') {
        const prompt = content?.prompt;
        if (prompt) {
            const normPrompt = normalizePassageComparisonText(prompt);
            const segments = segmentPassage(passageContent);

            for (const segment of segments) {
                const normSegment = normalizePassageComparisonText(segment);

                if (normSegment.includes(normPrompt)) {
                    violations.push({
                        code: 'TRUE_FALSE_PROPOSITION_RESTATED',
                        message: `True/false proposition is restated in passage segment: "${segment}".`,
                    });
                    break;
                }
            }
        }
    }

    return {
        isValid: violations.length === 0,
        violations,
    };
}
