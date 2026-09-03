import { describe, expect, it, vi } from 'vitest';
import type { DbClient } from '@sentinel/db';
import { markOverrideUsed } from './mark-override-used.service';
import { StudentOverridesRepository } from '../data/student-overrides.repository';
import type { StudentExamAccessOverride } from '../student-overrides.dto';

describe('markOverrideUsed', () => {
    const examId = '22222222-2222-4222-8222-222222222222';
    const studentId = '33333333-3333-4333-8333-333333333333';
    const overrideId = '11111111-1111-4111-8111-111111111111';
    const attemptId = '55555555-5555-4555-8555-555555555555';

    it('increments usedAttempts and records attemptId for MAKEUP override', async () => {
        const storedOverride: StudentExamAccessOverride = {
            id: overrideId,
            examId,
            studentId,
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

        const dbClient = {} as DbClient;
        vi.spyOn(StudentOverridesRepository, 'listStudentExamOverrideRecords').mockResolvedValue([
            {
                setting_key: `exam.student-override.${examId}.${studentId}.${overrideId}`,
                setting_value: storedOverride,
                created_at: storedOverride.createdAt,
                updated_at: storedOverride.updatedAt,
            },
        ]);
        const updateSpy = vi
            .spyOn(StudentOverridesRepository, 'updateExamOverrideRecord')
            .mockResolvedValue({} as any);

        const result = await markOverrideUsed({
            dbClient,
            accessOverride: storedOverride,
            attemptId,
            updatedBy: 'user-admin',
        });

        expect(result).not.toBeNull();
        expect(result?.usedAttempts).toBe(1);
        expect(result?.usedAttemptIds).toEqual([attemptId]);
        expect(updateSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                settingKey: `exam.student-override.${examId}.${studentId}.${overrideId}`,
                updatedBy: 'user-admin',
            }),
        );
    });

    it('does not increment usedAttempts for REOPEN if attemptId is already used', async () => {
        const storedOverride: StudentExamAccessOverride = {
            id: overrideId,
            examId,
            studentId,
            grantedBy: null,
            overrideType: 'REOPEN',
            availableFrom: '2026-04-13T06:00:00.000Z',
            availableUntil: '2026-04-13T08:00:00.000Z',
            allowedAttempts: 1,
            usedAttempts: 1,
            usedAttemptIds: [attemptId],
            sourceAttemptId: attemptId,
            notes: null,
            createdAt: '2026-04-13T05:00:00.000Z',
            updatedAt: '2026-04-13T05:00:00.000Z',
        };

        const dbClient = {} as DbClient;
        vi.spyOn(StudentOverridesRepository, 'listStudentExamOverrideRecords').mockResolvedValue([
            {
                setting_key: `exam.student-override.${examId}.${studentId}.${overrideId}`,
                setting_value: storedOverride,
                created_at: storedOverride.createdAt,
                updated_at: storedOverride.updatedAt,
            },
        ]);
        vi.spyOn(StudentOverridesRepository, 'updateExamOverrideRecord').mockResolvedValue(
            {} as any,
        );

        const result = await markOverrideUsed({
            dbClient,
            accessOverride: storedOverride,
            attemptId,
        });

        expect(result).not.toBeNull();
        expect(result?.usedAttempts).toBe(1);
        expect(result?.usedAttemptIds).toEqual([attemptId]);
    });
});
