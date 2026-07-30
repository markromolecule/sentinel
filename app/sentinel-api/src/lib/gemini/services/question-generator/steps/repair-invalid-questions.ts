import type { GenerateQuestionPreviewConfig } from '@sentinel/shared';
import type { LlmFile, QuestionGeneratorLlmProvider, RawGeneratedQuestion } from '../types';
import {
    buildPassageRepairPrompt,
    buildPassageRepairSchema,
} from '../../prompt-builder/passage-quality-prompts';

export interface FailedSlotInput {
    slotId: string;
    type: string;
    question: any;
    violations: string[];
    reasons: string[];
}

export interface RepairedQuestionResult {
    slotId: string;
    rawQuestion: RawGeneratedQuestion | null;
    error?: string;
}

/**
 * Step 7: Requests complete replacement raw questions for failed slots from the LLM.
 * Passes the original question, its violations, and uploaded source files context.
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

    const repairTasks = failedSlots.map(async (slot) => {
        const prompt = buildPassageRepairPrompt({
            slotId: slot.slotId,
            type: slot.type,
            prompt: slot.question?.content?.prompt || '',
            correctAnswer:
                slot.question?.content?.correctAnswer ??
                slot.question?.content?.acceptedAnswers ??
                slot.question?.content?.blanks ??
                '',
            passageContent: slot.question?.passageContent || '',
            sourceEvidence: slot.question?.sourceEvidence || '',
            violations: slot.violations,
            sourceFiles: files.map((file) => file.name),
        });

        const responseJsonSchema = buildPassageRepairSchema({
            type: slot.type,
            difficulty: config.difficulty,
            bloomLevels: config.bloomLevels,
        });

        try {
            const generatedRaw = await provider.generateStructuredJson<any>({
                model,
                prompt,
                responseJsonSchema,
                files: uploadedFiles.map((file) => ({
                    uri: file.uri,
                    mimeType: file.mimeType,
                })),
            });

            const rawQuestion: RawGeneratedQuestion = {
                ...generatedRaw,
                type: slot.type,
            };

            return {
                slotId: slot.slotId,
                rawQuestion,
            };
        } catch (error: any) {
            console.error(`Repair failed for slot ${slot.slotId}:`, error);
            return {
                slotId: slot.slotId,
                rawQuestion: null,
                error: error?.message || 'Repair model call failed',
            };
        }
    });

    return Promise.all(repairTasks);
}
