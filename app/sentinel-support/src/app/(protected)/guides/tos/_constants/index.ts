import type { BloomLevel } from '@sentinel/services';

export const BLOOM_LEVELS: BloomLevel[] = [
    'REMEMBERING',
    'UNDERSTANDING',
    'APPLYING',
    'ANALYZING',
    'EVALUATING',
    'CREATING',
];

export const BLOOM_LEVEL_LABELS: Record<BloomLevel, string> = {
    REMEMBERING: 'Remembering',
    UNDERSTANDING: 'Understanding',
    APPLYING: 'Applying',
    ANALYZING: 'Analyzing',
    EVALUATING: 'Evaluating',
    CREATING: 'Creating',
};

export const BLOOM_LEVEL_COLORS: Record<BloomLevel, string> = {
    REMEMBERING: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    UNDERSTANDING: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300',
    APPLYING: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    ANALYZING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
    EVALUATING: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
    CREATING: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
};

export const BLOOM_LEVEL_HEADER_COLORS: Record<BloomLevel, string> = {
    REMEMBERING: 'bg-blue-50 dark:bg-blue-950/30',
    UNDERSTANDING: 'bg-cyan-50 dark:bg-cyan-950/30',
    APPLYING: 'bg-green-50 dark:bg-green-950/30',
    ANALYZING: 'bg-yellow-50 dark:bg-yellow-950/30',
    EVALUATING: 'bg-orange-50 dark:bg-orange-950/30',
    CREATING: 'bg-purple-50 dark:bg-purple-950/30',
};
