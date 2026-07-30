import { z } from 'zod';
import type { GenerateQuestionPreviewConfig } from '@sentinel/shared';
import type {
    LlmFile,
    QuestionGeneratorLlmProvider,
    RawGeneratedQuestion,
    GenerateBatchesResult,
} from '../types';
import {
    buildPrompt,
    buildResponseJsonSchema,
    getQuestionTypeDistribution,
} from '../../prompt-builder';
import { runWithConcurrencyLimit } from '../utils/concurrency';

const CONCURRENCY_LIMIT = 3;

/**
 * Step 2: Concurrently generates raw questions for each batch using the injected provider.
 */
export async function generateBatchesStep(args: {
    batches: GenerateQuestionPreviewConfig[];
    files: File[];
    uploadedFiles: LlmFile[];
    model: string;
    provider: QuestionGeneratorLlmProvider;
    concurrencyLimit?: number;
}): Promise<GenerateBatchesResult> {
    const {
        batches,
        files,
        uploadedFiles,
        model,
        provider,
        concurrencyLimit = CONCURRENCY_LIMIT,
    } = args;

    const itemSchema = z.object({
        subjectId: z.string().optional(),
        sourceFileName: z.string().min(1),
        sourcePageNumber: z.number().int().min(1),
        sourceEvidence: z.string().min(1),
        passageContent: z.string().min(1),
        difficulty: z.string().optional(),
        points: z.number().int().optional(),
        tags: z.array(z.string()).optional(),
        content: z.unknown(),
        // TOS metadata
        topic: z.string().optional(),
        cognitive_level: z.string().optional(),
        predicted_difficulty: z.string().optional(),
    });

    const batchTasks = batches.map((batchConfig) => async (): Promise<GenerateBatchesResult> => {
        const prompt = buildPrompt({
            config: batchConfig,
            sourceFiles: files.map((file) => ({
                fileName: file.name,
            })),
        });

        let generated: any;
        try {
            generated = await provider.generateStructuredJson<
                Record<string, Array<Omit<RawGeneratedQuestion, 'type'>>>
            >({
                model,
                prompt,
                responseJsonSchema: buildResponseJsonSchema(batchConfig),
                files: uploadedFiles.map((file) => ({
                    uri: file.uri,
                    mimeType: file.mimeType,
                })),
            });
        } catch (error) {
            console.error('Batch generation model call failed:', error);
            throw error;
        }

        const parsedRecord = z
            .record(z.string(), z.array(z.unknown()).default([]))
            .safeParse(generated);
        if (!parsedRecord.success) {
            console.error('Batch generation output structure parsing failed:', parsedRecord.error);
            const deficits = getQuestionTypeDistribution(batchConfig).map((d) => ({
                type: d.type,
                count: d.count,
            }));
            return { rawQuestions: [], deficits };
        }

        const rawQuestions: RawGeneratedQuestion[] = [];
        const deficits: Array<{ type: string; count: number }> = [];

        // Parse all generated items
        for (const [type, items] of Object.entries(parsedRecord.data)) {
            for (const rawItem of items) {
                const parsedItem = itemSchema.safeParse(rawItem);
                if (parsedItem.success) {
                    rawQuestions.push({
                        ...parsedItem.data,
                        type,
                    } as RawGeneratedQuestion);
                } else {
                    console.warn(
                        `Malformed raw question item for type ${type} skipped:`,
                        parsedItem.error,
                    );
                }
            }
        }

        // Calculate deficits based on requested distribution
        const distribution = getQuestionTypeDistribution(batchConfig);
        for (const dist of distribution) {
            const assignedCount = rawQuestions.filter((q) => q.type === dist.type).length;
            const typeDeficit = Math.max(0, dist.count - assignedCount);
            if (typeDeficit > 0) {
                deficits.push({
                    type: dist.type,
                    count: typeDeficit,
                });
            }
        }

        return { rawQuestions, deficits };
    });

    const batchResults = await runWithConcurrencyLimit(batchTasks, concurrencyLimit);

    const allRawQuestions: RawGeneratedQuestion[] = [];
    const allDeficits: Array<{ type: string; count: number }> = [];

    batchResults.forEach((res, index) => {
        if (res.status === 'fulfilled') {
            allRawQuestions.push(...res.value.rawQuestions);
            for (const def of res.value.deficits) {
                const existing = allDeficits.find((d) => d.type === def.type);
                if (existing) {
                    existing.count += def.count;
                } else {
                    allDeficits.push({ ...def });
                }
            }
        } else {
            console.error(`Question generation batch ${index + 1} failed:`, res.reason);
        }
    });

    const failedBatch = batchResults.find(
        (result): result is PromiseRejectedResult => result.status === 'rejected',
    );
    if (failedBatch) {
        throw failedBatch.reason;
    }

    return {
        rawQuestions: allRawQuestions,
        deficits: allDeficits,
    };
}
