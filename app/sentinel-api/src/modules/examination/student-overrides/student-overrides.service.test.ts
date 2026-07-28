import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DbClient } from '@sentinel/db';
import { StudentOverridesService } from './student-overrides.service';

function createSelectBuilder(result: unknown) {
    return {
        leftJoin: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        executeTakeFirst: vi.fn().mockResolvedValue(result),
    };
}

describe('StudentOverridesService reconnect overrides', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('grants a one-time reconnect override when the reconnect limit has been reached', async () => {
        const now = new Date('2026-04-13T05:30:00.000Z');
        const dbClient = {
            selectFrom: vi.fn().mockReturnValue(
                createSelectBuilder({
                    attempt_id: 'attempt-1',
                    reconnect_attempt_count: 3,
                    max_reconnect_attempts: 3,
                    status: 'IN_PROGRESS',
                    end_date_time: new Date('2026-04-13T06:00:00.000Z'),
                }),
            ),
        } as unknown as DbClient;
        const createdOverride = {
            id: '11111111-1111-4111-8111-111111111111',
            examId: '22222222-2222-4222-8222-222222222222',
            studentId: '33333333-3333-4333-8333-333333333333',
            grantedBy: '44444444-4444-4444-8444-444444444444',
            overrideType: 'REOPEN' as const,
            availableFrom: now.toISOString(),
            availableUntil: '2026-04-13T06:00:00.000Z',
            allowedAttempts: 1,
            usedAttempts: 0,
            usedAttemptIds: [],
            sourceAttemptId: 'attempt-1',
            notes: 'Network dropped.',
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
        };
        const createOverrideSpy = vi
            .spyOn(StudentOverridesService, 'createStudentExamAccessOverride')
            .mockResolvedValue(createdOverride);

        const result = await StudentOverridesService.createReconnectLimitOverride({
            dbClient,
            examId: createdOverride.examId,
            studentId: createdOverride.studentId,
            reason: 'Network dropped.',
            grantedBy: createdOverride.grantedBy,
            now,
        });

        expect(result).toEqual(createdOverride);
        expect(createOverrideSpy).toHaveBeenCalledWith({
            dbClient,
            examId: createdOverride.examId,
            body: {
                studentId: createdOverride.studentId,
                overrideType: 'REOPEN',
                availableFrom: now.toISOString(),
                availableUntil: '2026-04-13T06:00:00.000Z',
                allowedAttempts: 1,
                sourceAttemptId: 'attempt-1',
                notes: 'Network dropped.',
            },
            grantedBy: createdOverride.grantedBy,
        });
    });
});
