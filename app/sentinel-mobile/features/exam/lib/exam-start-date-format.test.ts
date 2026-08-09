import { describe, expect, it } from 'vitest';
import { formatExamStartDate } from './exam-start-date-format';

describe('formatExamStartDate helper', () => {
    it('formats valid ISO date strings correctly', () => {
        const result = formatExamStartDate('2026-08-10T09:30:00Z');
        // Depending on system timezone or explicit locale formatting,
        // we'll verify it returns a formatted date representation.
        expect(result).toContain('2026');
        expect(result).toContain('Aug');
    });

    it('formats Date objects correctly', () => {
        const date = new Date(Date.UTC(2026, 7, 10, 9, 30));
        const result = formatExamStartDate(date);
        expect(result).toContain('2026');
        expect(result).toContain('Aug');
    });

    it('returns custom fallback when date is missing or null', () => {
        expect(formatExamStartDate(null)).toBe('TBD');
        expect(formatExamStartDate(undefined)).toBe('TBD');
        expect(formatExamStartDate(null, 'Not Scheduled')).toBe('Not Scheduled');
    });

    it('returns fallback for invalid dates', () => {
        expect(formatExamStartDate('invalid-date-string')).toBe('TBD');
        expect(formatExamStartDate(new Date('invalid-date'), 'TBD')).toBe('TBD');
    });
});
