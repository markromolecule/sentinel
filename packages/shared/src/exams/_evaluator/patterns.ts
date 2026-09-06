/**
 * Shared regex patterns and vocabulary used by the essay rubric evaluation engine.
 *
 * Single-responsibility: this module owns only static lookup sets and compiled patterns
 * so other evaluator modules can import them without creating circular dependencies.
 *
 * ## Pattern Categories
 * - STOP_WORDS          → filter noise from prompt–answer overlap scoring
 * - TRANSITION_PATTERNS → structural flow signals (additive, contrastive, causal, sequential, conclusive)
 * - EVIDENCE_PATTERNS   → argumentation/support link signals
 * - INFORMAL_MARKERS    → inappropriate tone signals (internet slang, texting shorthand)
 * - ACADEMIC_VOCAB      → positive vocabulary signals indicating formal register
 * - CITATION_PATTERNS   → in-text citation/attribution signals boosting argumentationSupport
 * - HEDGING_PATTERNS    → epistemic hedging — marks careful, nuanced academic argument
 * - QUESTION_PATTERNS   → rhetorical questions — structural device signaling essay engagement
 * - REPETITION_FILLER   → low-quality filler signals (repeated padding words/phrases)
 */

// ─── Stop Words ───────────────────────────────────────────────────────────────

/**
 * Common English stop-words and prompt instruction verbs filtered out when computing
 * the prompt–answer overlap ratio. Words shorter than 4 characters are filtered separately.
 */
export const STOP_WORDS = new Set([
    // Articles, conjunctions, prepositions
    'a', 'an', 'the', 'and', 'or', 'but', 'if', 'because', 'as', 'what', 'when',
    'where', 'how', 'which', 'who', 'whom', 'this', 'that', 'these', 'those',
    // Auxiliary verbs
    'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
    'do', 'does', 'did', 'would', 'could', 'should', 'shall', 'might', 'must',
    // Prepositions & fillers
    'to', 'from', 'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further',
    'then', 'once', 'here', 'there', 'all', 'any', 'both', 'each', 'few',
    'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only',
    'own', 'same', 'so', 'than', 'too', 'very', 'can', 'will', 'just', 'now',
    'about', 'above', 'after', 'also', 'been', 'before', 'between', 'during',
    'through', 'while', 'with', 'without', 'within', 'whether', 'their',
    'they', 'them', 'then', 'there', 'your', 'you', 'its', 'our', 'we',
    // Common prompt instruction verbs — excluded to prevent trivial overlap scoring
    'explain', 'describe', 'discuss', 'analyze', 'compare', 'define', 'identify',
    'evaluate', 'provide', 'write', 'examine', 'outline', 'illustrate', 'justify',
    'assess', 'review', 'state', 'summarize', 'elaborate', 'mention', 'show',
]);

// ─── Transition Patterns ──────────────────────────────────────────────────────

/**
 * Patterns that detect explicit structural transitions between ideas or paragraphs.
 * Each match signals intentional logical flow in the student's writing.
 *
 * Grouped by rhetorical function for maintainability:
 *  1. Additive (adding information)
 *  2. Contrastive (opposing ideas)
 *  3. Causal (cause/effect relationships)
 *  4. Sequential / enumerative (order of points)
 *  5. Conclusive / summarizing
 *  6. Clarifying / exemplifying
 *  7. Temporal (time-based flow)
 */
