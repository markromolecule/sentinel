import { QUESTION_DIFFICULTIES } from './definitions';

export interface CriticSlotInput {
    slotId: string;
    type: string;
    prompt: string;
    questionContent?: any;
    correctAnswer: any;
    passageContent: string;
    sourceEvidence: string;
}

/**
 * Builds the prompt for the semantic quality critic evaluating slots.
 */
export function buildPassageQualityCriticPrompt(slots: CriticSlotInput[]): string {
    const serializedSlots = slots
        .map((slot) =>
            JSON.stringify(
                {
                    slotId: slot.slotId,
                    type: slot.type,
                    prompt: slot.prompt,
                    questionContent: slot.questionContent,
                    correctAnswer: slot.correctAnswer,
                    passageContent: slot.passageContent,
                    sourceEvidence: slot.sourceEvidence,
                },
                null,
                2,
            ),
        )
        .join('\n\n');

    return [
        'You are an expert assessment quality critic. Evaluate the following generated questions for passage quality, answer leakage, and student answerability.',
        'CRITICAL EVALUATION RULES:',
        '1. Set "leaksAnswer" to true only when the student-facing "passageContent" explicitly gives the answer or makes the item a trivial copy-paste match. Descriptive clues, definitions without the term, and evidence used to infer an answer are not leaks.',
        '2. For TRUE_FALSE, evidence that supports or refutes the proposition is required and is not an answer leak by itself. Mark a leak only if the passage repeats the proposition nearly verbatim or explicitly labels it true or false.',
        '3. Set "answerableFromPassage" to true when the passage and the complete questionContent together provide enough information to derive or select the answer. For selected-response questions, inspect the supplied options; the correct option does not need to appear verbatim in the passage.',
        '4. Do not require external subject knowledge when the passage describes the concept and the available options let the student identify it.',
        '5. For each slot, return exactly one evaluation entry matching its slotId.',
        '',
        'SLOTS TO EVALUATE:',
        serializedSlots,
    ].join('\n');
}

/**
 * Builds the response JSON schema for the batched semantic critic.
 */
export function buildPassageQualityCriticSchema() {
    return {
        type: 'object',
        properties: {
            evaluations: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        slotId: { type: 'string' },
                        leaksAnswer: { type: 'boolean' },
                        answerableFromPassage: { type: 'boolean' },
                        reasonCode: { type: 'string' },
                        reason: { type: 'string' },
                    },
                    required: [
                        'slotId',
                        'leaksAnswer',
                        'answerableFromPassage',
                        'reasonCode',
                        'reason',
                    ],
                },
            },
        },
        required: ['evaluations'],
    };
}

export interface RepairPromptInput {
    slotId: string;
    type: string;
    prompt: string;
    correctAnswer: any;
    answerSignals?: string[];
    passageContent: string;
    sourceEvidence: string;
    violations: string[];
    reasons?: string[];
    sourceFiles: string[];
}

/**
 * Builds the prompt for a batched passage-only repair request.
 */
export function buildPassageRepairBatchPrompt(args: {
    slots: Omit<RepairPromptInput, 'sourceFiles'>[];
    sourceFiles: string[];
}): string {
    const slotIds = args.slots.map((slot) => slot.slotId);

    return [
        `Repair exactly ${args.slots.length} generated questions.`,
        'Return exactly one passage repair for every requested slotId. Do not omit, duplicate, or rename slot IDs.',
        `Valid slot IDs: ${slotIds.join(', ')}.`,
        'Each repair must retain the requested question type and satisfy its supplied response schema.',
        '',
        'SLOTS TO REPAIR:',
        JSON.stringify(args.slots, null, 2),
        '',
        'REPAIR INSTRUCTIONS:',
        '1. Return only { "slotId", "passageContent" } objects for the requested slots.',
        '2. The repaired passageContent must not contain the exact answer signals or clues that make the answer a trivial copy-paste match. Avoid those signals even inside compound words, hyphenated phrases, or lists.',
        '3. The repaired passageContent must still contain enough context for the student to derive the answer.',
        '4. Do not return question content, sourceEvidence, sourceFileName, sourcePageNumber, or other provenance fields.',
        `5. Use the original item context and one of these source files for reference only: ${args.sourceFiles.join(', ')}.`,
    ].join('\n');
}

/**
 * Builds the repair instructions prompt for repairing a single invalid slot.
 */
export function buildPassageRepairPrompt(args: RepairPromptInput): string {
    const {
        slotId,
        type,
        prompt,
        correctAnswer,
        answerSignals = [],
        passageContent,
        sourceEvidence,
        violations,
        reasons = [],
        sourceFiles,
    } = args;

    return [
        `Repair the generated question for slot "${slotId}" of type "${type}".`,
        'The original question had the following passage quality or leakage violations:',
        violations.map((v) => `- ${v}`).join('\n'),
        reasons.length > 0
            ? `Detailed reasons:\n${reasons.map((reason) => `- ${reason}`).join('\n')}`
            : null,
        '',
        'ORIGINAL ITEM DETAILS:',
        `- Prompt: ${prompt}`,
        `- Correct Answer/Content: ${JSON.stringify(correctAnswer)}`,
        answerSignals.length > 0
            ? `- Exact answer signals to avoid: ${answerSignals.join(', ')}`
            : null,
        `- Original passageContent: ${passageContent}`,
        `- Verbatim sourceEvidence (provenance): ${sourceEvidence}`,
        '',
        'REPAIR INSTRUCTIONS:',
        '1. Return only a fresh "passageContent" value for this slot, not a full replacement question.',
        '2. The new "passageContent" MUST NOT contain the exact answer signals, key names, dates, numbers, formulas, or phrases that make the question a trivial copy-paste match. Avoid those signals even inside compound words, hyphenated phrases, or lists.',
        '3. The new "passageContent" MUST contain enough context for the student to solve the question.',
        '4. Do not return "sourceEvidence", "sourceFileName", "sourcePageNumber", or any other question fields.',
        `5. Use one of these source files for reference only: ${sourceFiles.join(', ')}.`,
    ].join('\n');
}

interface RepairSchemaConfig {
    type: string;
    difficulty?: string;
    bloomLevels?: string[];
}

/**
 * Builds the schema for a single repaired question.
 */
export function buildPassageRepairSchema(config: RepairSchemaConfig) {
    void config;

    return {
        type: 'object',
        properties: {
            slotId: { type: 'string' },
            passageContent: { type: 'string' },
        },
        required: ['slotId', 'passageContent'],
    };
}

/**
 * Builds the schema for a batched passage repair response.
 */
export function buildPassageRepairBatchSchema(config: RepairSchemaConfig) {
    void config;
    return {
        type: 'object',
        properties: {
            repairs: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        slotId: { type: 'string' },
                        passageContent: { type: 'string' },
                    },
                    required: ['slotId', 'passageContent'],
                },
            },
        },
        required: ['repairs'],
    };
}
