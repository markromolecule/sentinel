import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DbClient } from '@sentinel/db';
import { SessionRepository } from './session.repository';

vi.mock('../../student-overrides/student-overrides.service', () => ({
    StudentOverridesService: {
        markOverrideUsed: vi.fn().mockResolvedValue(undefined),
    },
}));

function createExistingAttemptSelect(result: unknown) {
    return {
        innerJoin: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        executeTakeFirst: vi.fn().mockResolvedValue(result),
    };
}

function createRemediationSelect(result: unknown) {
    return {
        select: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        executeTakeFirst: vi.fn().mockResolvedValue(result),
    };
}

describe('SessionRepository.createSession', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('increments reconnect_attempt_count when resuming an in-progress attempt', async () => {
        const updateBuilder = {
            set: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            execute: vi.fn().mockResolvedValue(undefined),
        };
        const dbClient = {
            selectFrom: vi
                .fn()
                .mockReturnValueOnce(createRemediationSelect(undefined))
                .mockReturnValueOnce(
                    createExistingAttemptSelect({
                        attempt_id: 'attempt-1',
                        completed_at: null,
                        status: 'IN_PROGRESS',
                        lifecycle_state: 'IN_PROGRESS',
                        reopened_until: null,
                        created_at: new Date('2026-04-13T05:00:00.000Z'),
                        answer_snapshot: { 'question-1': 'A' },
                        time_spent_minutes: 4,
                        reconnect_attempt_count: 0,
                    }),
                ),
            updateTable: vi.fn().mockReturnValue(updateBuilder),
        } as unknown as DbClient;

        const result = await SessionRepository.createSession(dbClient, {
            examId: 'exam-1',
            studentId: 'student-1',
            maxReconnectAttempts: 3,
            resumeRequestId: '11111111-1111-4111-8111-111111111111',
        });

        expect(result).toMatchObject({
            sessionId: 'attempt-1',
            isResumed: true,
            reconnectAttemptCount: 1,
            maxReconnectAttempts: 3,
            elapsedSeconds: 240,
            answers: { 'question-1': 'A' },
        });
        expect(updateBuilder.set).toHaveBeenCalledWith(
            expect.objectContaining({
                reconnect_attempt_count: 1,
            }),
        );
    });

    it('resumes the same locked attempt when a reopen override references it', async () => {
        const updateBuilder = {
            set: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            execute: vi.fn().mockResolvedValue(undefined),
        };
        const dbClient = {
            selectFrom: vi
                .fn()
                .mockReturnValueOnce(createRemediationSelect(undefined))
                .mockReturnValueOnce(
                    createExistingAttemptSelect({
                        attempt_id: 'attempt-locked',
                        completed_at: null,
                        status: 'IN_PROGRESS',
                        lifecycle_state: 'LOCKED',
                        reopened_until: null,
                        created_at: new Date('2026-04-13T05:00:00.000Z'),
                        answer_snapshot: { 'question-1': 'A' },
                        time_spent_minutes: 4,
                        reconnect_attempt_count: 1,
                    }),
                ),
            updateTable: vi.fn().mockReturnValue(updateBuilder),
        } as unknown as DbClient;

        const result = await SessionRepository.createSession(dbClient, {
            examId: 'exam-1',
            studentId: 'student-1',
            maxReconnectAttempts: 3,
            resumeRequestId: '22222222-2222-4222-8222-222222222222',
            accessOverride: {
                id: 'override-1',
                examId: 'exam-1',
                studentId: 'student-1',
                grantedBy: 'instructor-1',
                overrideType: 'REOPEN',
                availableFrom: '2026-04-13T06:00:00.000Z',
                availableUntil: '2026-04-13T08:00:00.000Z',
                allowedAttempts: 1,
                usedAttempts: 0,
                usedAttemptIds: [],
                sourceAttemptId: 'attempt-locked',
                notes: null,
                createdAt: '2026-04-13T06:00:00.000Z',
                updatedAt: '2026-04-13T06:00:00.000Z',
            },
        });

        expect(result).toMatchObject({
            sessionId: 'attempt-locked',
            isResumed: true,
            reconnectAttemptCount: 1,
        });
        expect(updateBuilder.set).toHaveBeenCalledWith(
            expect.objectContaining({
                lifecycle_state: 'IN_PROGRESS',
            }),
        );
    });

    it('creates a fresh attempt for a retake override instead of returning the submitted one', async () => {
        const existingAttemptSelect = createExistingAttemptSelect({
            attempt_id: 'attempt-completed',
            completed_at: new Date('2026-04-13T05:30:00.000Z'),
            status: 'COMPLETED',
            lifecycle_state: 'SUBMITTED',
            reopened_until: null,
            created_at: new Date('2026-04-13T05:00:00.000Z'),
            answer_snapshot: {},
            time_spent_minutes: 12,
            reconnect_attempt_count: 0,
        });
        const attemptCountSelect = {
            innerJoin: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            executeTakeFirst: vi.fn().mockResolvedValue({
                attempt_count: '2',
            }),
        };
        const insertBuilder = {
            values: vi.fn().mockReturnThis(),
            returning: vi.fn().mockReturnThis(),
            executeTakeFirst: vi.fn().mockResolvedValue({
                attempt_id: 'attempt-retake',
            }),
        };
        const dbClient = {
            selectFrom: vi
                .fn()
                .mockReturnValueOnce(createRemediationSelect(undefined))
                .mockReturnValueOnce(existingAttemptSelect)
                .mockReturnValueOnce(attemptCountSelect),
            insertInto: vi.fn().mockReturnValue(insertBuilder),
        } as unknown as DbClient;

        const result = await SessionRepository.createSession(dbClient, {
            examId: 'exam-1',
            studentId: 'student-1',
            maxReconnectAttempts: 0,
            accessOverride: {
                id: 'override-2',
                examId: 'exam-1',
                studentId: 'student-1',
                grantedBy: 'instructor-1',
                overrideType: 'RETAKE',
                availableFrom: '2026-04-13T06:00:00.000Z',
                availableUntil: '2026-04-13T08:00:00.000Z',
                allowedAttempts: 1,
                usedAttempts: 0,
                usedAttemptIds: [],
                sourceAttemptId: 'attempt-completed',
                notes: null,
                createdAt: '2026-04-13T06:00:00.000Z',
                updatedAt: '2026-04-13T06:00:00.000Z',
            },
        });

        expect(result).toEqual({
            sessionId: 'attempt-retake',
            isResumed: false,
            reconnectAttemptCount: 0,
            maxReconnectAttempts: 0,
        });
        expect(insertBuilder.values).toHaveBeenCalledWith(
            expect.objectContaining({
                lifecycle_state: 'IN_PROGRESS',
                status: 'IN_PROGRESS',
            }),
        );
    });

    it('permits initial fresh attempt creation when maxReconnectAttempts is 0 without override', async () => {
        const existingAttemptSelect = createExistingAttemptSelect(undefined);
        const attemptCountSelect = {
            innerJoin: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            executeTakeFirst: vi.fn().mockResolvedValue({
                attempt_count: '0',
            }),
        };
        const insertBuilder = {
            values: vi.fn().mockReturnThis(),
            returning: vi.fn().mockReturnThis(),
            executeTakeFirst: vi.fn().mockResolvedValue({
                attempt_id: 'attempt-first-time',
            }),
        };
        const dbClient = {
            selectFrom: vi
                .fn()
                .mockReturnValueOnce(createRemediationSelect(undefined))
                .mockReturnValueOnce(existingAttemptSelect)
                .mockReturnValueOnce(attemptCountSelect),
            insertInto: vi.fn().mockReturnValue(insertBuilder),
        } as unknown as DbClient;

        const result = await SessionRepository.createSession(dbClient, {
            examId: 'exam-1',
            studentId: 'student-1',
            maxReconnectAttempts: 0,
        });

        expect(result).toEqual({
            sessionId: 'attempt-first-time',
            isResumed: false,
            reconnectAttemptCount: 0,
            maxReconnectAttempts: 0,
        });
        expect(insertBuilder.values).toHaveBeenCalledWith(
            expect.objectContaining({
                lifecycle_state: 'IN_PROGRESS',
                status: 'IN_PROGRESS',
            }),
        );
    });

    it('rejects fresh attempt creation with maximum attempts error when attemptCount >= 1 without override', async () => {
        const existingAttemptSelect = createExistingAttemptSelect(undefined);
        const attemptCountSelect = {
            innerJoin: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            executeTakeFirst: vi.fn().mockResolvedValue({
                attempt_count: '1',
            }),
        };
        const dbClient = {
            selectFrom: vi
                .fn()
                .mockReturnValueOnce(createRemediationSelect(undefined))
                .mockReturnValueOnce(existingAttemptSelect)
                .mockReturnValueOnce(attemptCountSelect),
        } as unknown as DbClient;

        await expect(
            SessionRepository.createSession(dbClient, {
                examId: 'exam-1',
                studentId: 'student-1',
                maxReconnectAttempts: 3,
            }),
        ).rejects.toThrow('Maximum attempts reached for this exam.');
    });

    it('rejects resumption when existing attempt is LOCKED without an active reopen window or override', async () => {
        const dbClient = {
            selectFrom: vi
                .fn()
                .mockReturnValueOnce(createRemediationSelect(undefined))
                .mockReturnValueOnce(
                    createExistingAttemptSelect({
                        attempt_id: 'attempt-locked-no-window',
                        completed_at: null,
                        status: 'IN_PROGRESS',
                        lifecycle_state: 'LOCKED',
                        reopened_until: null,
                        created_at: new Date('2026-04-13T05:00:00.000Z'),
                        answer_snapshot: {},
                        time_spent_minutes: 5,
                        reconnect_attempt_count: 0,
                    }),
                ),
        } as unknown as DbClient;

        await expect(
            SessionRepository.createSession(dbClient, {
                examId: 'exam-1',
                studentId: 'student-1',
                maxReconnectAttempts: 3,
                resumeRequestId: '44444444-4444-4444-8444-444444444444',
            }),
        ).rejects.toThrow(
            'This exam attempt is currently locked and requires instructor authorization to resume.',
        );
    });


    it('does not treat a remediation exam as a same-exam retake override source', async () => {
        const dbClient = {
            selectFrom: vi
                .fn()
                .mockReturnValueOnce(createRemediationSelect({ remediation_id: 'rem-1' }))
                .mockReturnValueOnce(
                    createExistingAttemptSelect({
                        attempt_id: 'attempt-remediation-complete',
                        completed_at: new Date('2026-04-13T05:30:00.000Z'),
                        status: 'COMPLETED',
                        lifecycle_state: 'SUBMITTED',
                        reopened_until: null,
                        created_at: new Date('2026-04-13T05:00:00.000Z'),
                        answer_snapshot: {},
                        time_spent_minutes: 12,
                        reconnect_attempt_count: 0,
                    }),
                ),
        } as unknown as DbClient;

        const result = await SessionRepository.createSession(dbClient, {
            examId: 'remediation-exam-1',
            studentId: 'student-1',
            maxReconnectAttempts: 0,
            accessOverride: {
                id: 'override-3',
                examId: 'remediation-exam-1',
                studentId: 'student-1',
                grantedBy: 'instructor-1',
                overrideType: 'RETAKE',
                availableFrom: '2026-04-13T06:00:00.000Z',
                availableUntil: '2026-04-13T08:00:00.000Z',
                allowedAttempts: 1,
                usedAttempts: 0,
                usedAttemptIds: [],
                sourceAttemptId: 'source-attempt-1',
                notes: null,
                createdAt: '2026-04-13T06:00:00.000Z',
                updatedAt: '2026-04-13T06:00:00.000Z',
            },
        });

        expect(result).toEqual({
            attemptId: 'attempt-remediation-complete',
            error: 'This exam has already been turned in.',
            errorCode: 'ATTEMPT_ALREADY_COMPLETED',
        });
    });

    it('rejects resume request when reconnect_attempt_count reaches maxReconnectAttempts limit', async () => {
        const dbClient = {
            selectFrom: vi
                .fn()
                .mockReturnValueOnce(createRemediationSelect(undefined))
                .mockReturnValueOnce(
                    createExistingAttemptSelect({
                        attempt_id: 'attempt-maxed',
                        completed_at: null,
                        status: 'IN_PROGRESS',
                        lifecycle_state: 'IN_PROGRESS',
                        reopened_until: null,
                        created_at: new Date('2026-04-13T05:00:00.000Z'),
                        answer_snapshot: {},
                        time_spent_minutes: 5,
                        reconnect_attempt_count: 3,
                    }),
                ),
        } as unknown as DbClient;

        await expect(
            SessionRepository.createSession(dbClient, {
                examId: 'exam-1',
                studentId: 'student-1',
                maxReconnectAttempts: 3,
                resumeRequestId: '33333333-3333-4333-8333-333333333333',
            }),
        ).rejects.toThrow('Maximum reconnect attempts reached for this exam session.');
    });

    it('does not let a recent answer sync suppress a distinct reconnect', async () => {
        const updateBuilder = {
            set: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            execute: vi.fn().mockResolvedValue(undefined),
        };
        const dbClient = {
            selectFrom: vi
                .fn()
                .mockReturnValueOnce(createRemediationSelect(undefined))
                .mockReturnValueOnce(
                    createExistingAttemptSelect({
                        attempt_id: 'attempt-rapid',
                        completed_at: null,
                        status: 'IN_PROGRESS',
                        lifecycle_state: 'IN_PROGRESS',
                        reopened_until: null,
                        created_at: new Date('2026-04-13T05:00:00.000Z'),
                        last_synced_at: new Date(Date.now() - 1000), // 1 sec ago
                        answer_snapshot: { 'question-1': 'A' },
                        time_spent_minutes: 4,
                        reconnect_attempt_count: 1,
                    }),
                ),
            updateTable: vi.fn().mockReturnValue(updateBuilder),
        } as unknown as DbClient;

        const result = await SessionRepository.createSession(dbClient, {
            examId: 'exam-1',
            studentId: 'student-1',
            maxReconnectAttempts: 3,
            resumeRequestId: '44444444-4444-4444-8444-444444444444',
        });

        expect(result).toMatchObject({
            sessionId: 'attempt-rapid',
            isResumed: true,
            reconnectAttemptCount: 2,
        });
        expect(updateBuilder.set).toHaveBeenCalledWith(
            expect.objectContaining({
                reconnect_attempt_count: 2,
            }),
        );
    });

    it('skips incrementing reconnect_attempt_count if resumeRequestId matches last_reconnect_request_id', async () => {
        const updateBuilder = {
            set: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            execute: vi.fn().mockResolvedValue(undefined),
        };
        const dbClient = {
            selectFrom: vi
                .fn()
                .mockReturnValueOnce(createRemediationSelect(undefined))
                .mockReturnValueOnce(
                    createExistingAttemptSelect({
                        attempt_id: 'attempt-1',
                        completed_at: null,
                        status: 'IN_PROGRESS',
                        lifecycle_state: 'IN_PROGRESS',
                        reopened_until: null,
                        created_at: new Date('2026-04-13T05:00:00.000Z'),
                        answer_snapshot: { 'question-1': 'A' },
                        time_spent_minutes: 4,
                        reconnect_attempt_count: 1,
                        last_reconnect_request_id: 'reconnect-req-123',
                    }),
                ),
            updateTable: vi.fn().mockReturnValue(updateBuilder),
        } as unknown as DbClient;

        const result = await SessionRepository.createSession(dbClient, {
            examId: 'exam-1',
            studentId: 'student-1',
            maxReconnectAttempts: 3,
            resumeRequestId: 'reconnect-req-123',
        });

        expect(result).toMatchObject({
            sessionId: 'attempt-1',
            isResumed: true,
            reconnectAttemptCount: 1,
        });
        expect(updateBuilder.set).not.toHaveBeenCalled();
    });

    it('increments reconnect_attempt_count and updates last_reconnect_request_id if resumeRequestId is different', async () => {
        const updateBuilder = {
            set: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            execute: vi.fn().mockResolvedValue(undefined),
        };
        const dbClient = {
            selectFrom: vi
                .fn()
                .mockReturnValueOnce(createRemediationSelect(undefined))
                .mockReturnValueOnce(
                    createExistingAttemptSelect({
                        attempt_id: 'attempt-1',
                        completed_at: null,
                        status: 'IN_PROGRESS',
                        lifecycle_state: 'IN_PROGRESS',
                        reopened_until: null,
                        created_at: new Date('2026-04-13T05:00:00.000Z'),
                        answer_snapshot: { 'question-1': 'A' },
                        time_spent_minutes: 4,
                        reconnect_attempt_count: 1,
                        last_reconnect_request_id: 'reconnect-req-123',
                    }),
                ),
            updateTable: vi.fn().mockReturnValue(updateBuilder),
        } as unknown as DbClient;

        const result = await SessionRepository.createSession(dbClient, {
            examId: 'exam-1',
            studentId: 'student-1',
            maxReconnectAttempts: 3,
            resumeRequestId: 'reconnect-req-456',
        });

        expect(result).toMatchObject({
            sessionId: 'attempt-1',
            isResumed: true,
            reconnectAttemptCount: 2,
        });
        expect(updateBuilder.set).toHaveBeenCalledWith(
            expect.objectContaining({
                reconnect_attempt_count: 2,
                last_reconnect_request_id: 'reconnect-req-456',
            }),
        );
    });

    it('resumes a CLOSED attempt when a REOPEN override references it', async () => {
        const updateBuilder = {
            set: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            execute: vi.fn().mockResolvedValue(undefined),
        };
        const dbClient = {
            selectFrom: vi
                .fn()
                .mockReturnValueOnce(createRemediationSelect(undefined))
                .mockReturnValueOnce(
                    createExistingAttemptSelect({
                        attempt_id: 'attempt-closed',
                        completed_at: null,
                        status: 'IN_PROGRESS',
                        lifecycle_state: 'CLOSED',
                        reopened_until: null,
                        created_at: new Date('2026-04-13T05:00:00.000Z'),
                        answer_snapshot: { 'question-1': 'B' },
                        time_spent_minutes: 10,
                        reconnect_attempt_count: 2,
                    }),
                ),
            updateTable: vi.fn().mockReturnValue(updateBuilder),
        } as unknown as DbClient;

        const result = await SessionRepository.createSession(dbClient, {
            examId: 'exam-1',
            studentId: 'student-1',
            maxReconnectAttempts: 3,
            resumeRequestId: '55555555-5555-4555-8555-555555555555',
            accessOverride: {
                id: 'override-reopen',
                examId: 'exam-1',
                studentId: 'student-1',
                grantedBy: 'instructor-1',
                overrideType: 'REOPEN',
                availableFrom: '2026-04-13T06:00:00.000Z',
                availableUntil: '2026-04-13T08:00:00.000Z',
                allowedAttempts: 1,
                usedAttempts: 0,
                usedAttemptIds: [],
                sourceAttemptId: 'attempt-closed',
                notes: null,
                createdAt: '2026-04-13T06:00:00.000Z',
                updatedAt: '2026-04-13T06:00:00.000Z',
            },
        });

        expect(result).toMatchObject({
            sessionId: 'attempt-closed',
            isResumed: true,
            reconnectAttemptCount: 2,
        });
        expect(updateBuilder.set).toHaveBeenCalledWith(
            expect.objectContaining({
                lifecycle_state: 'IN_PROGRESS',
            }),
        );
    });

    it('resumes a CLOSED attempt when reopened_until is a future timestamp', async () => {
        const futureTime = new Date(Date.now() + 60 * 60 * 1000).toISOString();
        const updateBuilder = {
            set: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            execute: vi.fn().mockResolvedValue(undefined),
        };
        const dbClient = {
            selectFrom: vi
                .fn()
                .mockReturnValueOnce(createRemediationSelect(undefined))
                .mockReturnValueOnce(
                    createExistingAttemptSelect({
                        attempt_id: 'attempt-closed-window',
                        completed_at: null,
                        status: 'IN_PROGRESS',
                        lifecycle_state: 'CLOSED',
                        reopened_until: futureTime,
                        created_at: new Date('2026-04-13T05:00:00.000Z'),
                        answer_snapshot: { 'question-1': 'C' },
                        time_spent_minutes: 8,
                        reconnect_attempt_count: 1,
                    }),
                ),
            updateTable: vi.fn().mockReturnValue(updateBuilder),
        } as unknown as DbClient;

        const result = await SessionRepository.createSession(dbClient, {
            examId: 'exam-1',
            studentId: 'student-1',
            maxReconnectAttempts: 3,
            resumeRequestId: '66666666-6666-4666-8666-666666666666',
        });

        expect(result).toMatchObject({
            sessionId: 'attempt-closed-window',
            isResumed: true,
            reconnectAttemptCount: 2,
        });
        expect(updateBuilder.set).toHaveBeenCalledWith(
            expect.objectContaining({
                lifecycle_state: 'IN_PROGRESS',
            }),
        );
    });
});