export const TRANSITION_PATTERNS: RegExp[] = [
    // Additive
    /\b(moreover|furthermore|additionally|in addition|what is more|not only that|also|besides|equally important)\b/gi,
    // Contrastive
    /\b(however|nevertheless|on the other hand|in contrast|by contrast|yet|although|despite this|conversely|even so|that said|notwithstanding)\b/gi,
    // Causal
    /\b(therefore|consequently|as a result|thus|hence|accordingly|for this reason|due to this|it follows that)\b/gi,
    // Sequential / enumerative
    /\b(firstly|secondly|thirdly|finally|subsequently|next|then|to begin with|first of all|last but not least|in the first place)\b/gi,
    // Conclusive / summarizing
    /\b(in conclusion|to summarize|to sum up|in summary|overall|ultimately|on the whole|in short|to conclude|all in all|in brief)\b/gi,
    // Clarifying / exemplifying
    /\b(for example|for instance|specifically|in particular|that is|in other words|to illustrate|namely|to clarify|put differently)\b/gi,
    // Temporal
    /\b(meanwhile|at the same time|simultaneously|previously|afterward|thereafter|at this point|in the meantime)\b/gi,
];

// ─── Evidence / Argumentation Patterns ───────────────────────────────────────

/**
 * Patterns that detect evidence-linking and argumentation phrases.
 * Each match indicates the student is supporting claims with reasoning or examples.
 *
 * Grouped by function:
 *  1. Direct causation / reasoning links
 *  2. Attribution / source signals
 *  3. Inferential / logical connectors
 *  4. Contrast-based argumentation
 *  5. Quantitative or empirical signals
 */
export const EVIDENCE_PATTERNS: RegExp[] = [
    // Direct causation & reasoning
    /\b(because|since|due to|as a result of|owing to|given that|in light of|as a consequence of)\b/gi,
    // Exemplification
    /\b(for example|for instance|such as|demonstrates|illustrates|indicates|shows|reveals|highlights)\b/gi,
    // Attribution / source
    /\b(according to|based on|as stated by|as reported by|evidence suggests|research shows|studies indicate|data shows|surveys show)\b/gi,
    // Inferential connectors
    /\b(proves|supports|suggests|this means|this implies|this shows|it follows that|as shown by|can be inferred|can be concluded)\b/gi,
    // Contrast-based argumentation
    /\b(although|even though|despite|in spite of|while it is true that|one could argue|critics argue|it is often said)\b/gi,
    // Quantitative / empirical signals
    /\b(percent|percentage|majority|minority|statistics|data|research|study|experiment|survey|findings|results)\b/gi,
];

// ─── Informal / Slang Markers ─────────────────────────────────────────────────

/**
 * Patterns that detect informal internet-slang, texting shorthand, and
 * emotionally casual language markers indicating inappropriate academic tone.
 *
 * Grouped by category:
 *  1. Texting abbreviations
 *  2. Emotional/reaction slang
 *  3. Colloquial contractions & speech patterns
 *  4. Social media–specific language
 */
export const INFORMAL_MARKERS: RegExp[] = [
    // Texting abbreviations
    /\b(u|ur|idk|imho|tbh|plz|thx|pls|btw|ngl|imo|fyi|tho|cuz|coz|b4|2day|4ever|gr8|l8r)\b/gi,
    // Emotional / reaction slang
    /\b(lol|lmao|omg|omfg|rofl|smh|wtf|bruh|yikes|cringe|slay|goat|banger|mid|lowkey|highkey)\b/gi,
    // Colloquial contractions & informal speech
    /\b(gonna|wanna|gotta|dunno|kinda|sorta|ain't|y'all|lemme|gimme|tryna|hafta|shoulda|coulda|woulda)\b/gi,
    // Filler / hedging slang (distinct from academic hedging)
    /\b(literally|basically|honestly|like obviously|i mean like|you know what i mean|at the end of the day|to be honest)\b/gi,
];

// ─── Academic Vocabulary Patterns ─────────────────────────────────────────────

/**
 * Patterns that detect advanced academic register vocabulary.
 * Matches indicate the student is using formal, discipline-appropriate language
 * beyond basic everyday speech — a positive signal for styleTone and contentSubstance.
 *
 * These are intentionally broad to accommodate diverse subject areas.
 */
