import { type DbClient } from '@sentinel/db';
import { HTTPException } from 'hono/http-exception';
import { type ExamAttemptAnswers } from '@sentinel/shared';
import { SessionRepository } from '../data/session.repository';
import type { SyncSessionBody } from '../flow.dto';

export type SyncSessionServiceArgs = {
    dbClient: DbClient;
    studentUserId: string;
    body: SyncSessionBody;
};

function resolveSyncLifecycleConflictMessage(lifecycleState?: string | null) {
    if (lifecycleState === 'LOCKED') {
        return 'This exam attempt is locked and cannot accept progress updates right now.';
    }

    if (lifecycleState === 'SUPERSEDED') {
        return 'This exam attempt was replaced by a newer attempt and can no longer accept progress updates.';
    }

    return 'This exam attempt has been closed and can no longer accept progress updates.';
}

/**
 * Synchronizes the current student exam attempt progress (answers, time elapsed) to database.
 * Logs heartbeat telemetry.
 */
export async function syncSessionService({
    dbClient,
    studentUserId,
    body,
}: SyncSessionServiceArgs): Promise<void> {
    const attempt = await SessionRepository.getOwnedSessionAttempt(dbClient, {
        sessionId: body.sessionId,
        studentUserId,
    });

    if (!attempt?.attempt_id) {
        throw new HTTPException(404, {
            message: 'Exam session not found for the authenticated student.',
        });
    }

    if (attempt.completed_at || attempt.status === 'COMPLETED') {
        throw new HTTPException(409, {
            message: 'This exam session has already been submitted and cannot be synced.',
        });
    }

    if (
        attempt.lifecycle_state === 'LOCKED' ||
        attempt.lifecycle_state === 'CLOSED' ||
        attempt.lifecycle_state === 'SUPERSEDED'
    ) {
        throw new HTTPException(409, {
            message: resolveSyncLifecycleConflictMessage(attempt.lifecycle_state),
        });
    }

    const updatedRows = await SessionRepository.updateSyncProgress(dbClient, {
        sessionId: body.sessionId,
        answeredCount: body.answeredCount,
        timeSpentMinutes: body.elapsedSeconds > 0 ? Math.ceil(body.elapsedSeconds / 60) : 0,
        answers: body.answers as ExamAttemptAnswers | undefined,
    });

    // If zero rows were updated the attempt was closed concurrently between the
    // pre-flight read above and the write.  Surface this as the same terminal
    // 409 the pre-flight checks would have produced.
    if (updatedRows === 0) {
        throw new HTTPException(409, {
            message: resolveSyncLifecycleConflictMessage(attempt.lifecycle_state),
        });
    }

    // Note: Routine progress syncs update attempt state atomically in database
    // without writing non-actionable heartbeat rows to persistent activity_logs.
}