describe('SessionRepository.updateSyncProgress', () => {
    it('guards progress sync with active-attempt predicates and reports the updated row count', async () => {
        const updateBuilder = {
            set: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            executeTakeFirst: vi.fn().mockResolvedValue({ numUpdatedRows: 1 }),
        };
        const dbClient = {
            updateTable: vi.fn().mockReturnValue(updateBuilder),
        } as unknown as DbClient;

        const result = await SessionRepository.updateSyncProgress(dbClient, {
            sessionId: 'attempt-sync-1',
            answeredCount: 21,
            timeSpentMinutes: 3,
            answers: { 'question-1': 'A' },
        });

        expect(result).toBe(1);
        expect(updateBuilder.set).toHaveBeenCalledWith(
            expect.objectContaining({
                answered_question_count: 21,
                time_spent_minutes: 3,
                answer_snapshot: { 'question-1': 'A' },
                last_synced_at: expect.any(Date),
            }),
        );
        expect(updateBuilder.where).toHaveBeenNthCalledWith(1, 'attempt_id', '=', 'attempt-sync-1');
        expect(updateBuilder.where).toHaveBeenNthCalledWith(2, 'status', '=', 'IN_PROGRESS');
        expect(updateBuilder.where).toHaveBeenNthCalledWith(3, 'completed_at', 'is', null);
        expect(updateBuilder.where).toHaveBeenNthCalledWith(
            4,
            'lifecycle_state',
            '=',
            'IN_PROGRESS',
        );
    });
});
