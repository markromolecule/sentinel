import { z } from 'zod';
import type {
    GenerateQuestionPreviewConfig,
    GenerateQuestionPreviewResponse,
} from '@sentinel/shared';
import { HTTPException } from 'hono/http-exception';
import { GeminiProvider } from '../../gemini.provider';
import { QuestionNormalizationError } from '../question-normalizer';
import type { QuestionGeneratorLlmProvider } from './types';
import { createBatches } from './utils/create-batches';
import { uploadFilesStep, deleteUploadedFilesStep } from './steps/upload-files';
import { generateBatchesStep } from './steps/generate-batches';
import { resolvePageCountsStep } from './steps/resolve-page-counts';
import { buildSourceDocumentsStep } from './steps/build-source-documents';
import { normalizeQuestionsStep } from './steps/normalize-questions';
import { buildResponseStep } from './steps/build-response';

export type { LlmFile, QuestionGeneratorLlmProvider, RawGeneratedQuestion } from './types';

export class QuestionGeneratorService {
    /**
     * Orchestrates the full AI preview generation pipeline:
     * 1. Upload the PDF to Gemini Files API
     * 2. Build the structured prompt + response schema
     * 3. Generate questions via Gemini
     * 4. Normalize and validate the raw output
     * 5. Build and return the structured preview response
     */
    static async generatePreviewFromPdf(args: {
        files: File[];
        config: GenerateQuestionPreviewConfig;
        provider?: QuestionGeneratorLlmProvider;
    }): Promise<GenerateQuestionPreviewResponse> {
        const provider = args.provider ?? GeminiProvider;
        const BATCH_SIZE = 25;
        const batches = createBatches(args.config, BATCH_SIZE);
        const totalSizeBytes = args.files.reduce((total, file) => total + file.size, 0);
        const model = provider.resolveFlashModel();
        const uploadedFiles = await uploadFilesStep(args.files, provider);

        try {
            const allRawQuestions = await generateBatchesStep({
                batches,
                files: args.files,
                uploadedFiles,
                model,
                provider,
            });

            const sourcePageCounts = await resolvePageCountsStep({
                files: args.files,
                uploadedFiles,
                model,
                provider,
            });

            const sourceDocuments = buildSourceDocumentsStep(
                args.files,
                allRawQuestions,
                sourcePageCounts,
            );

            const normalizedQuestions = normalizeQuestionsStep(
                allRawQuestions,
                args.config,
                sourceDocuments,
            );

            return buildResponseStep({
                config: args.config,
                model,
                files: args.files,
                totalSizeBytes,
                sourceDocuments,
                normalizedQuestions,
            });
        } catch (error) {
            if (error instanceof z.ZodError) {
                console.error('AI preview validation error:', error.flatten());
                throw new HTTPException(502, {
                    message:
                        'Gemini returned data that did not match the required question schema.',
                });
            }

            if (
                error instanceof QuestionNormalizationError ||
                (error instanceof HTTPException && error.status === 400)
            ) {
                console.error('AI preview validation error:', {
                    message: error.message,
                });
                throw new HTTPException(502, {
                    message:
                        'Gemini returned data that did not match the required question schema.',
                });
            }

            throw error;
        } finally {
            await deleteUploadedFilesStep(uploadedFiles, provider);
        }
    }
}
