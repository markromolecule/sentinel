import type { LlmFile, QuestionGeneratorLlmProvider } from '../types';

/**
 * Extracts the number of pages from a PDF buffer deterministically in memory (<1ms).
 */
export async function extractPdfPageCountFromBuffer(buffer: Buffer): Promise<number> {
    try {
        const text = buffer.toString('latin1');

        // 1. Check for /Count in /Pages dictionary
        const countMatch =
            text.match(/\/Type\s*\/Pages\b[\s\S]*?\/Count\s+(\d+)/i) ??
            text.match(/\/Count\s+(\d+)/);
        if (countMatch && countMatch[1]) {
            const count = parseInt(countMatch[1], 10);
            if (Number.isFinite(count) && count > 0) {
                return count;
            }
        }

        // 2. Check for /Type /Page objects
        const pageMatches = text.match(/\/Type\s*\/Page\b/g);
        if (pageMatches && pageMatches.length > 0) {
            return pageMatches.length;
        }
    } catch {
        // Fall back to default
    }

    return 1;
}

/**
 * Step 3: Resolves page counts of uploaded PDFs deterministically without making expensive upstream LLM calls.
 */
export async function resolvePageCountsStep(args: {
    files: File[];
    uploadedFiles?: LlmFile[];
    model?: string;
    provider?: QuestionGeneratorLlmProvider;
}): Promise<Array<{ fileName: string; pageCount: number }>> {
    const results = await Promise.all(
        args.files.map(async (file) => {
            try {
                const arrayBuffer = await file.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                const pageCount = await extractPdfPageCountFromBuffer(buffer);
                return {
                    fileName: file.name,
                    pageCount: Math.max(1, pageCount),
                };
            } catch {
                return {
                    fileName: file.name,
                    pageCount: 1,
                };
            }
        }),
    );

    return results;
}
