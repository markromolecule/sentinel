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

    it('batch creates student exam access overrides for multiple students', async () => {
        const dbClient = {} as DbClient;
        const examId = '22222222-2222-4222-8222-222222222222';
        const studentIds = [
            '11111111-1111-4111-8111-111111111111',
            '33333333-3333-4333-8333-333333333333',
        ];
        const createOverrideSpy = vi
            .spyOn(StudentOverridesService, 'createStudentExamAccessOverride')
            .mockImplementation(async (args) => ({
                id: `override-${args.body.studentId}`,
                examId: args.examId,
                studentId: args.body.studentId,
                grantedBy: args.grantedBy ?? null,
                overrideType: args.body.overrideType,
                availableFrom: String(args.body.availableFrom),
                availableUntil: String(args.body.availableUntil),
                allowedAttempts: args.body.allowedAttempts ?? 1,
                usedAttempts: 0,
                usedAttemptIds: [],
                sourceAttemptId: null,
                notes: args.body.notes ?? null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            }));

        const results = await StudentOverridesService.batchCreateStudentExamAccessOverrides({
            dbClient,
            examId,
            body: {
                studentIds,
                overrideType: 'MAKEUP',
                availableFrom: '2026-04-13T06:00:00.000Z',
                availableUntil: '2026-04-13T08:00:00.000Z',
                allowedAttempts: 1,
                notes: 'Batch makeup window',
            },
            grantedBy: 'instructor-1',
        });

        expect(results).toHaveLength(2);
        expect(results[0]?.studentId).toBe(studentIds[0]);
        expect(results[1]?.studentId).toBe(studentIds[1]);
        expect(createOverrideSpy).toHaveBeenCalledTimes(2);
    });

    it('atomically unlocks attempt, resets reconnect count to 0, approves lobby admission, and broadcasts event', async () => {
        const now = new Date('2026-04-13T05:30:00.000Z');
        const updateAttemptBuilder = {
            set: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            execute: vi.fn().mockResolvedValue(undefined),
        };
        const updateLobbyBuilder = {
            set: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            execute: vi.fn().mockResolvedValue(undefined),
        };
        const insertBuilder = {
            values: vi.fn().mockReturnThis(),
            returningAll: vi.fn().mockReturnThis(),
            executeTakeFirstOrThrow: vi.fn().mockResolvedValue({
                event_id: 'event-1',
                attempt_id: 'attempt-locked',
                exam_id: 'exam-1',
                student_id: 'student-1',
                event_type: 'REOPENED',
                previous_state: 'LOCKED',
                next_state: 'IN_PROGRESS',
                created_at: now,
            }),
            execute: vi.fn().mockResolvedValue(undefined),
        };

        const dbClient = {
            selectFrom: vi.fn().mockReturnValue(
                createSelectBuilder({
                    attempt_id: 'attempt-locked',
                    reconnect_attempt_count: 3,
                    status: 'IN_PROGRESS',
                    lifecycle_state: 'LOCKED',
                    end_date_time: new Date('2026-04-13T06:00:00.000Z'),
                    institution_id: 'inst-1',
                }),
            ),
            updateTable: vi
                .fn()
                .mockReturnValueOnce(updateAttemptBuilder)
                .mockReturnValueOnce(updateLobbyBuilder),
            insertInto: vi.fn().mockReturnValue(insertBuilder),
        } as unknown as DbClient;

        const result = await StudentOverridesService.authorizeStudentReentry({
            dbClient,
            examId: 'exam-1',
            studentId: 'student-1',
            reason: 'Instructor cleared re-entry after connection drop.',
            actorUserId: 'instructor-1',
            institutionId: 'inst-1',
            now,
        });

        expect(result).toEqual({
            attemptId: 'attempt-locked',
            status: 'APPROVED',
            reconnectAttemptCount: 0,
            reopenedUntil: '2026-04-13T06:00:00.000Z',
        });
        expect(updateAttemptBuilder.set).toHaveBeenCalledWith(
            expect.objectContaining({
                lifecycle_state: 'IN_PROGRESS',
                reconnect_attempt_count: 0,
                lifecycle_reason: 'REOPENED_BY_INSTRUCTOR',
            }),
        );
        expect(updateLobbyBuilder.set).toHaveBeenCalledWith(
            expect.objectContaining({
                status: 'APPROVED',
                decided_by: 'instructor-1',
            }),
        );
    });

    it('throws error when authorizing re-entry for an already completed attempt', async () => {
        const dbClient = {
            selectFrom: vi.fn().mockReturnValue(
                createSelectBuilder({
                    attempt_id: 'attempt-done',
                    reconnect_attempt_count: 1,
                    status: 'COMPLETED',
                    lifecycle_state: 'SUBMITTED',
                    end_date_time: new Date('2026-04-13T06:00:00.000Z'),
                    institution_id: 'inst-1',
                }),
            ),
        } as unknown as DbClient;

        await expect(
            StudentOverridesService.authorizeStudentReentry({
                dbClient,
                examId: 'exam-1',
                studentId: 'student-1',
            }),
        ).rejects.toThrow('Student has already completed this exam. Grant a retake override instead.');
    });
});

