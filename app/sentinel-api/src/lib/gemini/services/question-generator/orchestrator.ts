import { z } from 'zod';
import type {
    GenerateQuestionPreviewConfig,
    GenerateQuestionPreviewResponse,
} from '@sentinel/shared';
import { HTTPException } from 'hono/http-exception';
import { GeminiProvider } from '../../gemini.provider';
import {
    QuestionNormalizationError,
    PassageQualityValidationError,
    normalizeGeneratedQuestion,
} from '../question-normalizer';
import type { QuestionGeneratorLlmProvider } from './types';
import { createBatches } from './utils/create-batches';
import { uploadFilesStep, deleteUploadedFilesStep } from './steps/upload-files';
import { generateBatchesStep } from './steps/generate-batches';
import { resolvePageCountsStep } from './steps/resolve-page-counts';
import { buildSourceDocumentsStep } from './steps/build-source-documents';
import { normalizeQuestionsStep } from './steps/normalize-questions';
import { buildResponseStep } from './steps/build-response';
import { reconcileQuestionSlots } from './steps/reconcile-question-slots';
import { assessPassageQuality } from './steps/assess-passage-quality';
import { repairInvalidQuestions } from './steps/repair-invalid-questions';
import { replenishQuestionDeficits } from './steps/replenish-question-deficits';

export type { LlmFile, QuestionGeneratorLlmProvider, RawGeneratedQuestion } from './types';

const MAX_PASSAGE_REPAIR_ROUNDS = 2;
const MAX_DEFICIT_REPLENISHMENT_ROUNDS = 2;

export class QuestionGeneratorService {
    /**
     * Orchestrates the full AI preview generation pipeline:
     * 1. Upload the PDF to Gemini Files API
     * 2. Build the structured prompt + response schema
     * 3. Generate questions via Gemini
     * 4. Normalize and validate the raw output
     * 5. Run quality evaluation & targeted repair loop
     * 6. Build and return the structured preview response
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
            const { rawQuestions: allRawQuestions } = await generateBatchesStep({
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
            const candidateQuestions = [...normalizedQuestions.successful];

            let reconciliation = reconcileQuestionSlots(candidateQuestions, args.config);

            let replenishmentRound = 0;
            while (
                reconciliation.deficits.length > 0 &&
                replenishmentRound < MAX_DEFICIT_REPLENISHMENT_ROUNDS
            ) {
                replenishmentRound++;
                const missingCount = reconciliation.deficits.reduce(
                    (total, deficit) => total + deficit.count,
                    0,
                );
                console.log(
                    `Running deficit replenishment round ${replenishmentRound} for ${missingCount} missing questions.`,
                );

                const replenishedQuestions = await replenishQuestionDeficits({
                    reconciliation,
                    config: args.config,
                    files: args.files,
                    uploadedFiles,
                    sourceDocuments,
                    model,
                    provider,
                });

                candidateQuestions.push(...replenishedQuestions);
                reconciliation = reconcileQuestionSlots(candidateQuestions, args.config);
            }

            if (reconciliation.deficits.length > 0) {
                throw new HTTPException(502, {
                    message:
                        'Gemini did not return the requested number of valid questions. Please try generating the preview again.',
                });
            }

            let assessResult = await assessPassageQuality(
                reconciliation.slots,
                args.config,
                model,
                provider,
            );

            let currentRound = 0;
            while (
                assessResult.failedSlots.length > 0 &&
                currentRound < MAX_PASSAGE_REPAIR_ROUNDS
            ) {
                currentRound++;
                console.log(
                    `Running repair round ${currentRound} for ${assessResult.failedSlots.length} failed slots.`,
                );

                const repaired = await repairInvalidQuestions({
                    failedSlots: assessResult.failedSlots,
                    config: args.config,
                    files: args.files,
                    uploadedFiles,
                    model,
                    provider,
                });

                for (const rep of repaired) {
                    const slotIndex = reconciliation.slots.findIndex(
                        (s) => s.slotId === rep.slotId,
                    );
                    if (slotIndex === -1) continue;

                    if (rep.rawQuestion) {
                        try {
                            const normalized = normalizeGeneratedQuestion(
                                rep.rawQuestion,
                                args.config,
                                sourceDocuments,
                            );
                            reconciliation.slots[slotIndex].question = normalized;
                        } catch (error) {
                            console.error(
                                `Normalization failed for repaired slot ${rep.slotId}:`,
                                error,
                            );
                            reconciliation.slots[slotIndex].question = null;
                        }
                    } else {
                        reconciliation.slots[slotIndex].question = null;
                    }
                }

                assessResult = await assessPassageQuality(
                    reconciliation.slots,
                    args.config,
                    model,
                    provider,
                );
            }

            if (assessResult.failedSlots.length > 0) {
                console.error(
                    'Passage quality validation failed after repair rounds:',
                    assessResult.failedSlots,
                );
                throw new PassageQualityValidationError(
                    'AI passage generation did not meet the required quality criteria. Reframed questions could not be generated without leaking answers.',
                    {
                        violations: assessResult.failedSlots.flatMap((s) =>
                            (s.violations || []).map((code, idx) => ({
                                code,
                                message: s.reasons?.[idx] || 'Quality violation',
                            })),
                        ),
                    },
                );
            }

            const finalQuestions = reconciliation.slots.map((s) => s.question);

            return buildResponseStep({
                config: args.config,
                model,
                files: args.files,
                totalSizeBytes,
                sourceDocuments,
                normalizedQuestions: finalQuestions,
            });
        } catch (error) {
            if (error instanceof PassageQualityValidationError) {
                console.error('AI passage quality validation error:', error.message);
                throw new HTTPException(502, {
                    message:
                        'AI passage generation did not meet quality checks. The questions could not be generated without leaking answers.',
                });
            }

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
