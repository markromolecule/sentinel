import { describe, expect, it } from 'vitest';
import {
    compareOverrideFreshness,
    isActiveOverride,
    isPendingOrActiveOverride,
    normalizeSourceAttemptId,
    parseDateValue,
    parseOverrideRecord,
    toIsoDate,
} from './student-overrides-helpers';
import type { StudentExamAccessOverride } from '../student-overrides.dto';

describe('student-overrides-helpers', () => {
    describe('parseDateValue and toIsoDate', () => {
        it('parses valid date strings and Date instances', () => {
            const dateStr = '2026-04-13T06:00:00.000Z';
            const parsed = parseDateValue(dateStr);
            expect(parsed).toBeInstanceOf(Date);
            expect(parsed?.toISOString()).toBe(dateStr);
            expect(toIsoDate(dateStr)).toBe(dateStr);

            const directDate = new Date(dateStr);
            expect(parseDateValue(directDate)).toBe(directDate);
            expect(toIsoDate(directDate)).toBe(dateStr);
        });

        it('returns null for falsy or invalid dates', () => {
            expect(parseDateValue(null)).toBeNull();
            expect(parseDateValue(undefined)).toBeNull();
            expect(parseDateValue('invalid-date')).toBeNull();
            expect(toIsoDate(null)).toBeNull();
            expect(toIsoDate('invalid-date')).toBeNull();
        });
    });

    describe('parseOverrideRecord', () => {
        it('parses valid override records from system settings', () => {
            const overridePayload: StudentExamAccessOverride = {
                id: '11111111-1111-4111-8111-111111111111',
                examId: '22222222-2222-4222-8222-222222222222',
                studentId: '33333333-3333-4333-8333-333333333333',
                grantedBy: '44444444-4444-4444-8444-444444444444',
                overrideType: 'MAKEUP',
                availableFrom: '2026-04-13T06:00:00.000Z',
                availableUntil: '2026-04-13T08:00:00.000Z',
                allowedAttempts: 1,
                usedAttempts: 0,
                usedAttemptIds: [],
                sourceAttemptId: null,
                notes: 'Makeup test',
                createdAt: '2026-04-13T05:00:00.000Z',
                updatedAt: '2026-04-13T05:00:00.000Z',
            };

            const parsed = parseOverrideRecord({
                setting_key: 'exam.student-override.22222222-2222-4222-8222-222222222222.33333333-3333-4333-8333-333333333333.11111111-1111-4111-8111-111111111111',
                setting_value: overridePayload,
            });

            expect(parsed).not.toBeNull();
            expect(parsed?.id).toBe(overridePayload.id);
            expect(parsed?.settingKey).toBe('exam.student-override.22222222-2222-4222-8222-222222222222.33333333-3333-4333-8333-333333333333.11111111-1111-4111-8111-111111111111');
        });

        it('returns null for invalid record payloads', () => {
            const parsed = parseOverrideRecord({
                setting_key: 'invalid.key',
                setting_value: { invalid: 'data' },
            });
            expect(parsed).toBeNull();
        });
    });

    describe('compareOverrideFreshness', () => {
        it('sorts newer updated overrides first', () => {
            const older = {
                updatedAt: '2026-04-13T05:00:00.000Z',
                createdAt: '2026-04-13T05:00:00.000Z',
                availableUntil: '2026-04-13T08:00:00.000Z',
            };
            const newer = {
                updatedAt: '2026-04-13T06:00:00.000Z',
                createdAt: '2026-04-13T05:00:00.000Z',
                availableUntil: '2026-04-13T08:00:00.000Z',
            };

            expect(compareOverrideFreshness(older, newer)).toBeGreaterThan(0);
            expect(compareOverrideFreshness(newer, older)).toBeLessThan(0);
        });
    });

    describe('isActiveOverride and isPendingOrActiveOverride', () => {
        const baseOverride: StudentExamAccessOverride = {
            id: '11111111-1111-4111-8111-111111111111',
            examId: '22222222-2222-4222-8222-222222222222',
            studentId: '33333333-3333-4333-8333-333333333333',
            grantedBy: null,
            overrideType: 'MAKEUP',
            availableFrom: '2026-04-13T06:00:00.000Z',
            availableUntil: '2026-04-13T08:00:00.000Z',
            allowedAttempts: 1,
            usedAttempts: 0,
            usedAttemptIds: [],
            sourceAttemptId: null,
            notes: null,
            createdAt: '2026-04-13T05:00:00.000Z',
            updatedAt: '2026-04-13T05:00:00.000Z',
        };

        it('identifies active overrides during their valid time window', () => {
            const beforeWindow = new Date('2026-04-13T05:59:59.000Z');
            const duringWindow = new Date('2026-04-13T07:00:00.000Z');
            const afterWindow = new Date('2026-04-13T08:00:01.000Z');

            expect(isActiveOverride(baseOverride, beforeWindow)).toBe(false);
            expect(isActiveOverride(baseOverride, duringWindow)).toBe(true);
            expect(isActiveOverride(baseOverride, afterWindow)).toBe(false);
        });

        it('identifies pending or active overrides before expiration', () => {
            const beforeWindow = new Date('2026-04-13T05:59:59.000Z');
            const duringWindow = new Date('2026-04-13T07:00:00.000Z');
            const afterWindow = new Date('2026-04-13T08:00:01.000Z');

            expect(isPendingOrActiveOverride(baseOverride, beforeWindow)).toBe(true);
            expect(isPendingOrActiveOverride(baseOverride, duringWindow)).toBe(true);
            expect(isPendingOrActiveOverride(baseOverride, afterWindow)).toBe(false);
        });

        it('returns false if used attempts equals or exceeds allowed attempts', () => {
            const exhausted = { ...baseOverride, usedAttempts: 1 };
            const duringWindow = new Date('2026-04-13T07:00:00.000Z');
            expect(isActiveOverride(exhausted, duringWindow)).toBe(false);
            expect(isPendingOrActiveOverride(exhausted, duringWindow)).toBe(false);
        });
    });

    describe('normalizeSourceAttemptId', () => {
        it('preserves sourceAttemptId for RETAKE and REOPEN', () => {
            expect(
                normalizeSourceAttemptId({
                    overrideType: 'RETAKE',
                    sourceAttemptId: 'attempt-123',
                }),
            ).toBe('attempt-123');

            expect(
                normalizeSourceAttemptId({
                    overrideType: 'REOPEN',
                    sourceAttemptId: 'attempt-123',
                }),
            ).toBe('attempt-123');
        });

        it('returns null for other override types or missing attempt id', () => {
            expect(
                normalizeSourceAttemptId({
                    overrideType: 'MAKEUP',
                    sourceAttemptId: 'attempt-123',
                }),
            ).toBeNull();

            expect(
                normalizeSourceAttemptId({
                    overrideType: 'RETAKE',
                    sourceAttemptId: null,
                }),
            ).toBeNull();
        });
    });
});
