import { type DbClient } from '@sentinel/db';
import { startSessionService } from './services/start-session.service';
import { syncSessionService } from './services/sync-session.service';
import { completeSessionService } from './services/complete-session.service';
import { prepareSessionService } from './services/prepare-session.service';
import { getSessionStatusService } from './services/get-session-status.service';
import type { CompleteSessionBody, PrepareSessionBody, SyncSessionBody } from './flow.dto';

/**
 * Service class for examination session flow management.
 * Delegates actual operations to individual services.
 */
export class FlowService {
    /**
     * Verifies student exam eligibility, initializes attempt session, and logs telemetry.
     */
    static async startSession(
        db: DbClient,
        studentId: string,
        examId: string,
        resumeRequestId?: string | null,
    ) {
        return startSessionService({ dbClient: db, studentId, examId, resumeRequestId });
    }

    /**
     * Syncs ongoing exam progress answers and time elapsed.
     */
    static async syncSession(db: DbClient, studentUserId: string, body: SyncSessionBody) {
        return syncSessionService({ dbClient: db, studentUserId, body });
    }

    /**
     * Reads lightweight lifecycle status for an owned attempt without answer or score payloads.
     */
    static async getSessionStatus(db: DbClient, studentUserId: string, sessionId: string) {
        return getSessionStatusService({ dbClient: db, studentUserId, sessionId });
    }

    static async prepareSession(db: DbClient, studentUserId: string, body: PrepareSessionBody) {
        return prepareSessionService({ dbClient: db, studentUserId, body });
    }

    /**
     * Finalizes exam session, scores attempt answers, logs telemetry, and triggers IRT calibration.
     */
    static async completeSession(db: DbClient, studentUserId: string, body: CompleteSessionBody) {
        return completeSessionService({ dbClient: db, studentUserId, body });
    }
}

/**
 * @deprecated Use FlowService directly.
 */
export { FlowService as SessionManagerService };
