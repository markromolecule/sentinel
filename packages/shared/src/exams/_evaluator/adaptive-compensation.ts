/**
 * Adaptive content compensation for the essay rubric evaluation engine.
 *
 * Single-responsibility: this module applies a floor-lift to form-heavy criteria
 * (`grammarConventions`, `styleTone`) when content-quality signals are demonstrably
 * strong. This prevents a student with excellent ideas from being pre-scored unfairly
 * low due to surface-level grammar or stylistic inconsistencies.
 *
 * Rationale:
 *   An instructor reviewing a substantive, on-topic 150-word essay written by an
 *   ESL student would not assign a 1/4 for the overall pre-score simply because
 *   some sentences lack initial capitals. This module encodes that professional
 *   grading intuition into a deterministic rule.
 *
 * This compensation is applied AFTER per-criterion raw scores are computed and
 * BEFORE final feedback is generated. Instructors always retain the authority to
 * override individual slider values.
 */
import type { TextMetrics } from './text-metrics';

/** The criteria keys considered "form-heavy" — eligible for compensation floor-lift. */
const FORM_CRITERIA = ['grammarConventions', 'styleTone'] as const;

/**
 * Minimum guaranteed score for form criteria when content signals are strong.
 * Set to 2 ("Average quality, meets basic criteria") so that strong content
 * does not result in a sub-2 pre-score for surface-level form issues.
 */
const COMPENSATION_FLOOR = 2;

/**
 * Determines whether the answer demonstrates strong content quality signals
 * that justify floor-lifting form-heavy criteria scores.
 *
 * Thresholds:
 * - Word count ≥ 120 — enough length to demonstrate substantive engagement.
 * - Prompt overlap ≥ 0.12 — answer is at least loosely on-topic.
 * - OR vocab richness ≥ 0.40 — diverse vocabulary signals genuine effort even if
 *   prompt overlap is low (e.g., the student paraphrased the question).
 */
function hasStrongContentSignals(metrics: TextMetrics): boolean {
    return (
        metrics.wordCount >= 120 &&
        (metrics.promptOverlapRatio >= 0.12 || metrics.vocabRichness >= 0.40)
    );
}

/**
 * Applies a floor-lift to form-heavy criterion scores when content is strong.
 *
 * If the student's writing demonstrates strong content signals, any form criterion
 * that scored below {@link COMPENSATION_FLOOR} is raised to that floor.
 *
 * This does NOT lower scores — it only raises them. A form criterion that naturally
 * scored 3 or 4 is untouched.
 *
 * @param scores - The raw per-criterion scores computed by `evaluateCriterionScore`.
 * @param metrics - The text metrics snapshot for the same answer.
 * @returns A new scores record with compensation applied (original is not mutated).
 */
export function applyContentCompensation(
    scores: Record<string, number>,
    metrics: TextMetrics,
): Record<string, number> {
    if (!hasStrongContentSignals(metrics)) {
        return scores;
    }

    const lifted = { ...scores };
    for (const criterion of FORM_CRITERIA) {
        if (criterion in lifted && lifted[criterion] < COMPENSATION_FLOOR) {
            lifted[criterion] = COMPENSATION_FLOOR;
        }
    }
    return lifted;
}