export const ACADEMIC_VOCAB_PATTERNS: RegExp[] = [
    // Analytical verbs
    /\b(analyze|synthesize|evaluate|assess|critique|examine|investigate|conceptualize|contextualize|hypothesize)\b/gi,
    // Abstract / conceptual nouns
    /\b(paradigm|framework|perspective|ideology|mechanism|phenomenon|implication|correlation|causation|inference)\b/gi,
    // Formal adjectives
    /\b(fundamental|substantial|significant|prominent|inherent|comprehensive|prevalent|theoretical|empirical|systematic)\b/gi,
    // Academic discourse markers
    /\b(it is argued|one perspective|from a .+ standpoint|scholars suggest|theorists propose|this demonstrates|this underscores)\b/gi,
];

// ─── Citation / Attribution Patterns ──────────────────────────────────────────

/**
 * Patterns that detect in-text citation and attribution conventions.
 * Even informal citations (no specific author) boost argumentationSupport
 * because they signal awareness that claims require external grounding.
 */
export const CITATION_PATTERNS: RegExp[] = [
    // Author-year style: (Smith, 2020) or (WHO, 2023)
    /\([A-Z][a-z]+(?:\s+et\s+al\.?)?,?\s+\d{4}\)/g,
    // Loose source attribution phrases
    /\b(according to|as cited in|as noted by|as argued by|as stated by|as reported by|as found by|as established by)\b/gi,
    // Named authority signals
    /\b(researchers|scientists|experts|scholars|economists|psychologists|historians|philosophers|theorists|analysts) (found|argue|suggest|claim|state|note|indicate|report|observe)\b/gi,
];

// ─── Epistemic Hedging Patterns ────────────────────────────────────────────────

/**
 * Patterns that detect epistemic hedging — markers of cautious, nuanced academic
 * reasoning. Hedging signals that the student understands that claims are not
 * absolute and is engaging with the complexity of the topic.
 *
 * Note: Distinguish from vague/uncertain writing. Hedging + evidence = strong.
 *       Hedging without content = weak. Scored by criterion-scorer, not here.
 */
export const HEDGING_PATTERNS: RegExp[] = [
    // Modal-based hedges
    /\b(may|might|could|would|tends to|appears to|seems to|is likely to|is unlikely to)\b/gi,
    // Probability markers
    /\b(arguably|possibly|potentially|presumably|generally|often|frequently|in many cases|in some cases|to some extent)\b/gi,
    // Epistemic stance markers
    /\b(it is possible that|it is likely that|it could be argued|one might suggest|there is evidence to suggest|it appears that)\b/gi,
];

// ─── Rhetorical Question Patterns ─────────────────────────────────────────────

/**
 * Patterns that detect rhetorical questions — a structural device that signals
 * essay-level engagement and intentional reader–writer interaction.
 * A rhetorical question followed by an answer is a positive structural signal.
 */
export const RHETORICAL_QUESTION_PATTERNS: RegExp[] = [
    // Classic rhetorical openers
    /\b(why (is it|do we|does|should|would|are)|what (is|are|does|would|could)|how (can|do|does|should|would))\b.*\?/gi,
    // Inverted/implicit rhetorical markers
    /\b(one must ask|we must consider|the question (is|remains|arises)|this raises the question|this begs the question)\b/gi,
];

// ─── Repetition / Low-Quality Filler Patterns ─────────────────────────────────

/**
 * Patterns that detect low-quality padding or repetitive filler content.
 * These are negative signals — frequent matches suggest the student is
 * inflating word count without adding substantive value.
 *
 * Used by criterion-scorer as a penalty signal in contentSubstance.
 */
export const REPETITION_FILLER_PATTERNS: RegExp[] = [
    // Circular / tautological statements
    /\b(is what it is|it is what it is|and so on and so forth|etc etc|and so forth and so on)\b/gi,
    // Padding intros
    /\b(in this essay i will|this essay will discuss|i am going to talk about|i will be discussing|the purpose of this essay is to)\b/gi,
    // Meaningless hedges (vs. epistemic hedging — these add no information)
    /\b(as i said before|as mentioned above|as i previously stated|as stated earlier|as mentioned earlier)\b/gi,
];
