/**
 * Deterministic Essay Rubric Evaluation Engine — public API entry point.
 *
 * This module is a thin orchestrator. All evaluation logic is delegated to
 * focused single-responsibility modules inside `./_evaluator/`:
 *
 *   ┌─────────────────────────────────────────────────────────────────────┐
 *   │ essay-rubric-evaluator.ts (this file)                               │
 *   │  └─ extractTextMetrics()      → _evaluator/text-metrics.ts          │
 *   │  └─ evaluateCriterionScore()  → _evaluator/criterion-scorer.ts      │
 *   │  └─ applyContentCompensation()→ _evaluator/adaptive-compensation.ts │
 *   │  └─ buildFeedback()           → _evaluator/feedback-builder.ts      │
 *   └─────────────────────────────────────────────────────────────────────┘
 *
 * Public contract is 100% backward-compatible with all consumers:
 *  - `sentinel-api`: complete-session.scoring.ts
 *  - `sentinel-web`: use-grading-attempt/index.ts
 */
import { LEGACY_ESSAY_RUBRIC, type EssayRubricDefinition } from './essay-rubric';
import { extractTextMetrics } from './_evaluator/text-metrics';
import { evaluateCriterionScore } from './_evaluator/criterion-scorer';
import { applyContentCompensation } from './_evaluator/adaptive-compensation';
import { buildFeedback } from './_evaluator/feedback-builder';

export interface EssayEvaluationResult {
    scores: Record<string, number>;
    feedback: string;
}

/**
 * Deterministically evaluates a student's essay answer against an EssayRubricDefinition.
 *
 * Evaluation pipeline:
 *  1. Fast-path zero-scoring for empty or trivially short responses.
 *  2. Extract quantitative text metrics (word count, vocabulary richness, etc.).
 *  3. Cap scores at Level 1 for very short responses (15–30 words).
 *  4. Score each rubric criterion independently via domain heuristics.
 *  5. Apply adaptive content compensation: if content signals are strong,
 *     raise form-heavy criteria (grammar, style) to a minimum floor of 2.
 *     This ensures that ESL/EFL students or non-standard writers are not
 *     unfairly penalized for surface-level form when their ideas are substantive.
 *  6. Build a human-readable feedback string with per-criterion improvement hints.
 *
 * @param studentAnswer - The text response provided by the student.
 * @param prompt - The question prompt / instructions.
 * @param rubric - The active rubric definition (defaults to LEGACY_ESSAY_RUBRIC).
 * @returns An evaluation containing criteria scores (0–4) and explanatory feedback.
 */
export function evaluateEssayWithRubric(
    studentAnswer: string | null | undefined,
    prompt?: string | null,
    rubric?: EssayRubricDefinition,
): EssayEvaluationResult {
    const activeRubric = rubric ?? LEGACY_ESSAY_RUBRIC;
    const trimmed = (studentAnswer ?? '').trim();

    // ── Fast-path: empty response ────────────────────────────────────────────
    if (trimmed.length === 0) {
        const scores: Record<string, number> = {};
        for (const criterion of activeRubric.criteria) {
            scores[criterion.key] = 0;
        }
        return {
            scores,
            feedback: 'No substantive response submitted.',
        };
    }

    const metrics = extractTextMetrics(trimmed, prompt);

    // ── Fast-path: trivially short (<15 words) ───────────────────────────────
    if (metrics.wordCount < 15) {
        const scores: Record<string, number> = {};
        for (const criterion of activeRubric.criteria) {
            scores[criterion.key] = 0;
        }
        return {
            scores,
            feedback: `Response is insufficient in length (${metrics.wordCount} word${metrics.wordCount === 1 ? '' : 's'}; minimum 15 required for evaluation).`,
        };
    }

    // ── Score each criterion ─────────────────────────────────────────────────
    const isVeryShort = metrics.wordCount < 30;
    const rawScores: Record<string, number> = {};

    for (const criterion of activeRubric.criteria) {
        const calculated = evaluateCriterionScore(criterion.key, metrics);
        // Cap very short responses at Level 1 across all criteria
        rawScores[criterion.key] = isVeryShort ? Math.min(calculated, 1) : calculated;
    }

    // ── Apply adaptive content compensation ──────────────────────────────────
    // Lifts form-heavy criteria (grammarConventions, styleTone) to a floor of 2
    // when content signals indicate the student made a genuine substantive effort.
    const finalScores = applyContentCompensation(rawScores, metrics);

    // ── Build feedback ───────────────────────────────────────────────────────
    const criteriaKeys = activeRubric.criteria.map((c) => c.key);
    const feedback = buildFeedback(finalScores, metrics, criteriaKeys);

    return {
        scores: finalScores,
        feedback,
    };
}
