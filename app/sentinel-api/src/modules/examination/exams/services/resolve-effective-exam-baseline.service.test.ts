import { describe, expect, it } from 'vitest';
import { DEFAULT_EXAMINATION_GLOBAL_SETTINGS } from '@sentinel/shared/constants';
import { resolveEffectiveExamBaseline } from './resolve-effective-exam-baseline.service';

describe('resolveEffectiveExamBaseline', () => {
    it('uses explicit exam-local values when present', () => {
        const result = resolveEffectiveExamBaseline({
            duration_minutes: 90,
            passing_score: 82,
            shuffle_questions: true,
            show_correct_answers: false,
            allow_review: true,
            randomize_choices: true,
        });

        expect(result).toEqual({
            durationMinutes: 90,
            passingScore: 82,
            settings: {
                shuffleQuestions: true,
                showCorrectAnswers: false,
                allowReview: true,
                randomizeChoices: true,
            },
        });
    });

    it('falls back to support-managed defaults when nullable fields are unset', () => {
        const result = resolveEffectiveExamBaseline(
            {
                duration_minutes: null as any,
                passing_score: null,
                shuffle_questions: null,
                show_correct_answers: null,
                allow_review: null,
                randomize_choices: null,
            },
            {
                ...DEFAULT_EXAMINATION_GLOBAL_SETTINGS,
                defaultDurationMinutes: 75,
                defaultPassingScore: 68,
                defaultShuffleQuestions: true,
                defaultAllowReview: false,
                defaultRandomizeChoices: false,
            },
        );

        expect(result).toEqual({
            durationMinutes: 75,
            passingScore: 68,
            settings: {
                shuffleQuestions: true,
                showCorrectAnswers: false,
                allowReview: false,
                randomizeChoices: false,
            },
        });
    });

    it('gracefully handles malformed global fallback payloads', () => {
        const result = resolveEffectiveExamBaseline(
            {
                duration_minutes: null as any,
                passing_score: null,
            },
            {
                defaultDurationMinutes: Number.NaN,
            } as any,
        );

        expect(result.durationMinutes).toBe(
            DEFAULT_EXAMINATION_GLOBAL_SETTINGS.defaultDurationMinutes,
        );
        expect(result.passingScore).toBe(DEFAULT_EXAMINATION_GLOBAL_SETTINGS.defaultPassingScore);
    });
});
