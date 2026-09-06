/**
 * Per-criterion scoring logic for the essay rubric evaluation engine.
 *
 * Single-responsibility: this module maps a TextMetrics snapshot to a raw 0–4
 * score for each named rubric criterion. Thresholds here are deliberately more
 * tolerant than a naïve approach to accommodate non-native writers, short-sentence
 * styles, and minor grammar inconsistencies while still rewarding quality.
 *
 * ## New signals from extended patterns (patterns.ts)
 * - `academicVocabCount`  → boosts styleTone and contentSubstance for formal register
 * - `citationCount`       → boosts argumentationSupport for sourced claims
 * - `hedgingCount`        → boosts argumentationSupport for nuanced reasoning
 * - `fillerCount`         → penalizes contentSubstance for padding/repetition
 *
 * Adaptive note: form-heavy criteria (grammarConventions, styleTone) use softer
 * floors so that content quality is not overwhelmingly penalized by surface errors.
 * The `applyContentCompensation` module applies an additional floor lift when
 * content signals are demonstrably strong.
 */
import type { TextMetrics } from './text-metrics';

/**
 * Scores a single named rubric criterion on a 0–4 scale given a TextMetrics snapshot.
 *
 * @param criterionKey - The rubric criterion key to score.
 * @param metrics - The pre-computed text metrics snapshot.
 * @returns An integer score in [0, 4].
 */
