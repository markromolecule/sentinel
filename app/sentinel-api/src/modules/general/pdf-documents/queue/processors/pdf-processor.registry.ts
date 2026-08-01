import { AnalyticsOverallDocumentProcessor } from './analytics-overall.processor';
import { ExamAnswerKeyDocumentProcessor } from './exam-answer-key.processor';
import type { PdfDocumentProcessor } from './pdf-document-processor.interface';

const processors: Record<string, PdfDocumentProcessor> = {
    ANALYTICS_OVERALL: new AnalyticsOverallDocumentProcessor(),
    EXAM_ANSWER_KEY: new ExamAnswerKeyDocumentProcessor(),
};

/**
 * Retrieves the appropriate PDF document processor for the given document kind.
 *
 * @param documentKind the type of document
 * @throws Error if the document kind is not registered
 */
export function getPdfProcessor(
    documentKind: 'ANALYTICS_OVERALL' | 'EXAM_ANSWER_KEY' | 'EXAM_RESULTS_REPORT',
): PdfDocumentProcessor {
    if (documentKind === 'EXAM_RESULTS_REPORT') {
        throw new Error(`Unsupported document kind for PDF generation: EXAM_RESULTS_REPORT (unsupported processor)`);
    }
    const processor = processors[documentKind];
    if (!processor) {
        throw new Error(`Unsupported document kind for PDF generation: ${documentKind}`);
    }
    return processor;
}
