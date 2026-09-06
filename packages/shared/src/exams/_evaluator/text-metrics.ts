/**
 * Text metric extraction for the essay rubric evaluation engine.
 *
 * Single-responsibility: this module computes all quantitative text signals
 * from a raw student answer and its associated prompt.
 */
import {
    STOP_WORDS,
    TRANSITION_PATTERNS,
    EVIDENCE_PATTERNS,
    INFORMAL_MARKERS,
    ACADEMIC_VOCAB_PATTERNS,
    CITATION_PATTERNS,
    HEDGING_PATTERNS,
    REPETITION_FILLER_PATTERNS,
} from './patterns';

/**
 * Quantitative signals extracted from a student's essay answer.
 * All downstream scoring and compensation logic operates solely on this structure.
 */
export interface TextMetrics {
    /** Total word count in the answer. */
    wordCount: number;
    /** Number of detected sentences (split on . ! ?). */
    sentenceCount: number;
    /** Number of non-empty paragraphs (split on newlines). */
    paragraphCount: number;
    /** Average words per sentence. */
    avgWordsPerSentence: number;
    /** Type-Token Ratio: unique words / total words (0–1). Higher = richer vocabulary. */
    vocabRichness: number;
    /**
     * Fraction of substantive prompt keywords that appear in the answer (0–1).
     * 1.0 when no prompt is provided (neutral: not penalized).
     */
    promptOverlapRatio: number;
    /** Count of structural transition phrases detected. */
    transitionCount: number;
    /** Count of evidence/argumentation link phrases detected. */
    evidenceCount: number;
    /** Count of informal internet-slang markers detected. */
    informalMarkerCount: number;
    /**
     * Fraction of detected sentences that start with an uppercase letter (0–1).
     * Used as a lightweight capitalization-convention proxy.
     */
    capitalizationRatio: number;
    /** Whether the essay ends with terminal punctuation (. ! ?). */
    hasTerminalPunctuation: boolean;
    /**
     * Count of advanced academic vocabulary terms detected.
     * Higher count signals formal academic register in the writing.
     */
    academicVocabCount: number;
    /**
     * Count of citation/attribution phrases detected.
     * Signals that the student is grounding claims in external sources.
     */
    citationCount: number;
    /**
     * Count of epistemic hedging phrases detected.
     * Signals nuanced, careful academic argument (distinct from vague writing).
     */
    hedgingCount: number;
    /**
     * Count of repetition/filler phrases detected.
     * Higher count is a negative signal — student may be padding word count.
     */
    fillerCount: number;
}

/**
 * Counts all non-overlapping matches across an array of regex patterns.
 * Clones each regex to avoid mutating shared global state across calls.
 */
function countPatternMatches(text: string, patterns: RegExp[]): number {
    let total = 0;
    for (const pattern of patterns) {
        const localPattern = new RegExp(pattern.source, pattern.flags);
        const matches = text.match(localPattern);
        if (matches) {
            total += matches.length;
        }
    }
    return total;
}

/**
 * Extracts all quantitative text signals from a student essay answer.
 *
 * @param text - The trimmed student answer text (must be non-empty).
 * @param prompt - Optional question prompt used to compute prompt–answer overlap.
 * @returns A complete {@link TextMetrics} object.
 */
export function extractTextMetrics(text: string, prompt?: string | null): TextMetrics {
    // --- Paragraph analysis --------------------------------------------------
    const rawParagraphs = text.split(/\n+/).map((p) => p.trim()).filter((p) => p.length > 0);
    const paragraphCount = Math.max(rawParagraphs.length, 1);

    // --- Word analysis -------------------------------------------------------
    const words = text.split(/\s+/).filter((w) => w.length > 0);
    const wordCount = words.length;

    // --- Sentence analysis ---------------------------------------------------
    const rawSentences = text.split(/[.!?]+/).map((s) => s.trim()).filter((s) => s.length > 0);
    const sentenceCount = Math.max(rawSentences.length, 1);
    const avgWordsPerSentence = wordCount / sentenceCount;

    // --- Vocabulary richness (Type-Token Ratio) -------------------------------
    const normalizedWords = words
        .map((w) => w.toLowerCase().replace(/[^a-z0-9]/g, ''))
        .filter((w) => w.length > 0);
    const uniqueWords = new Set(normalizedWords);
    const vocabRichness = normalizedWords.length > 0 ? uniqueWords.size / normalizedWords.length : 0;

    // --- Prompt overlap ratio ------------------------------------------------
    let promptOverlapRatio = 1.0;
    if (prompt && prompt.trim().length > 0) {
        const promptSubstantiveWords = prompt
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, ' ')
            .split(/\s+/)
            .filter((w) => w.length >= 4 && !STOP_WORDS.has(w));

        if (promptSubstantiveWords.length > 0) {
            const matches = promptSubstantiveWords.filter((pw) => uniqueWords.has(pw));
            promptOverlapRatio = matches.length / promptSubstantiveWords.length;
        }
    }

    // --- Core pattern counts -------------------------------------------------
    const transitionCount = countPatternMatches(text, TRANSITION_PATTERNS);
    const evidenceCount = countPatternMatches(text, EVIDENCE_PATTERNS);
    const informalMarkerCount = countPatternMatches(text, INFORMAL_MARKERS);

    // --- Extended pattern counts (new signals) --------------------------------
    const academicVocabCount = countPatternMatches(text, ACADEMIC_VOCAB_PATTERNS);
    const citationCount = countPatternMatches(text, CITATION_PATTERNS);
    const hedgingCount = countPatternMatches(text, HEDGING_PATTERNS);
    const fillerCount = countPatternMatches(text, REPETITION_FILLER_PATTERNS);

    // --- Capitalization convention -------------------------------------------
    let capitalizedSentences = 0;
    for (const s of rawSentences) {
        const firstChar = s.charAt(0);
        if (firstChar >= 'A' && firstChar <= 'Z') {
            capitalizedSentences++;
        }
    }
    const capitalizationRatio =
        rawSentences.length > 0 ? capitalizedSentences / rawSentences.length : 1.0;

    const hasTerminalPunctuation = /[.!?]$/.test(text.trim());

    return {
        wordCount,
        sentenceCount,
        paragraphCount,
        avgWordsPerSentence,
        vocabRichness,
        promptOverlapRatio,
        transitionCount,
        evidenceCount,
        informalMarkerCount,
        capitalizationRatio,
        hasTerminalPunctuation,
        academicVocabCount,
        citationCount,
        hedgingCount,
        fillerCount,
    };
}
