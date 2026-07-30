import { assertCompletedAttemptTimestamp } from './complete-session.guards';
import type { CompletedAttemptResult, CompleteSessionSummary } from './complete-session.types';

export function buildCompletedSessionResponse(args: {
    completedAttempt: CompletedAttemptResult;
    summary: CompleteSessionSummary;
}) {
    const completedTimestamp = assertCompletedAttemptTimestamp(args.completedAttempt.completed_at);
    const completedAt =
        completedTimestamp instanceof Date
            ? completedTimestamp.toISOString()
            : new Date(completedTimestamp).toISOString();

    return {
        attemptId: args.completedAttempt.attempt_id,
        completedAt,
        ...args.summary,
    };
}
