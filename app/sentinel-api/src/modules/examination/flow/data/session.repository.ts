import { type DbClient } from '@sentinel/db';
import type { AttemptAssessmentSnapshot, AttemptScoreSnapshot } from '@sentinel/shared';
import type { ExamAttemptAnswers } from '@sentinel/shared/types';
import type { StudentExamAccessOverride } from '../../student-overrides/student-overrides.dto';
import { executeCreateSession, type CreateSessionResult } from './_logic/create-session.logic';
import { findOwnedAttempt } from './_queries/attempt-queries';
import {
    completeAttempt,
    persistAttemptAssessmentSnapshot,
    syncAttemptProgress,
} from './_mutations/attempt-mutations';

/**
 * Thin facade for all exam session persistence operations.
 *
 * Orchestration and query logic live in focused sub-modules:
 *   _logic/create-session.logic.ts  – resume / fresh-attempt branching
 *   _queries/attempt-queries.ts     – read queries for exam_attempts
 *   _queries/remediation-queries.ts – remediation schedule lookup
 *   _mutations/attempt-mutations.ts – write mutations for exam_attempts
 */
export class SessionRepository {
    /**
     * Initializes or resumes a secure examination session using the persisted
     * exam attempt table, which is the closest durable session boundary we have.
     */
    static async createSession(
        db: DbClient,
        args: {
            studentId: string;
            examId: string;
            maxReconnectAttempts: number;
            accessOverride?: StudentExamAccessOverride | null;
            updatedBy?: string | null;
            resumeRequestId?: string | null;
        },
    ): Promise<CreateSessionResult> {
        return executeCreateSession(db, args);
    }

    /**
     * Fetches a single attempt row that is owned by the given student user.
     * Used by the session access guard.
     */
    static async getOwnedSessionAttempt(
        db: DbClient,
        args: {
            sessionId: string;
            studentUserId: string;
        },
    ) {
        return findOwnedAttempt(db, args.sessionId, args.studentUserId);
    }

    /**
     * Marks an attempt as fully completed, writing the final score and answer snapshot.
     */
    static async completeSession(
        db: DbClient,
        args: {
            sessionId: string;
            score: number;
            initialScore: number;
            totalScore: number;
            timeSpentMinutes: number;
            answeredCount: number;
            answers: ExamAttemptAnswers;
            scoreSnapshot: AttemptScoreSnapshot;
            scoringVersion: string;
        },
    ) {
        return completeAttempt(db, args);
    }

    static async persistAssessmentSnapshot(
        db: DbClient,
        args: {
            attemptId: string;
            snapshot: AttemptAssessmentSnapshot;
        },
    ) {
        return persistAttemptAssessmentSnapshot(db, args);
    }

    /**
     * Persists in-progress answer/time sync without marking the attempt as complete.
     */
    static async updateSyncProgress(
        db: DbClient,
        args: {
            sessionId: string;
            answeredCount: number;
            timeSpentMinutes: number;
            answers?: ExamAttemptAnswers;
        },
    ) {
        return syncAttemptProgress(db, args);
    }
}
