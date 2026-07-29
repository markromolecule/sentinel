import { describe, expect, it } from 'vitest';
import { resolveExamSettings } from './resolve-exam-settings.service';

const globalSettings = {
    defaultShuffleQuestions: true,
    defaultShowCorrectAnswers: false,
    defaultAllowReview: true,
    defaultRandomizeChoices: true,
};

describe('resolveExamSettings', () => {
    it('stores null for omitted settings that already match global defaults', () => {
        const result = resolveExamSettings({
            payload: {},
            globalSettings,
        } as any);

        expect(result).toEqual({
            shuffleQuestions: null,
            showCorrectAnswers: null,
            allowReview: null,
            randomizeChoices: null,
        });
    });

    it('preserves explicit false overrides when globals default to true', () => {
        const result = resolveExamSettings({
            payload: {
                settings: {
                    shuffleQuestions: false,
                    allowReview: false,
                    randomizeChoices: false,
                },
            },
            globalSettings,
        } as any);

        expect(result).toMatchObject({
            shuffleQuestions: false,
            allowReview: false,
            randomizeChoices: false,
        });
    });

    it('reverts explicit null updates back to the current global defaults', () => {
        const result = resolveExamSettings({
            payload: {
                settings: {
                    randomizeChoices: null,
                    showCorrectAnswers: null,
                },
            },
            globalSettings,
            fallback: {
                shuffleQuestions: false,
                showCorrectAnswers: true,
                allowReview: false,
                randomizeChoices: false,
            },
        } as any);

        expect(result).toEqual({
            shuffleQuestions: false,
            showCorrectAnswers: null,
            allowReview: false,
            randomizeChoices: null,
        });
    });

    it('supports legacy top-level setting keys in payloads', () => {
        const result = resolveExamSettings({
            payload: {
                shuffleQuestions: false,
                randomizeChoices: false,
            },
            globalSettings,
            fallback: {
                shuffleQuestions: true,
                showCorrectAnswers: false,
                allowReview: true,
                randomizeChoices: true,
            },
        } as any);

        expect(result).toEqual({
            shuffleQuestions: false,
            showCorrectAnswers: null,
            allowReview: null,
            randomizeChoices: false,
        });
    });
});
