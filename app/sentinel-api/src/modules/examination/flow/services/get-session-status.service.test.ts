import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HTTPException } from 'hono/http-exception';
import { SessionRepository } from '../data/session.repository';
import { getSessionStatusService } from './get-session-status.service';

vi.mock('../data/session.repository', () => ({
    SessionRepository: {
        getOwnedSessionAttempt: vi.fn(),
    },
}));

describe('getSessionStatusService', () => {
    const dbClient = {} as any;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it.each([
        ['IN_PROGRESS', 'IN_PROGRESS', null],
        ['IN_PROGRESS', 'LOCKED', 'This exam attempt is locked and cannot be continued right now.'],
        ['IN_PROGRESS', 'CLOSED', 'This exam attempt has been closed: EXAM_WINDOW_ENDED.'],
        ['COMPLETED', 'SUBMITTED', 'This exam attempt has been submitted.'],
        ['IN_PROGRESS', 'SUPERSEDED', 'This exam attempt was replaced by a newer attempt.'],
    ])(
        'returns lightweight status for %s / %s',
        async (status, lifecycleState, terminalMessage) => {
            vi.mocked(SessionRepository.getOwnedSessionAttempt).mockResolvedValue({
                attempt_id: '11111111-1111-4111-8111-111111111111',
                exam_id: '22222222-2222-4222-8222-222222222222',
                student_id: 'student-1',
                completed_at: status === 'COMPLETED' ? new Date('2026-08-04T04:00:00.000Z') : null,
                status,
                lifecycle_state: lifecycleState,
                closed_reason: lifecycleState === 'CLOSED' ? 'EXAM_WINDOW_ENDED' : null,
                answer_snapshot: { should: 'not leak' },
                assessment_snapshot: { should: 'not leak' },
                score_snapshot: { should: 'not leak' },
                initial_score: 99,
            } as any);

            const result = await getSessionStatusService({
                dbClient,
                sessionId: '11111111-1111-4111-8111-111111111111',
                studentUserId: 'user-1',
            });

            expect(result).toEqual({
                sessionId: '11111111-1111-4111-8111-111111111111',
                attemptId: '11111111-1111-4111-8111-111111111111',
                examId: '22222222-2222-4222-8222-222222222222',
                status,
                lifecycleState,
                completedAt: status === 'COMPLETED' ? '2026-08-04T04:00:00.000Z' : null,
                closedReason: lifecycleState === 'CLOSED' ? 'EXAM_WINDOW_ENDED' : null,
                terminalMessage,
            });
            expect(JSON.stringify(result)).not.toContain('snapshot');
            expect(JSON.stringify(result)).not.toContain('score');
            expect(JSON.stringify(result)).not.toContain('question');
            expect(JSON.stringify(result)).not.toContain('configuration');
        },
    );

    it.each([undefined, null])('returns 404 for missing or cross-student sessions', async (row) => {
        vi.mocked(SessionRepository.getOwnedSessionAttempt).mockResolvedValue(row as never);

        await expect(
            getSessionStatusService({
                dbClient,
                sessionId: '11111111-1111-4111-8111-111111111111',
                studentUserId: 'user-1',
            }),
        ).rejects.toMatchObject({
            status: 404,
            message: 'Exam session not found for the authenticated student.',
        } satisfies Partial<HTTPException>);
    });
});
