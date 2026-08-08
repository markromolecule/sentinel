import { describe, expect, it, vi } from 'vitest';
import { type DbClient } from '@sentinel/db';
import { DEFAULT_EXAMINATION_GLOBAL_SETTINGS } from '@sentinel/shared/constants';
import { getWaitingList } from './get-waiting-list';

function createSelectBuilder(result: unknown) {
    return {
        leftJoin: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        execute: vi.fn().mockResolvedValue(result),
        executeTakeFirst: vi.fn().mockResolvedValue(result),
    };
}

describe('getWaitingList', () => {
    it('maps latest attempt state and configured reconnect limit onto each admission', async () => {
        const configSelect = createSelectBuilder({
            max_reconnect_attempts: 3,
        });
        const admissionsSelect = createSelectBuilder([
            {
                admission_id: 'admission-1',
                student_id: 'student-1',
                status: 'WAITING',
                checked_in_at: new Date('2026-07-28T09:00:00.000Z'),
                decided_at: null,
                student_number: '2026-001',
                first_name: 'Pat',
                last_name: 'Student',
            },
            {
                admission_id: 'admission-2',
                student_id: 'student-2',
                status: 'APPROVED',
                checked_in_at: new Date('2026-07-28T09:01:00.000Z'),
                decided_at: new Date('2026-07-28T09:02:00.000Z'),
                student_number: '2026-002',
                first_name: 'Alex',
                last_name: 'Learner',
            },
        ]);
        const attemptsSelect = createSelectBuilder([
            {
                student_id: 'student-1',
                status: 'IN_PROGRESS',
                created_at: new Date('2026-07-28T09:05:00.000Z'),
                reconnect_attempt_count: 2,
            },
            {
                student_id: 'student-1',
                status: 'SUBMITTED',
                created_at: new Date('2026-07-28T08:00:00.000Z'),
                reconnect_attempt_count: 1,
            },
        ]);
        const dbClient = {
            selectFrom: vi
                .fn()
                .mockReturnValueOnce(configSelect)
                .mockReturnValueOnce(admissionsSelect)
                .mockReturnValueOnce(attemptsSelect),
        } as unknown as DbClient;

        const result = await getWaitingList(dbClient, 'exam-1');

        expect(result).toEqual([
            {
                admissionId: 'admission-1',
                studentId: 'student-1',
                studentName: 'Pat Student',
                studentNumber: '2026-001',
                status: 'WAITING',
                checkedInAt: '2026-07-28T09:00:00.000Z',
                decidedAt: null,
                hasActiveAttempt: true,
                attemptStatus: 'IN_PROGRESS',
                reconnectCount: 2,
                maxReconnectAttempts: 3,
            },
            {
                admissionId: 'admission-2',
                studentId: 'student-2',
                studentName: 'Alex Learner',
                studentNumber: '2026-002',
                status: 'APPROVED',
                checkedInAt: '2026-07-28T09:01:00.000Z',
                decidedAt: '2026-07-28T09:02:00.000Z',
                hasActiveAttempt: false,
                attemptStatus: null,
                reconnectCount: 0,
                maxReconnectAttempts: 3,
            },
        ]);
    });

    it('falls back to DEFAULT_EXAMINATION_GLOBAL_SETTINGS.defaultMaxReconnectAttempts when max_reconnect_attempts is null', async () => {
        // exam_configurations row exists but max_reconnect_attempts is null (unconfigured)
        const configSelect = createSelectBuilder({ max_reconnect_attempts: null });
        const admissionsSelect = createSelectBuilder([
            {
                admission_id: 'admission-1',
                student_id: 'student-1',
                status: 'WAITING',
                checked_in_at: new Date('2026-08-08T09:00:00.000Z'),
                decided_at: null,
                student_number: '2026-100',
                first_name: 'Jane',
                last_name: 'Reconnect',
            },
        ]);
        const attemptsSelect = createSelectBuilder([
            {
                student_id: 'student-1',
                status: 'IN_PROGRESS',
                created_at: new Date('2026-08-08T09:05:00.000Z'),
                reconnect_attempt_count: 1,
            },
        ]);
        const dbClient = {
            selectFrom: vi
                .fn()
                .mockReturnValueOnce(configSelect)
                .mockReturnValueOnce(admissionsSelect)
                .mockReturnValueOnce(attemptsSelect),
        } as unknown as DbClient;

        const result = await getWaitingList(dbClient, 'exam-2');

        expect(result).toHaveLength(1);
        expect(result[0].maxReconnectAttempts).toBe(
            DEFAULT_EXAMINATION_GLOBAL_SETTINGS.defaultMaxReconnectAttempts,
        );
        expect(result[0].reconnectCount).toBe(1);
    });

    it('falls back to DEFAULT_EXAMINATION_GLOBAL_SETTINGS.defaultMaxReconnectAttempts when no exam configuration row exists', async () => {
        // no exam_configurations row at all
        const configSelect = createSelectBuilder(undefined);
        const admissionsSelect = createSelectBuilder([
            {
                admission_id: 'admission-1',
                student_id: 'student-1',
                status: 'WAITING',
                checked_in_at: new Date('2026-08-08T09:00:00.000Z'),
                decided_at: null,
                student_number: '2026-101',
                first_name: 'Carlos',
                last_name: 'NoConfig',
            },
        ]);
        const attemptsSelect = createSelectBuilder([]);
        const dbClient = {
            selectFrom: vi
                .fn()
                .mockReturnValueOnce(configSelect)
                .mockReturnValueOnce(admissionsSelect)
                .mockReturnValueOnce(attemptsSelect),
        } as unknown as DbClient;

        const result = await getWaitingList(dbClient, 'exam-3');

        expect(result).toHaveLength(1);
        expect(result[0].maxReconnectAttempts).toBe(
            DEFAULT_EXAMINATION_GLOBAL_SETTINGS.defaultMaxReconnectAttempts,
        );
    });
});

