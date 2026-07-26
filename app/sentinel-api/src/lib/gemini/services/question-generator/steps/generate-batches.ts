import { z } from 'zod';
import { HTTPException } from 'hono/http-exception';
import type { GenerateQuestionPreviewConfig } from '@sentinel/shared';
import type { LlmFile, QuestionGeneratorLlmProvider, RawGeneratedQuestion } from '../types';
import { buildPrompt, buildResponseJsonSchema } from '../../prompt-builder';
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
}): Promise<RawGeneratedQuestion[]> {
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
        difficulty: z.string().optional(),
        points: z.number().int().optional(),
        tags: z.array(z.string()).optional(),
        content: z.unknown(),
        // TOS metadata
        topic: z.string().optional(),
        cognitive_level: z.string().optional(),
        predicted_difficulty: z.string().optional(),
    });

    const batchTasks = batches.map((batchConfig) => async () => {
        const prompt = buildPrompt({
            config: batchConfig,
            sourceFiles: files.map((file) => ({
                fileName: file.name,
            })),
        });

        const generated = await provider.generateStructuredJson<
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

        const parsed = z.record(z.string(), z.array(itemSchema).default([])).parse(generated);

        return Object.entries(parsed).flatMap(([type, items]) => {
            return items.map((item) => ({
                ...item,
                type,
            }));
        });
    });

    const batchResults = await runWithConcurrencyLimit(batchTasks, concurrencyLimit);
    const allRawQuestions = batchResults
        .filter(
            (res): res is PromiseFulfilledResult<RawGeneratedQuestion[]> =>
                res.status === 'fulfilled',
        )
        .flatMap((res) => res.value);

    if (allRawQuestions.length === 0) {
        throw new HTTPException(502, {
            message: 'AI generation failed. All question batches returned errors.',
        });
    }

    return allRawQuestions;
}
