import { describe, expect, it } from 'vitest';
import {
    isPreviewMode,
    formatQuestionTypeLabel,
    getQuestionPrompt,
    hasAnswer,
    formatTimer,
    getExamContextDetails,
} from './utils';

describe('engine utils', () => {
    describe('isPreviewMode', () => {
        it('returns true if mode is preview', () => {
            expect(isPreviewMode('preview')).toBe(true);
            expect(isPreviewMode('attempt')).toBe(false);
        });
    });

    describe('formatQuestionTypeLabel', () => {
        it('replaces underscores with spaces', () => {
            expect(formatQuestionTypeLabel('MULTIPLE_CHOICE')).toBe('MULTIPLE CHOICE');
            expect(formatQuestionTypeLabel('TRUE_FALSE')).toBe('TRUE FALSE');
        });
    });

    describe('getQuestionPrompt', () => {
        it('returns prompt if present', () => {
            expect(getQuestionPrompt({ content: { prompt: 'What is 1+1?' } } as any)).toBe(
                'What is 1+1?',
            );
        });

        it('returns fallback string if prompt is missing', () => {
            expect(getQuestionPrompt({ content: {} } as any)).toBe('Question prompt unavailable.');
        });
    });

    describe('hasAnswer', () => {
        it('returns false for null or undefined', () => {
            expect(hasAnswer(null)).toBe(false);
            expect(hasAnswer(undefined)).toBe(false);
        });

        it('handles string values correctly', () => {
            expect(hasAnswer('  ')).toBe(false);
            expect(hasAnswer('abc')).toBe(true);
        });

        it('handles boolean and numbers correctly', () => {
            expect(hasAnswer(true)).toBe(true);
            expect(hasAnswer(false)).toBe(true);
            expect(hasAnswer(0)).toBe(true);
        });

        it('handles arrays correctly', () => {
            expect(hasAnswer([])).toBe(false);
            expect(hasAnswer(['  ', null])).toBe(false);
            expect(hasAnswer(['abc'])).toBe(true);
        });

        it('handles objects correctly', () => {
            expect(hasAnswer({})).toBe(false);
            expect(hasAnswer({ key: '  ' })).toBe(false);
            expect(hasAnswer({ key: 'abc' })).toBe(true);
        });
    });

    describe('formatTimer', () => {
        it('formats hours, minutes, and seconds', () => {
            expect(formatTimer(3661)).toBe('01:01:01');
            expect(formatTimer(59)).toBe('00:59');
            expect(formatTimer(0)).toBe('00:00');
        });
    });

    describe('getExamContextDetails', () => {
        it('renders passage details when passage content is present', () => {
            const details = getExamContextDetails({
                questionPassageContent: 'My Passage Content',
                questionPassageType: 'plain',
                questionSourceFileName: 'document.pdf',
                questionSourcePageNumber: 3,
            });

            expect(details.title).toBe('document.pdf');
            expect(details.description).toContain('Reference excerpt from page 3');
            expect(details.body).toContain('My Passage Content');
        });

        it('does not fall back to questionBody (sourceEvidence) when passageContent is absent', () => {
            const details = getExamContextDetails({
                questionBody: 'This is the question body (sourceEvidence)',
                questionPassageContent: null,
                questionPassageType: null,
            });

            expect(details.body).toBe('');
            expect(details.title).toBe('Question context');
        });

        it('falls back to exam description when passage is completely missing', () => {
            const details = getExamContextDetails({
                examDescription: 'This is the exam instruction description',
            });

            expect(details.title).toBe('Exam context');
            expect(details.body).toContain('This is the exam instruction description');
        });
    });
});
