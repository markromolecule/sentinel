import { type DbClient } from '@sentinel/db';
import { HTTPException } from 'hono/http-exception';
import { SessionRepository } from '../data/session.repository';
import type { SessionStatusResponse } from '../flow.dto';

type SessionStatusResult = SessionStatusResponse['data'];

export type GetSessionStatusServiceArgs = {
    dbClient: DbClient;
    sessionId: string;
    studentUserId: string;
};

function toIsoString(value: Date | string | null | undefined): string | null {
    if (!value) {
        return null;
    }

    return value instanceof Date ? value.toISOString() : value;
}

function resolveTerminalMessage(args: {
    status?: string | null;
    lifecycleState?: string | null;
    closedReason?: string | null;
}): string | null {
    if (args.lifecycleState === 'LOCKED') {
        return 'This exam attempt is locked and cannot be continued right now.';
    }

    if (args.lifecycleState === 'CLOSED') {
        return args.closedReason
            ? `This exam attempt has been closed: ${args.closedReason}.`
            : 'This exam attempt has been closed.';
    }

    if (args.lifecycleState === 'SUPERSEDED') {
        return 'This exam attempt was replaced by a newer attempt.';
    }

    if (args.lifecycleState === 'SUBMITTED' || args.status === 'COMPLETED') {
        return 'This exam attempt has been submitted.';
    }

    return null;
}

/**
 * Fetches the authenticated student's lightweight attempt status without
 * returning answers, scores, questions, or configuration snapshots.
 */
export async function getSessionStatusService({
    dbClient,
    sessionId,
    studentUserId,
}: GetSessionStatusServiceArgs): Promise<SessionStatusResult> {
    const attempt = await SessionRepository.getOwnedSessionAttempt(dbClient, {
        sessionId,
        studentUserId,
    });

    if (!attempt?.attempt_id || !attempt.exam_id) {
        throw new HTTPException(404, {
            message: 'Exam session not found for the authenticated student.',
        });
    }

    return {
        sessionId,
        attemptId: attempt.attempt_id,
        examId: attempt.exam_id,
        status: attempt.status ?? null,
        lifecycleState: attempt.lifecycle_state ?? null,
        completedAt: toIsoString(attempt.completed_at),
        closedReason: attempt.closed_reason ?? null,
        terminalMessage: resolveTerminalMessage({
            status: attempt.status,
            lifecycleState: attempt.lifecycle_state,
            closedReason: attempt.closed_reason,
        }),
    };
}
