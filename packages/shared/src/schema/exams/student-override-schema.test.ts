import { describe, expect, it } from 'vitest';
import {
    batchCreateStudentExamAccessOverrideBodySchema,
    createAttemptScopedStudentExamAccessOverrideBodySchema,
    createStudentExamAccessOverrideBodySchema,
} from './student-override-schema';


describe('createStudentExamAccessOverrideBodySchema', () => {
    it('allows makeup overrides without a source attempt', () => {
        const result = createStudentExamAccessOverrideBodySchema.safeParse({
            studentId: '11111111-1111-4111-8111-111111111111',
            overrideType: 'MAKEUP',
            availableFrom: '2026-07-04T08:00:00.000Z',
            availableUntil: '2026-07-04T10:00:00.000Z',
            allowedAttempts: 1,
            sourceAttemptId: null,
        });

        expect(result.success).toBe(true);
    });

    it('requires a source attempt for retake overrides', () => {
        const result = createStudentExamAccessOverrideBodySchema.safeParse({
            studentId: '11111111-1111-4111-8111-111111111111',
            overrideType: 'RETAKE',
            availableFrom: '2026-07-04T08:00:00.000Z',
            availableUntil: '2026-07-04T10:00:00.000Z',
            allowedAttempts: 1,
            sourceAttemptId: null,
        });

        expect(result.success).toBe(false);
        expect(result.error?.issues[0]?.path).toEqual(['sourceAttemptId']);
    });
});

describe('createAttemptScopedStudentExamAccessOverrideBodySchema', () => {
    it('requires a source attempt for reopen overrides granted from an attempt route', () => {
        const result = createAttemptScopedStudentExamAccessOverrideBodySchema.safeParse({
            studentId: '11111111-1111-4111-8111-111111111111',
            overrideType: 'REOPEN',
            availableFrom: '2026-07-04T08:00:00.000Z',
            availableUntil: '2026-07-04T10:00:00.000Z',
            allowedAttempts: 1,
            sourceAttemptId: null,
        });

        expect(result.success).toBe(false);
        expect(result.error?.issues[0]?.path).toEqual(['sourceAttemptId']);
    });
});

describe('batchCreateStudentExamAccessOverrideBodySchema', () => {
    it('validates valid batch makeup payload', () => {
        const result = batchCreateStudentExamAccessOverrideBodySchema.safeParse({
            studentIds: [
                '11111111-1111-4111-8111-111111111111',
                '22222222-2222-4222-8222-222222222222',
            ],
            overrideType: 'MAKEUP',
            availableFrom: '2026-07-04T08:00:00.000Z',
            availableUntil: '2026-07-04T10:00:00.000Z',
            allowedAttempts: 1,
            notes: 'Batch makeup for absent cohort',
        });

        expect(result.success).toBe(true);
    });

    it('fails when studentIds array is empty', () => {
        const result = batchCreateStudentExamAccessOverrideBodySchema.safeParse({
            studentIds: [],
            overrideType: 'MAKEUP',
            availableFrom: '2026-07-04T08:00:00.000Z',
            availableUntil: '2026-07-04T10:00:00.000Z',
        });

        expect(result.success).toBe(false);
        expect(result.error?.issues[0]?.path).toEqual(['studentIds']);
    });
});

