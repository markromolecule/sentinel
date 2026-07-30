import { describe, expect, it } from 'vitest';
import { normalizeQuestionContentShape } from './content-shape';

describe('normalizeQuestionContentShape', () => {
    it('strips leading option labels from multiple-choice options', () => {
        const content = normalizeQuestionContentShape('MULTIPLE_CHOICE', {
            prompt: 'What is the capital of France?',
            options: ['A. Paris', 'B) Rome', '(C) Madrid', 'D - Berlin'],
            correctAnswerText: 'A. Paris',
        }) as {
            options: string[];
            correctAnswer: string;
        };

        expect(content.options).toEqual(['Paris', 'Rome', 'Madrid', 'Berlin']);
        expect(content.correctAnswer).toBe('Paris');
    });

    it('resolves a labeled multiple-choice answer key from a bare option letter', () => {
        const content = normalizeQuestionContentShape('MULTIPLE_CHOICE', {
            prompt: 'What is the capital of France?',
            options: ['A. Paris', 'B. Rome', 'C. Madrid', 'D. Berlin'],
            correctAnswerText: 'A',
        }) as {
            options: string[];
            correctAnswer: string;
        };

        expect(content.options).toEqual(['Paris', 'Rome', 'Madrid', 'Berlin']);
        expect(content.correctAnswer).toBe('Paris');
    });

    it('preserves a clean multiple-choice answer after option labels are stripped', () => {
        const content = normalizeQuestionContentShape('MULTIPLE_CHOICE', {
            prompt: 'What is the capital of France?',
            options: ['A. Paris', 'B. Rome', 'C. Madrid', 'D. Berlin'],
            answer: 'Paris',
        }) as {
            options: string[];
            correctAnswer: string;
        };

        expect(content.options).toEqual(['Paris', 'Rome', 'Madrid', 'Berlin']);
        expect(content.correctAnswer).toBe('Paris');
    });

    it.each([
        ['Option A', 'Paris'],
        ['choice B', 'Rome'],
        ['Option 3', 'Madrid'],
        ['"Paris."', 'Paris'],
    ])('resolves generated answer representation %s', (answer, expected) => {
        const content = normalizeQuestionContentShape('MULTIPLE_CHOICE', {
            prompt: 'What is the capital of France?',
            options: ['Paris', 'Rome', 'Madrid', 'Berlin'],
            correctAnswerText: answer,
        }) as {
            correctAnswer: string;
        };

        expect(content.correctAnswer).toBe(expected);
    });

    it('strips leading option labels from multiple-response options and answers', () => {
        const content = normalizeQuestionContentShape('MULTIPLE_RESPONSE', {
            prompt: 'Which are prime numbers?',
            options: ['A. Two', 'B) Three', '(C) Four', 'D - Five'],
            correctAnswerList: ['A. Two', 'B) Three', 'D - Five'],
        }) as {
            options: string[];
            correctAnswer: string[];
        };

        expect(content.options).toEqual(['Two', 'Three', 'Four', 'Five']);
        expect(content.correctAnswer).toEqual(['Two', 'Three', 'Five']);
    });

    it('resolves multiple-response answers from a mix of bare labels, labeled values, and clean text', () => {
        const content = normalizeQuestionContentShape('MULTIPLE_RESPONSE', {
            prompt: 'Which are prime numbers?',
            options: ['A. Two', 'B) Three', '(C) Four', 'D - Five'],
            answers: ['A', 'B) Three', 'Five'],
        }) as {
            options: string[];
            correctAnswer: string[];
        };

        expect(content.options).toEqual(['Two', 'Three', 'Four', 'Five']);
        expect(content.correctAnswer).toEqual(['Two', 'Three', 'Five']);
    });
});
