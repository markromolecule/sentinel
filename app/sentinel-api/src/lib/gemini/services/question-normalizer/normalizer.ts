import { z } from 'zod';
import { Schema, aiPreviewSavePayloadSchema } from '@sentinel/shared';
import type { GenerateQuestionPreviewConfig, AiPreviewSavePayload } from '@sentinel/shared';
import { validateQuestionContentByType } from '../../../../modules/examination/assessment/assessment-contracts';
import { getQuestionTypeDistribution, QUESTION_TYPE_LABELS } from '../prompt-builder';
import { dedupe } from './coercion';
import { normalizeQuestionContentShape } from './content-shape';
import type { ExtractedPdfDocument } from '../question-generator/pdf-page-extractor';
import { stripPdfExtension } from './text-utils';
import { resolveSourceMetadata } from './evidence-service';
import { normalizeDifficulty, resolveQuestionType } from './domain-logic';

/**
 * Raw generated question schema, defining the basic shape expected from
 * the AI's response before it is normalized and validated.
 */
export const rawGeneratedQuestionSchema = z.object({
    subjectId: z.string().optional(),
    type: z.string().optional(),
    sourceFileName: z.string().min(1),
    sourcePageNumber: z.number().int().min(1),
    sourceEvidence: z.string().min(1),
    passageContent: z.string().min(1),
    difficulty: z.string().optional(),
    points: z.number().int().optional(),
    tags: z.array(z.string()).optional(),
    content: z.unknown(),
    // TOS metadata from AI
    topic: z.string().optional(),
    cognitive_level: z.string().optional(),
    predicted_difficulty: z.string().optional(),
});

/**
 * Normalizes a single raw generated question.
 *
 * Performs individual parsing, type resolution, content shape validation,
 * source document metadata matching, and schema mapping.
 */
export function normalizeGeneratedQuestion(
    rawQuestion: z.infer<typeof rawGeneratedQuestionSchema>,
    config: GenerateQuestionPreviewConfig,
    sourceDocuments: ExtractedPdfDocument[],
) {
    const question = rawGeneratedQuestionSchema.parse(rawQuestion);
    const resolvedType = resolveQuestionType(question.type, config);
    const normalizedContent = normalizeQuestionContentShape(resolvedType, question.content);
    const validatedContent = validateQuestionContentByType(resolvedType, normalizedContent);

    const sourceMetadata = resolveSourceMetadata({
        sourceDocuments,
        sourceFileName: question.sourceFileName,
        sourcePageNumber: question.sourcePageNumber,
        sourceEvidence: question.sourceEvidence,
        prompt: String(validatedContent.prompt ?? ''),
    });

    return Schema.questionInputSchema.parse({
        ...question,
        ...sourceMetadata,
        type: resolvedType,
        subjectId: config.subjectId ?? question.subjectId,
        difficulty: normalizeDifficulty(question.difficulty, config.difficulty),
        points: config.points ?? question.points ?? 1,
        tags: dedupe(question.tags ?? []),
        content: validatedContent,
        passageContent: question.passageContent.trim(),
        passageType: 'plain',
        // Forward TOS metadata — snake_case from AI → camelCase schema
        topic: question.topic ?? undefined,
        cognitiveLevel: (question.cognitive_level as any) ?? undefined,
        predictedDifficulty: (question.predicted_difficulty as any) ?? undefined,
    });
}

/**
 * Validates and normalizes the raw AI-generated question list into typed,
 * application-ready question inputs.
 *
 * Orchestrates the full normalization pipeline:
 * 1. Zod parsing of raw data
 * 2. Type resolution and validation
 * 3. Content shape normalization and validation
 * 4. PDF source metadata resolution
 * 5. Final assembly into validated QuestionInput objects
 */
export function normalizeGeneratedQuestions(
    rawQuestions: Array<z.infer<typeof rawGeneratedQuestionSchema>>,
    config: GenerateQuestionPreviewConfig,
    sourceDocuments: ExtractedPdfDocument[],
) {
    return rawQuestions.map((rawQuestion) =>
        normalizeGeneratedQuestion(rawQuestion, config, sourceDocuments),
    );
}

/**
 * Builds the `savePayload` object that a client can use to persist the
 * AI-generated questions as a collection.
 */
export function buildAiPreviewSavePayload(args: {
    normalizedQuestions: Array<z.infer<typeof Schema.questionInputSchema>>;
    config: GenerateQuestionPreviewConfig;
    fileName: string;
}): AiPreviewSavePayload {
    const { normalizedQuestions, config, fileName } = args;

    const collectionTags = dedupe(
        config.tags.length > 0
            ? config.tags
            : normalizedQuestions.flatMap((question) => question.tags ?? []),
    );
    const distribution = getQuestionTypeDistribution(config);

    const pdfName = stripPdfExtension(fileName);
    const defaultName =
        distribution.length === 1
            ? `${QUESTION_TYPE_LABELS[distribution[0].type]
                  .split(' ')
                  .map((part) => part[0]?.toUpperCase() + part.slice(1))
                  .join(' ')} Questions - ${pdfName}`
            : `Mixed Question Types - ${pdfName}`;

    return aiPreviewSavePayloadSchema.parse({
        institutionId: config.institutionId,
        name: config.name?.trim() || defaultName,
        description:
            config.description?.trim() || `AI-generated from ${fileName}. Review before saving.`,
        tags: collectionTags,
        isPublic: config.isPublic,
        questions: normalizedQuestions,
    });
}
