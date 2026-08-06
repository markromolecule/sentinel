import type { GenerateQuestionPreviewConfig } from '@sentinel/shared';
import type { LlmFile, QuestionGeneratorLlmProvider } from '../types';
import {
    buildPassageRepairBatchPrompt,
    buildPassageRepairBatchSchema,
} from '../../prompt-builder/passage-quality-prompts';
import { extractQuestionAnswerSignals } from '../../question-normalizer/passage-leak-validator';
import { runWithConcurrencyLimit } from '../utils/concurrency';

const REPAIR_BATCH_SIZE = 10;
const REPAIR_CONCURRENCY_LIMIT = 3;

export interface FailedSlotInput {
    slotId: string;
    type: string;
    question: any;
    violations: string[];
    reasons: string[];
}

export interface RepairedQuestionResult {
    slotId: string;
    passageContent: string | null;
    error?: string;
}

/**
 * Step 7: Requests passage-only repairs in one call per question type.
 */
export async function repairInvalidQuestions(args: {
    failedSlots: FailedSlotInput[];
    config: GenerateQuestionPreviewConfig;
    files: File[];
    uploadedFiles: LlmFile[];
    model: string;
    provider: QuestionGeneratorLlmProvider;
}): Promise<RepairedQuestionResult[]> {
    const { failedSlots, config, files, uploadedFiles, model, provider } = args;
    void uploadedFiles;
    const slotsByType = new Map<string, FailedSlotInput[]>();

    for (const slot of failedSlots) {
        const existingSlots = slotsByType.get(slot.type) ?? [];
        existingSlots.push(slot);
        slotsByType.set(slot.type, existingSlots);
    }

    const repairBatches: Array<{ type: string; slots: FailedSlotInput[] }> = [];

    for (const [type, typeSlots] of slotsByType) {
        for (let offset = 0; offset < typeSlots.length; offset += REPAIR_BATCH_SIZE) {
            repairBatches.push({
                type,
                slots: typeSlots.slice(offset, offset + REPAIR_BATCH_SIZE),
            });
        }
    }

    const repairTasks = repairBatches.map(({ type, slots }) => async () => {
        const prompt = buildPassageRepairBatchPrompt({
            slots: slots.map((slot) => ({
                slotId: slot.slotId,
                type: slot.type,
                prompt: slot.question?.content?.prompt || '',
                correctAnswer:
                    slot.question?.content?.correctAnswer ??
                    slot.question?.content?.acceptedAnswers ??
                    slot.question?.content?.blanks ??
                    '',
                answerSignals: slot.question
                    ? extractQuestionAnswerSignals(slot.type as any, slot.question.content)
                    : [],
                passageContent: slot.question?.passageContent || '',
                sourceEvidence: slot.question?.sourceEvidence || '',
                violations: slot.violations,
                reasons: slot.reasons,
            })),
            sourceFiles: files.map((file) => file.name),
        });

        const responseJsonSchema = buildPassageRepairBatchSchema({
            type,
            difficulty: config.difficulty,
            bloomLevels: config.bloomLevels,
        });

        const generated = await provider.generateStructuredJson<{
            repairs: Array<{
                slotId: string;
                passageContent: string;
            }>;
        }>({
            model,
            prompt,
            responseJsonSchema,
        });

        const repairsBySlotId = new Map(
            (generated.repairs ?? []).map((repair) => [
                repair.slotId,
                repair.passageContent?.trim() ?? '',
            ]),
        );

        return slots.map((slot): RepairedQuestionResult => {
            const repairedPassage = repairsBySlotId.get(slot.slotId);
            return {
                slotId: slot.slotId,
                passageContent: repairedPassage || null,
                ...(!repairedPassage ? { error: 'Repair response omitted this slot.' } : {}),
            };
        });
    });

    const batchResults = await runWithConcurrencyLimit(repairTasks, REPAIR_CONCURRENCY_LIMIT);
    const failedBatch = batchResults.find(
        (result): result is PromiseRejectedResult => result.status === 'rejected',
    );

    if (failedBatch) {
        console.error('Question repair batch failed:', failedBatch.reason);
        throw failedBatch.reason;
    }

    return batchResults.flatMap((result) => (result.status === 'fulfilled' ? result.value : []));
}
