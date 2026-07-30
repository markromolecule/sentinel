import type { QuestionDifficulty } from '@sentinel/shared/types';

export const DEFAULT_POINTS = 1;
export const DEFAULT_DIFFICULTY: QuestionDifficulty = 'MODERATE';
export const DIFFICULTY_OPTIONS: Array<{
    label: string;
    value: QuestionDifficulty;
}> = [
    { label: 'Easy', value: 'EASY' },
    { label: 'Moderate', value: 'MODERATE' },
    { label: 'Hard', value: 'HARD' },
];