export function evaluateCriterionScore(criterionKey: string, metrics: TextMetrics): number {
    switch (criterionKey) {

        // ─────────────────────────────────────────────────────────────────────
        // Content & Substance
        // Evaluates depth, relevance, and vocabulary breadth.
        // New: academicVocabCount boosts to L4 when content is already at L3.
        //      fillerCount penalizes padding (caps at L2 for high filler).
        // ─────────────────────────────────────────────────────────────────────
        case 'contentSubstance': {
            // Heavy filler detected — cap at L2 regardless of word count
            if (metrics.fillerCount >= 3) {
                return Math.min(rawContentScore(metrics), 2);
            }
            return rawContentScore(metrics);
        }

        // ─────────────────────────────────────────────────────────────────────
        // Structure & Organization
        // Evaluates paragraph structure and use of transitions.
        // ─────────────────────────────────────────────────────────────────────
        case 'structureOrganization': {
            // L4: Multi-paragraph with multiple transitions
            if (metrics.paragraphCount >= 3 && metrics.transitionCount >= 2) return 4;

            // L3: Some structural signals present
            if (metrics.paragraphCount >= 2 || metrics.transitionCount >= 1) return 3;

            // L2: At least has multiple sentences forming a cohesive response
            if (metrics.sentenceCount >= 3) return 2;

            // L1: Single sentence or no discernible structure
            return 1;
        }

        // ─────────────────────────────────────────────────────────────────────
        // Argumentation & Support
        // Evaluates use of evidence, examples, and reasoning links.
        // New: citationCount and hedgingCount contribute positively.
        //      Citations alone can unlock L3 for shorter essays.
        // ─────────────────────────────────────────────────────────────────────
        case 'argumentationSupport': {
            // Combined argumentation signal: evidence + citations + hedging
            const totalArgumentSignals = metrics.evidenceCount + metrics.citationCount + metrics.hedgingCount;

            // L4: Strong multi-signal argumentation with sufficient length
            if (
                (metrics.evidenceCount >= 3 || (metrics.evidenceCount >= 2 && metrics.citationCount >= 1)) &&
                metrics.wordCount >= 120
            ) return 4;

            // L3: Clear evidence/citation with adequate length, or rich hedging + evidence
            if (
                (metrics.evidenceCount >= 2 && metrics.wordCount >= 75) ||
                (metrics.citationCount >= 1 && metrics.evidenceCount >= 1) ||
                (totalArgumentSignals >= 4 && metrics.wordCount >= 80)
            ) return 3;

            // L2: Some evidence phrases or enough sentences to form an argument
            if (metrics.evidenceCount >= 1 || metrics.sentenceCount >= 4 || metrics.citationCount >= 1) return 2;

            // L1: No evidence phrases and very short
            return 1;
        }

        // ─────────────────────────────────────────────────────────────────────
        // Style & Tone
        // Evaluates formality and sentence construction.
        // New: academicVocabCount provides a path to L4 for essays with
        //      rich formal vocabulary even if sentence length is moderate.
        // Relaxed thresholds to accommodate non-native sentence styles.
        // ─────────────────────────────────────────────────────────────────────
        case 'styleTone': {
            // L4: Formal + no slang + (well-constructed sentences OR rich academic vocabulary)
            if (
                metrics.informalMarkerCount === 0 &&
                (
                    (metrics.avgWordsPerSentence >= 8 && metrics.vocabRichness >= 0.35) ||
                    (metrics.academicVocabCount >= 3 && metrics.vocabRichness >= 0.30)
                )
            ) return 4;

            // L3: Formal with no slang — short sentences are acceptable (non-native writers)
            //     OR some academic vocabulary signals formal intent
            if (
                (metrics.informalMarkerCount === 0 && metrics.avgWordsPerSentence >= 5) ||
                (metrics.informalMarkerCount === 0 && metrics.academicVocabCount >= 1)
            ) return 3;

            // L2: One informal marker slip with otherwise proper sentence structure
            if (metrics.informalMarkerCount <= 1 && metrics.sentenceCount >= 3) return 2;

            // L1: Multiple informal markers indicating consistently casual tone
            return 1;
        }

        // ─────────────────────────────────────────────────────────────────────
        // Grammar & Conventions
        // Evaluates capitalization, punctuation, and absence of slang.
        // Softer thresholds accommodate non-native writers.
        // ─────────────────────────────────────────────────────────────────────
        case 'grammarConventions': {
            // L4: Strong capitalization + terminal punctuation + no informal language
            if (
                metrics.capitalizationRatio >= 0.75 &&
                metrics.hasTerminalPunctuation &&
                metrics.informalMarkerCount === 0
            ) return 4;

            // L3: Decent capitalization OR properly ended with no slang
            if (
                metrics.capitalizationRatio >= 0.5 ||
                (metrics.capitalizationRatio >= 0.35 && metrics.hasTerminalPunctuation)
            ) return 3;

            // L2: Some conventions present — terminal punctuation or partial capitalization
            if (metrics.capitalizationRatio >= 0.2 || metrics.hasTerminalPunctuation) return 2;

            // L1: No detectable grammar conventions
            return 1;
        }

        // ─────────────────────────────────────────────────────────────────────
        // Generic fallback — custom rubric criteria not explicitly handled.
        // Uses content-volume + academic signals as a composite proxy.
        // ─────────────────────────────────────────────────────────────────────
        default: {
            const bonus = (metrics.academicVocabCount ?? 0) >= 2 ? 1 : 0;
            if (metrics.wordCount >= 150 && metrics.vocabRichness >= 0.38) return Math.min(4, 4 + bonus);
            if (metrics.wordCount >= 80) return Math.min(4, 3 + bonus);
            if (metrics.wordCount >= 30) return 2;
            return 1;
        }
    }
}

// ─── Private helpers ──────────────────────────────────────────────────────────

/**
 * Computes the raw contentSubstance score before filler penalty.
 * Extracted to avoid code duplication with the filler-cap branch.
 */
function rawContentScore(metrics: TextMetrics): number {
    // L4: Extensive content, on-topic, rich vocabulary OR boosted by academic vocab
    if (
        metrics.wordCount >= 200 &&
        metrics.promptOverlapRatio >= 0.20 &&
        (metrics.vocabRichness >= 0.38 || metrics.academicVocabCount >= 2)
    ) return 4;

    // L3: Solid content with reasonable relevance — academic vocab can compensate for lower overlap
    if (
        (metrics.wordCount >= 110 && metrics.promptOverlapRatio >= 0.12) ||
        (metrics.wordCount >= 120 && metrics.academicVocabCount >= 3)
    ) return 3;

    // L2: Basic response with enough words to show effort
    if (metrics.wordCount >= 50) return 2;

    // L1: Minimal content
    return 1;
}
