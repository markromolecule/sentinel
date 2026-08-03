import { describe, expect, it } from 'vitest';
import { isBlockingPassageFailure } from './orchestrator';

describe('QuestionGeneratorService quality failure classification', () => {
    it('blocks deterministic passage violations', () => {
        expect(isBlockingPassageFailure({ violations: ['ANSWER_EXACT_MATCH'] })).toBe(true);
        expect(
            isBlockingPassageFailure({
                violations: ['TRUE_FALSE_PROPOSITION_RESTATED'],
            }),
        ).toBe(true);
    });

    it('treats subjective critic findings as non-blocking', () => {
        expect(isBlockingPassageFailure({ violations: ['UNANSWERABLE_PASSAGE'] })).toBe(false);
        expect(isBlockingPassageFailure({ violations: ['SEMANTIC_LEAK'] })).toBe(false);
        expect(isBlockingPassageFailure({ violations: ['CRITIC_FAIL_CLOSED'] })).toBe(false);
    });
});
