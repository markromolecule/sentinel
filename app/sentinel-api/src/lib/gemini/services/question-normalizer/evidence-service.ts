import type { ExtractedPdfDocument } from '../question-generator/pdf-page-extractor';
import {
    normalizeForMatch,
    scoreTokenOverlap,
    splitIntoEvidenceSegments,
    stripPdfExtension,
} from './text-utils';
import { SourceMetadataValidationError } from './errors';

function normalizeSourceFileNameForMatch(value: string) {
    return normalizeForMatch(stripPdfExtension(value));
}

function resolveSourceDocumentByFileName(
    sourceDocuments: ExtractedPdfDocument[],
    sourceFileName: string,
) {
    if (sourceDocuments.length === 0) {
        return null;
    }

    const trimmedFileName = sourceFileName.trim();
    const lowerCaseFileName = trimmedFileName.toLowerCase();
    const normalizedFileName = normalizeSourceFileNameForMatch(trimmedFileName);

    // 1. Exact Match
    const exactMatch = sourceDocuments.find(
        (document) => document.fileName.trim().toLowerCase() === lowerCaseFileName,
    );

    if (exactMatch) {
        return exactMatch;
    }

    // 2. Normalized Match
    const normalizedMatches = sourceDocuments.filter(
        (document) => normalizeSourceFileNameForMatch(document.fileName) === normalizedFileName,
    );

    if (normalizedMatches.length === 1) {
        return normalizedMatches[0];
    }

    // 3. Index-based match (e.g. "input_file_0", "file_1", etc.)
    const indexMatch = trimmedFileName.match(/(?:input_file_|file_)[_-]?(\d+)/i);
    if (indexMatch) {
        const index = parseInt(indexMatch[1], 10);
        if (index >= 0 && index < sourceDocuments.length) {
            return sourceDocuments[index];
        }
    }

    // 4. Fuzzy Token Overlap Match
    let bestMatch: ExtractedPdfDocument | null = null;
    let highestScore = 0;

    for (const document of sourceDocuments) {
        const score = scoreTokenOverlap(trimmedFileName, document.fileName);
        if (score > highestScore) {
            highestScore = score;
            bestMatch = document;
        }
    }

    if (bestMatch && highestScore >= 0.2) {
        return bestMatch;
    }

    // 5. Fallback: Default to the first source document
    return sourceDocuments[0];
}

/**
 * Refines the AI-generated source evidence by finding the best segment
 * matching the evidence or prompt in the actual page text.
 */
export function buildSourceEvidence(args: {
    pageText: string;
    sourceEvidence: string;
    prompt: string;
}) {
    const normalizedPageText = normalizeForMatch(args.pageText);
    const trimmedEvidence = args.sourceEvidence.trim();
    const normalizedEvidence = normalizeForMatch(trimmedEvidence);

    // Exact match (normalized) is the preferred scenario
    if (normalizedEvidence.length > 0 && normalizedPageText.includes(normalizedEvidence)) {
        return trimmedEvidence;
    }

    const segments = splitIntoEvidenceSegments(args.pageText);
    const queries = [args.sourceEvidence, args.prompt].filter((value) => value.trim().length > 0);

    if (segments.length === 0) {
        return trimmedEvidence;
    }

    // Fallback: search for the best fuzzy-matched segment
    const bestSegment = segments
        .map((segment) => ({
            segment,
            score: Math.max(...queries.map((query) => scoreTokenOverlap(query, segment))),
        }))
        .sort((left, right) => right.score - left.score)[0];

    // Minimum confidence threshold of 0.35
    return bestSegment && bestSegment.score >= 0.35 ? bestSegment.segment : trimmedEvidence;
}

/**
 * Validates the source metadata provided by the AI and resolves the actual
 * file, page number, and evidence text within the uploaded documents.
 */
export function resolveSourceMetadata(args: {
    sourceDocuments: ExtractedPdfDocument[];
    sourceFileName: string;
    sourcePageNumber: number;
    sourceEvidence: string;
    prompt: string;
}) {
    const sourceDocument = resolveSourceDocumentByFileName(
        args.sourceDocuments,
        args.sourceFileName,
    );

    if (!sourceDocument) {
        throw new SourceMetadataValidationError(
            `Generated source file "${args.sourceFileName}" is not part of the uploaded PDFs.`,
        );
    }

    if (sourceDocument.pages.length === 0) {
        return {
            sourceOrigin: 'AI_PDF' as const,
            sourceFileName: sourceDocument.fileName,
            sourcePageNumber: args.sourcePageNumber,
            sourceEvidence: args.sourceEvidence.trim(),
        };
    }

    const sourcePage = sourceDocument.pages.find(
        (page) => page.pageNumber === args.sourcePageNumber,
    );

    if (!sourcePage) {
        throw new SourceMetadataValidationError(
            `Generated source page ${args.sourcePageNumber} does not exist in "${sourceDocument.fileName}".`,
        );
    }

    const normalizedEvidence = normalizeForMatch(args.sourceEvidence);
    const normalizedPageText = normalizeForMatch(sourcePage.text);

    // If the evidence exists on the declared page, return it immediately
    if (normalizedPageText.includes(normalizedEvidence)) {
        return {
            sourceOrigin: 'AI_PDF' as const,
            sourceFileName: sourceDocument.fileName,
            sourcePageNumber: sourcePage.pageNumber,
            sourceEvidence: args.sourceEvidence.trim(),
        };
    }

    // Calculate confidence score for the declared page
    const declaredPageScore = Math.max(
        scoreTokenOverlap(args.sourceEvidence, sourcePage.text),
        scoreTokenOverlap(args.prompt, sourcePage.text),
    );

    // Search for a better match across all pages in the document
    const bestPageMatch = sourceDocument.pages
        .map((page) => ({
            page,
            score:
                scoreTokenOverlap(args.sourceEvidence, page.text) * 0.7 +
                scoreTokenOverlap(args.prompt, page.text) * 0.3 +
                (page.pageNumber === args.sourcePageNumber ? 0.1 : 0),
        }))
        .sort((left, right) => right.score - left.score)[0];

    // If confidence is too low on both the declared and best matching page, reject it
    if (declaredPageScore < 0.35 && (!bestPageMatch || bestPageMatch.score < 0.45)) {
        throw new SourceMetadataValidationError(
            `Generated source evidence does not match page ${args.sourcePageNumber} of "${sourceDocument.fileName}".`,
        );
    }

    // Resolve to the declared page if it's "good enough", otherwise use the best match
    const resolvedPage = declaredPageScore >= 0.35 ? sourcePage : bestPageMatch.page;

    return {
        sourceOrigin: 'AI_PDF' as const,
        sourceFileName: sourceDocument.fileName,
        sourcePageNumber: resolvedPage.pageNumber,
        sourceEvidence: buildSourceEvidence({
            pageText: resolvedPage.text,
            sourceEvidence: args.sourceEvidence,
            prompt: args.prompt,
        }),
    };
}
