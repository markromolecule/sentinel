import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_EXAMINATION_GLOBAL_SETTINGS } from '@sentinel/shared/constants';
import { useUpdateExamMutation } from '@sentinel/hooks';
import { useExamEditForm } from './use-exam-edit-form';

vi.mock('@sentinel/hooks', () => ({
    useUpdateExamMutation: vi.fn(),
}));

describe('useExamEditForm', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useUpdateExamMutation).mockReturnValue({
            mutateAsync: vi.fn().mockResolvedValue(undefined),
            isPending: false,
        } as any);
    });

    it('prefills inherited defaults when exam detail omits settings', () => {
        const { result } = renderHook(() =>
            useExamEditForm(
                {
                    id: 'exam-1',
                    title: 'Algorithms Finals',
                    description: 'Long enough description for the edit form payload.',
                    subjectId: 'subject-1',
                    scheduledDate: '2026-07-29T08:00:00.000Z',
                    endDateTime: '2026-07-29T09:00:00.000Z',
                    duration: 60,
                    passingScore: undefined,
                    settings: undefined,
                    isPublic: false,
                } as any,
                vi.fn(),
            ),
        );

        expect(result.current.form.getValues('passingScore')).toBe(
            DEFAULT_EXAMINATION_GLOBAL_SETTINGS.defaultPassingScore,
        );
        expect(result.current.form.getValues('shuffleQuestions')).toBe(
            DEFAULT_EXAMINATION_GLOBAL_SETTINGS.defaultShuffleQuestions,
        );
        expect(result.current.form.getValues('randomizeChoices')).toBe(
            DEFAULT_EXAMINATION_GLOBAL_SETTINGS.defaultRandomizeChoices,
        );
    });

    it('preserves explicit zero passingScore instead of replacing it with a fallback', () => {
        const { result } = renderHook(() =>
            useExamEditForm(
                {
                    id: 'exam-2',
                    title: 'Practice Quiz',
                    description: 'Long enough description for the edit form payload.',
                    subjectId: 'subject-2',
                    scheduledDate: '2026-07-29T08:00:00.000Z',
                    endDateTime: '2026-07-29T09:00:00.000Z',
                    duration: 60,
                    passingScore: 0,
                    settings: {
                        shuffleQuestions: false,
                        showCorrectAnswers: false,
                        allowReview: false,
                        randomizeChoices: false,
                    },
                    isPublic: false,
                } as any,
                vi.fn(),
            ),
        );

        expect(result.current.form.getValues('passingScore')).toBe(0);
    });

    it('submits resolved edit values', async () => {
        const mutateAsync = vi.fn().mockResolvedValue(undefined);
        const onClose = vi.fn();
        vi.mocked(useUpdateExamMutation).mockReturnValue({
            mutateAsync,
            isPending: false,
        } as any);

        const { result } = renderHook(() =>
            useExamEditForm(
                {
                    id: 'exam-3',
                    status: 'draft',
                    title: 'Operating Systems',
                    description: 'Long enough description for the edit form payload.',
                    subjectId: 'subject-3',
                    scheduledDate: '2026-07-29T08:00:00.000Z',
                    endDateTime: '2026-07-29T09:00:00.000Z',
                    duration: 60,
                    passingScore: 82,
                    settings: {
                        shuffleQuestions: true,
                        showCorrectAnswers: false,
                        allowReview: true,
                        randomizeChoices: false,
                    },
                    isPublic: true,
                } as any,
                onClose,
            ),
        );

        await act(async () => {
            await result.current.onSubmit(result.current.form.getValues());
        });

        expect(mutateAsync).toHaveBeenCalledWith({
            id: 'exam-3',
            payload: expect.objectContaining({
                passingScore: 82,
                shuffleQuestions: true,
                randomizeChoices: false,
                isPublic: true,
            }),
        });
        expect(onClose).toHaveBeenCalled();
    });
});
