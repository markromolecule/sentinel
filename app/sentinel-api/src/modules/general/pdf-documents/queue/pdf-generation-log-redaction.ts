export type PdfDocumentKind = 'ANALYTICS_OVERALL' | 'EXAM_ANSWER_KEY' | 'EXAM_RESULTS_REPORT';

const ANSWER_KEY_LOG_ERROR_MESSAGE =
    'Answer key export failed. Details are redacted because the renderer error can include answer text.';

export function getPdfGenerationLogErrorMessage(
    documentKind: PdfDocumentKind | undefined,
    error: unknown,
): string {
    if (documentKind === 'EXAM_ANSWER_KEY') {
        return ANSWER_KEY_LOG_ERROR_MESSAGE;
    }

    if (error instanceof Error && error.message) {
        return error.message;
    }

    return 'Unknown PDF generation failure.';
}
