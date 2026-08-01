import { describe, expect, it } from 'vitest';
import { getPdfGenerationLogErrorMessage } from './pdf-generation-log-redaction';

describe('getPdfGenerationLogErrorMessage', () => {
    it('redacts answer-key failure text before console or audit logging', () => {
        const message = getPdfGenerationLogErrorMessage(
            'EXAM_ANSWER_KEY',
            new Error('Renderer failed near answer: Manila'),
        );

        expect(message).toBe(
            'Answer key export failed. Details are redacted because the renderer error can include answer text.',
        );
        expect(message).not.toContain('Manila');
    });

    it('preserves non-answer-key failure text for operational diagnosis', () => {
        expect(
            getPdfGenerationLogErrorMessage(
                'EXAM_RESULTS_REPORT',
                new Error('Report template missing columns'),
            ),
        ).toBe('Report template missing columns');
    });
});
