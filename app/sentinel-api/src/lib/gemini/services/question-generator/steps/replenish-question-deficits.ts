import type { GenerateQuestionPreviewConfig, QuestionType } from '@sentinel/shared';
import type { ExtractedPdfDocument } from '../pdf-page-extractor';
import type { LlmFile, QuestionGeneratorLlmProvider } from '../types';
import type { ReconciliationResult } from './reconcile-question-slots';
import { generateBatchesStep } from './generate-batches';
import { normalizeQuestionsStep } from './normalize-questions';

/**
 * Requests all missing question types in one targeted generation batch.
 */
export async function replenishQuestionDeficits(args: {
    reconciliation: ReconciliationResult;
    config: GenerateQuestionPreviewConfig;
    files: File[];
    uploadedFiles: LlmFile[];
    sourceDocuments: ExtractedPdfDocument[];
    model: string;
    provider: QuestionGeneratorLlmProvider;
}) {
    const { deficits } = args.reconciliation;
    if (deficits.length === 0) {
        return [];
    }

    const deficitConfig: GenerateQuestionPreviewConfig = {
        ...args.config,
        questionType: undefined,
        questionTypeDistribution: deficits.map((deficit) => ({
            type: deficit.type as QuestionType,
            count: deficit.count,
        })),
        questionCount: deficits.reduce((total, deficit) => total + deficit.count, 0),
    };

    const { rawQuestions } = await generateBatchesStep({
        batches: [deficitConfig],
        files: args.files,
        uploadedFiles: args.uploadedFiles,
        model: args.model,
        provider: args.provider,
        concurrencyLimit: 1,
    });

    return normalizeQuestionsStep(rawQuestions, args.config, args.sourceDocuments).successful;
}
