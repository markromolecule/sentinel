import { describe, expect, it } from 'vitest';
import { UnrecoverableError } from 'bullmq';
import { ExamAnswerKeyDocumentProcessor } from './exam-answer-key.processor';

describe('ExamAnswerKeyDocumentProcessor', () => {
    const processor = new ExamAnswerKeyDocumentProcessor();

    it('does not persist answer text from transient processor errors', () => {
        const updateSet = processor.getFailedUpdateSet(
            new Error('Renderer failed near answer: Manila'),
        );

        expect(updateSet.failure_code).toBe('TRANSIENT_ERROR');
        expect(updateSet.failure_message).toBe(
            'Answer key export failed because of a transient processing error.',
        );
        expect(updateSet.failure_message).not.toContain('Manila');
    });

    it('does not persist answer text from unrecoverable source errors', () => {
        const updateSet = processor.getFailedUpdateSet(
            new UnrecoverableError('Malformed content includes answer: Paris'),
        );

        expect(updateSet.failure_code).toBe('UNRECOVERABLE_ERROR');
        expect(updateSet.failure_message).toBe(
            'Answer key export failed because the source data could not be processed.',
        );
        expect(updateSet.failure_message).not.toContain('Paris');
    });
});
