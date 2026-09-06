/**
 * Feedback construction for the essay rubric evaluation engine.
 *
 * Single-responsibility: this module converts final criterion scores and text metrics
 * into a human-readable feedback string. It produces:
 *   1. An aggregate tone sentence reflecting overall quality.
 *   2. Per-criterion hint lines highlighting specific areas for improvement.
 *   3. A metadata footer with word count and paragraph count.
 *
 * The resulting feedback is stored in `exam_attempts.answer_snapshot._evaluations`
 * and surfaced in the instructor grading workspace as an initial pre-scoring note.
 * Instructors are always free to rewrite this feedback before submitting grades.
 */
import type { TextMetrics } from './text-metrics';

// ─── Aggregate tone sentences ────────────────────────────────────────────────

const TONE_EXCEPTIONAL =
    'Exceptional response demonstrating comprehensive depth, structured organization, and formal academic tone.';
const TONE_GOOD =
    'Good response meeting core rubric requirements with clear reasoning and solid structure.';
const TONE_ADEQUATE =
    'Adequate response — would benefit from further elaboration, clearer transitions, and additional supporting details.';
const TONE_DEVELOPING =
    'Developing response. Expand content detail, organize into distinct paragraphs, and support key claims with evidence.';

// ─── Per-criterion hint map ──────────────────────────────────────────────────

type CriterionHints = {
    [key: string]: (score: number, metrics: TextMetrics) => string | null;
};

/**
 * Returns a specific actionable hint for a criterion based on its score,
 * or null if no special hint is needed (score is high enough).
 */
const CRITERION_HINTS: CriterionHints = {
    contentSubstance: (score, metrics) => {
        // Positive signals: academic vocabulary detected
        if (score >= 4 && metrics.academicVocabCount >= 3)
            return 'Content: Excellent use of academic vocabulary demonstrates strong subject mastery.';
        if (score >= 3) return null;
        // Negative signals: excessive filler detected
        if (metrics.fillerCount >= 3)
            return 'Content: Avoid repetitive or padding phrases — focus on developing original ideas instead.';
        if (metrics.wordCount < 80)
            return 'Content: Expand your response — aim for at least 120 words to demonstrate depth.';
        if (metrics.promptOverlapRatio < 0.12)
            return 'Content: Ensure your answer directly addresses the prompt question.';
        return 'Content: Add more detail and analysis to strengthen your response.';
    },

    structureOrganization: (score, metrics) => {
        if (score >= 3) return null;
        if (metrics.paragraphCount < 2)
            return 'Structure: Organize your ideas into separate paragraphs for clarity.';
        if (metrics.transitionCount === 0)
            return 'Structure: Use transitional phrases (e.g., "furthermore", "however", "in conclusion") to connect ideas.';
        return null;
    },

    argumentationSupport: (score, metrics) => {
        // Positive: citations detected
        if (score >= 4 && metrics.citationCount >= 1)
            return 'Argumentation: Strong use of source attribution shows scholarly engagement.';
        if (score >= 3) return null;
        if (metrics.evidenceCount === 0 && metrics.citationCount === 0)
            return 'Argumentation: Support your claims with examples, evidence, or reasoning ("for example", "because", "according to").';
        if (metrics.evidenceCount >= 1 && metrics.hedgingCount === 0)
            return 'Argumentation: Consider nuancing your claims with epistemic language (e.g., "it can be argued", "evidence suggests").';
        return 'Argumentation: Strengthen your argument with additional evidence or cited sources.';
    },

    styleTone: (score, metrics) => {
        // Positive: academic vocabulary + formal tone
        if (score >= 4 && metrics.academicVocabCount >= 2)
            return null; // high score + academic vocab — no hint needed
        if (score >= 3) return null;
        if (metrics.informalMarkerCount > 0)
            return 'Style: Avoid informal language — use formal academic vocabulary throughout.';
        if (metrics.academicVocabCount === 0)
            return 'Style: Consider using more formal academic vocabulary (e.g., "analyze", "demonstrate", "significant").';
        if (metrics.avgWordsPerSentence < 5)
            return 'Style: Try to develop sentences more fully to improve clarity and flow.';
        return null;
    },

    grammarConventions: (score, metrics) => {
        if (score >= 3) return null;
        const hints: string[] = [];
        if (metrics.capitalizationRatio < 0.6)
            hints.push('begin each sentence with a capital letter');
        if (!metrics.hasTerminalPunctuation)
            hints.push('end your response with proper punctuation');
        if (metrics.informalMarkerCount > 0)
            hints.push('avoid informal abbreviations or slang');
        if (hints.length === 0) return null;
        return `Grammar: Minor conventions to improve — ${hints.join('; ')}.`;
    },
};

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Constructs a human-readable feedback string from the final evaluated scores
 * and source text metrics.
 *
 * @param scores - The final (post-compensation) criterion scores.
 * @param metrics - The text metrics snapshot.
 * @param criteriaKeys - The ordered list of criterion keys to include hints for.
 * @returns A multi-sentence feedback string for display in the grading workspace.
 */
export function buildFeedback(
    scores: Record<string, number>,
    metrics: TextMetrics,
    criteriaKeys: string[],
): string {
    const avgScore =
        Object.values(scores).reduce((sum, s) => sum + s, 0) / Math.max(criteriaKeys.length, 1);

    // Aggregate tone
    let tone: string;
    if (avgScore >= 3.5) {
        tone = TONE_EXCEPTIONAL;
    } else if (avgScore >= 2.8) {
        tone = TONE_GOOD;
    } else if (avgScore >= 1.8) {
        tone = TONE_ADEQUATE;
    } else {
        tone = TONE_DEVELOPING;
    }

    // Per-criterion hints (only include non-null hints)
    const hints: string[] = [];
    for (const key of criteriaKeys) {
        const hintFn = CRITERION_HINTS[key];
        if (hintFn) {
            const hint = hintFn(scores[key] ?? 0, metrics);
            if (hint) hints.push(hint);
        }
    }

    // Metadata footer
    const footer = `(Evaluated via rubric: ${metrics.wordCount} word${metrics.wordCount === 1 ? '' : 's'}, ${metrics.paragraphCount} paragraph${metrics.paragraphCount === 1 ? '' : 's'}).`;

    const parts: string[] = [tone];
    if (hints.length > 0) {
        parts.push(hints.join(' '));
    }
    parts.push(footer);

    return parts.join(' ');
}
