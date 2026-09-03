import { describe, expect, it, vi } from 'vitest';
import type { DbClient } from '@sentinel/db';
import {
    getActiveStudentExamOverride,
    getPendingOrActiveStudentExamOverride,
    listExamOverrides,
    listStudentExamOverrides,
} from './list-student-exam-overrides.service';
import { StudentOverridesRepository } from '../data/student-overrides.repository';
import type { StudentExamAccessOverride } from '../student-overrides.dto';

describe('list-student-exam-overrides.service', () => {
    const examId = '22222222-2222-4222-8222-222222222222';
    const studentId = '33333333-3333-4333-8333-333333333333';
    const overrideId = '11111111-1111-4111-8111-111111111111';

    const override1: StudentExamAccessOverride = {
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

    it('lists exam overrides correctly', async () => {
        const dbClient = {} as DbClient;
        vi.spyOn(StudentOverridesRepository, 'listExamOverrideRecords').mockResolvedValue([
            {
                setting_key: `exam.student-override.${examId}.${studentId}.${overrideId}`,
                setting_value: override1,
                created_at: override1.createdAt,
                updated_at: override1.updatedAt,
            },
        ]);

        const results = await listExamOverrides(dbClient, examId);
        expect(results).toHaveLength(1);
        expect(results[0]?.id).toBe(overrideId);
    });

    it('gets active and pending overrides correctly based on current time', async () => {
        const dbClient = {} as DbClient;
        vi.spyOn(StudentOverridesRepository, 'listStudentExamOverrideRecords').mockResolvedValue([
            {
                setting_key: `exam.student-override.${examId}.${studentId}.${overrideId}`,
                setting_value: override1,
                created_at: override1.createdAt,
                updated_at: override1.updatedAt,
            },
        ]);

        const active = await getActiveStudentExamOverride({
            dbClient,
            examId,
            studentId,
            now: new Date('2026-04-13T07:00:00.000Z'),
        });
        expect(active?.id).toBe(overrideId);

        const pending = await getPendingOrActiveStudentExamOverride({
            dbClient,
            examId,
            studentId,
            now: new Date('2026-04-13T05:30:00.000Z'),
        });
        expect(pending?.id).toBe(overrideId);

        const expired = await getActiveStudentExamOverride({
            dbClient,
            examId,
            studentId,
            now: new Date('2026-04-13T09:00:00.000Z'),
        });
        expect(expired).toBeNull();
    });
});
