import { type DifficultyConfig } from '@/features/exam/types';

// ─── Difficulty ───

export const DIFFICULTY_CONFIG: Record<string, DifficultyConfig> = {
     Easy: { color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' },
     Medium: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
     Hard: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
};

export const DEFAULT_DIFFICULTY_CONFIG = (iconColor: string, inputBg: string): DifficultyConfig => ({
     color: iconColor,
     bg: inputBg,
});

// ─── Hero Gradient ───

export const HERO_GRADIENT = {
     light: ['#323d8f', '#4a5fc1'] as const,
     dark: ['#1a1a2e', '#16213e'] as const,
};

// ─── Status Labels ───

export const STATUS_LABELS: Record<string, string> = {
     available: 'AVAILABLE',
     upcoming: 'UPCOMING',
     completed: 'COMPLETED',
};
