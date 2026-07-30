import { QUESTION_DIFFICULTIES, QUESTION_TYPE_DEFINITIONS, QuestionType } from './definitions';

export interface CriticSlotInput {
    slotId: string;
    type: string;
    prompt: string;
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
        '1. Set "leaksAnswer" to true if the student-facing "passageContent" explicitly leaks or contains the correct answer (or key clues making the question a trivial copy-paste match) for MULTIPLE_CHOICE, MULTIPLE_RESPONSE, IDENTIFICATION, FILL_BLANK, or ENUMERATION. For TRUE_FALSE, set to true if the proposition is restated with high semantic overlap. For MATCHING, set to true if the pairs are explicitly associated in the same sentence segment.',
        '2. Set "answerableFromPassage" to true if a student can answer the question based solely on the context provided in "passageContent". It must contain sufficient information for synthesis or derivation.',
        '3. For each slot, return exactly one evaluation entry matching its slotId.',
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
    passageContent: string;
    sourceEvidence: string;
    violations: string[];
    sourceFiles: string[];
}

export function buildPassageRepairBatchPrompt(args: {
    slots: Omit<RepairPromptInput, 'sourceFiles'>[];
    sourceFiles: string[];
}): string {
    return [
        `Repair exactly ${args.slots.length} generated questions.`,
        'Return exactly one replacement for every requested slotId. Do not omit, duplicate, or rename slot IDs.',
        'Each replacement must retain the requested question type and satisfy its supplied response schema.',
        '',
        'SLOTS TO REPAIR:',
        JSON.stringify(args.slots, null, 2),
        '',
        'REPAIR INSTRUCTIONS:',
        '1. Generate a complete replacement question with fresh source metadata and passageContent.',
        '2. The passageContent must not contain the exact answer or clues that make the answer a trivial copy-paste match.',
        '3. The passageContent must still contain enough context for the student to derive the answer.',
        '4. The sourceEvidence must be a short verbatim excerpt from the exact source page. It may contain the answer because it is private provenance.',
        `5. Set sourceFileName to one of: ${args.sourceFiles.join(', ')}.`,
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
        passageContent,
        sourceEvidence,
        violations,
        sourceFiles,
    } = args;

    return [
        `Repair the generated question for slot "${slotId}" of type "${type}".`,
        'The original question had the following passage quality or leakage violations:',
        violations.map((v) => `- ${v}`).join('\n'),
        '',
        'ORIGINAL ITEM DETAILS:',
        `- Prompt: ${prompt}`,
        `- Correct Answer/Content: ${JSON.stringify(correctAnswer)}`,
        `- Original passageContent: ${passageContent}`,
        `- Verbatim sourceEvidence (provenance): ${sourceEvidence}`,
        '',
        'REPAIR INSTRUCTIONS:',
        '1. Generate a complete replacement raw question, including fresh "sourceFileName", "sourcePageNumber", "sourceEvidence", and "passageContent".',
        '2. The new "passageContent" MUST NOT contain the exact answer, key names, dates, numbers, formulas, or phrases that make the question a trivial copy-paste match.',
        '3. The new "passageContent" MUST contain enough context for the student to solve the question.',
        '4. The "sourceEvidence" MUST be a short verbatim excerpt copied from that exact page text to serve as private instructor provenance. It is allowed to contain the correct answer.',
        '5. Keep the exact question type requested.',
        `6. Set "sourceFileName" to one of: ${sourceFiles.join(', ')}.`,
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
    const { type, difficulty, bloomLevels } = config;
    const allowedDifficulties = difficulty ? [difficulty] : [...QUESTION_DIFFICULTIES];
    const allowedBloomLevels =
        bloomLevels && bloomLevels.length > 0
            ? bloomLevels
            : ['REMEMBERING', 'UNDERSTANDING', 'APPLYING', 'ANALYZING', 'EVALUATING', 'CREATING'];

    const definition = QUESTION_TYPE_DEFINITIONS[type as QuestionType];
    if (!definition) {
        throw new Error(`Unsupported question type: ${type}`);
    }

    return {
        type: 'object',
        properties: {
            sourceFileName: { type: 'string' },
            sourcePageNumber: { type: 'integer', minimum: 1 },
            sourceEvidence: { type: 'string' },
            passageContent: { type: 'string' },
            difficulty: {
                type: 'string',
                enum: allowedDifficulties,
            },
            points: { type: 'integer' },
            tags: {
                type: 'array',
                items: { type: 'string' },
            },
            topic: { type: 'string' },
            cognitive_level: {
                type: 'string',
                enum: allowedBloomLevels,
            },
            predicted_difficulty: {
                type: 'string',
                enum: [...QUESTION_DIFFICULTIES],
            },
            content: definition.schema,
        },
        required: [
            'sourceFileName',
            'sourcePageNumber',
            'sourceEvidence',
            'passageContent',
            'difficulty',
            'points',
            'content',
            'topic',
            'cognitive_level',
            'predicted_difficulty',
        ],
    };
}

export function buildPassageRepairBatchSchema(config: RepairSchemaConfig & { slotIds: string[] }) {
    return {
        type: 'object',
        properties: {
            repairs: {
                type: 'array',
                minItems: config.slotIds.length,
                maxItems: config.slotIds.length,
                items: {
                    type: 'object',
                    properties: {
                        slotId: {
                            type: 'string',
                            enum: config.slotIds,
                        },
                        question: buildPassageRepairSchema(config),
                    },
                    required: ['slotId', 'question'],
                },
            },
        },
        required: ['repairs'],
    };
}
