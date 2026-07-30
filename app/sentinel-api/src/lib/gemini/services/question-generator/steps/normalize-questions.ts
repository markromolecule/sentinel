import type { GenerateQuestionPreviewConfig } from '@sentinel/shared';
import type { ExtractedPdfDocument } from '../pdf-page-extractor';
import type { RawGeneratedQuestion } from '../types';
import { normalizeGeneratedQuestion } from '../../question-normalizer';

export interface NormalizedQuestionsResult {
    successful: any[];
    failures: Array<{
        index: number;
        type: string;
        reason: string;
    }>;
}

/**
 * Step 5: Runs question normalization per candidate.
 * Preserves successful candidates and logs redacted failures by index and declared type.
 */
export function normalizeQuestionsStep(
    rawQuestions: RawGeneratedQuestion[],
    config: GenerateQuestionPreviewConfig,
    sourceDocuments: ExtractedPdfDocument[],
): NormalizedQuestionsResult {
    const successful: any[] = [];
    const failures: NormalizedQuestionsResult['failures'] = [];

    rawQuestions.forEach((rawQuestion, index) => {
        try {
            const normalized = normalizeGeneratedQuestion(rawQuestion, config, sourceDocuments);
            successful.push(normalized);
        } catch (error: any) {
            console.error(
                `Normalization failed for item at index ${index} (type: ${rawQuestion.type}):`,
                error,
            );
            failures.push({
                index,
                type: rawQuestion.type || 'UNKNOWN',
                reason: error?.message || 'Unknown normalization error',
            });
        }
    });

    return {
        successful,
        failures,
    };
}
