import { type DbClient } from '@sentinel/db';
import { sql } from 'kysely';
import type { LiveInspectionState, LiveInspectionTerminalReason } from '@sentinel/shared/schema';

export type LiveInspectionAcquireArgs = {
    leaseId?: string;
    examId: string;
    attemptId: string;
    studentUserId: string;
    viewerUserId: string;
    institutionId: string;
    providerRoomName: string;
    expiresAt: Date;
};

export type LiveInspectionTransitionPatch = {
    fromState: LiveInspectionState;
    toState: LiveInspectionState;
    expectedVersion: number;
    endedAt?: Date | null;
    endReason?: LiveInspectionTerminalReason | null;
    lastErrorCode?: string | null;
};

export type LiveInspectionAcquireResult =
    | { ok: true; leaseId: string }
    | { ok: false; code: 'INSPECTION_ALREADY_ACTIVE' | 'VIEWER_ALREADY_ACTIVE' };

const ACTIVE_STATES: LiveInspectionState[] = [
    'REQUESTED',
    'PUBLISHER_CONNECTING',
    'PUBLISHER_READY',
    'LIVE',
    'STOPPING',
];

/**
 * Inserts a lease and relies on partial unique indexes to prevent duplicates.
 */
export async function acquireLiveInspectionLease(
    dbClient: DbClient,
    args: LiveInspectionAcquireArgs,
): Promise<LiveInspectionAcquireResult> {
    try {
        const row = await dbClient
            .insertInto('live_inspection_leases')
            .values({
                lease_id: args.leaseId,
                exam_id: args.examId,
                attempt_id: args.attemptId,
                student_user_id: args.studentUserId,
                viewer_user_id: args.viewerUserId,
                institution_id: args.institutionId,
                provider_room_name: args.providerRoomName,
                state: 'REQUESTED',
                version: 1,
                expires_at: args.expiresAt,
            })
            .returning('lease_id')
            .executeTakeFirstOrThrow();

        return { ok: true, leaseId: row.lease_id };
    } catch (error) {
        return mapAcquireConstraintError(error);
    }
}

export async function getLiveInspectionLeaseForViewer(
    dbClient: DbClient,
    args: { leaseId: string; viewerUserId: string },
) {
    return dbClient
        .selectFrom('live_inspection_leases')
        .selectAll()
        .where('lease_id', '=', args.leaseId)
        .where('viewer_user_id', '=', args.viewerUserId)
        .executeTakeFirst();
}

/**
 * Reads a lease by id without returning provider credentials or browser tokens.
 */
export async function getLiveInspectionLeaseById(dbClient: DbClient, leaseId: string) {
    return dbClient
        .selectFrom('live_inspection_leases')
        .selectAll()
        .where('lease_id', '=', leaseId)
        .executeTakeFirst();
}

/**
 * Reads the current active lease for an exam attempt, if any.
 */
export async function getActiveLiveInspectionLeaseForAttempt(
    dbClient: DbClient,
    args: { examId: string; attemptId: string },
) {
    return dbClient
        .selectFrom('live_inspection_leases')
        .selectAll()
        .where('exam_id', '=', args.examId)
        .where('attempt_id', '=', args.attemptId)
        .where('state', 'in', ACTIVE_STATES)
        .orderBy('requested_at', 'desc')
        .executeTakeFirst();
}

/**
 * Reads the current active lease owned by a viewer, if any.
 */
export async function getActiveLiveInspectionLeaseForViewer(
    dbClient: DbClient,
    viewerUserId: string,
) {
    return dbClient
        .selectFrom('live_inspection_leases')
        .selectAll()
        .where('viewer_user_id', '=', viewerUserId)
        .where('state', 'in', ACTIVE_STATES)
        .orderBy('requested_at', 'desc')
        .executeTakeFirst();
}

/**
 * Resolves a lease from the opaque provider room name carried by webhooks.
 */
export async function getLiveInspectionLeaseByRoomName(
    dbClient: DbClient,
    providerRoomName: string,
) {
    return dbClient
        .selectFrom('live_inspection_leases')
        .selectAll()
        .where('provider_room_name', '=', providerRoomName)
        .executeTakeFirst();
}

export async function getLiveInspectionLeaseForStudent(
    dbClient: DbClient,
    args: { leaseId: string; studentUserId: string },
) {
    return dbClient
        .selectFrom('live_inspection_leases')
        .selectAll()
        .where('lease_id', '=', args.leaseId)
        .where('student_user_id', '=', args.studentUserId)
        .executeTakeFirst();
}

export async function compareAndSetLiveInspectionLeaseState(
    dbClient: DbClient,
    leaseId: string,
    patch: LiveInspectionTransitionPatch,
) {
    const now = new Date();

    return dbClient
        .updateTable('live_inspection_leases')
        .set({
            state: patch.toState,
            version: patch.expectedVersion + 1,
            updated_at: now,
            publisher_connecting_at: patch.toState === 'PUBLISHER_CONNECTING' ? now : undefined,
            publisher_ready_at: patch.toState === 'PUBLISHER_READY' ? now : undefined,
            started_at: patch.toState === 'LIVE' ? now : undefined,
            stopping_at: patch.toState === 'STOPPING' ? now : undefined,
            ended_at: patch.endedAt ?? (isTerminalState(patch.toState) ? now : undefined),
            end_reason: patch.endReason,
            last_error_code: patch.lastErrorCode,
        })
        .where('lease_id', '=', leaseId)
        .where('state', '=', patch.fromState)
        .where('version', '=', patch.expectedVersion)
        .returningAll()
        .executeTakeFirst();
}

export async function countActiveLiveInspectionLeases(dbClient: DbClient) {
    const row = await dbClient
        .selectFrom('live_inspection_leases')
        .select((eb) => eb.fn.countAll<string>().as('count'))
        .where('state', 'in', ACTIVE_STATES)
        .executeTakeFirst();

    return Number(row?.count ?? 0);
}

export async function countActiveLiveInspectionLeasesByInstitution(
    dbClient: DbClient,
    institutionId: string,
) {
    const row = await dbClient
        .selectFrom('live_inspection_leases')
        .select((eb) => eb.fn.countAll<string>().as('count'))
        .where('institution_id', '=', institutionId)
        .where('state', 'in', ACTIVE_STATES)
        .executeTakeFirst();

    return Number(row?.count ?? 0);
}

export async function findExpiredLiveInspectionLeases(dbClient: DbClient, now = new Date()) {
    return dbClient
        .selectFrom('live_inspection_leases')
        .selectAll()
        .where('state', 'in', ACTIVE_STATES)
        .where('expires_at', '<=', now)
        .execute();
}

export async function recordLiveKitWebhookEventOnce(
    dbClient: DbClient,
    args: { providerEventId: string; leaseId?: string | null; eventType: string },
) {
    const result = await dbClient
        .insertInto('livekit_webhook_events')
        .values({
            provider_event_id: args.providerEventId,
            lease_id: args.leaseId ?? null,
            event_type: args.eventType,
        })
        .onConflict((oc) => oc.column('provider_event_id').doNothing())
        .returning('provider_event_id')
        .executeTakeFirst();

    return Boolean(result);
}

export async function markLiveKitWebhookEventProcessed(
    dbClient: DbClient,
    args: { providerEventId: string; processingResult: string },
) {
    return dbClient
        .updateTable('livekit_webhook_events')
        .set({
            processed_at: new Date(),
            processing_result: args.processingResult,
        })
        .where('provider_event_id', '=', args.providerEventId)
        .executeTakeFirst();
}

export async function terminalizeLiveInspectionLease(
    dbClient: DbClient,
    args: {
        leaseId: string;
        state: Extract<LiveInspectionState, 'ENDED' | 'FAILED' | 'EXPIRED'>;
        endReason: LiveInspectionTerminalReason;
        lastErrorCode?: string | null;
    },
) {
    return dbClient
        .updateTable('live_inspection_leases')
        .set((eb) => ({
            state: sql`${args.state}`,
            version: eb('version', '+', 1),
            ended_at: new Date(),
            end_reason: args.endReason,
            last_error_code: args.lastErrorCode ?? null,
            updated_at: new Date(),
        }))
        .where('lease_id', '=', args.leaseId)
        .where('state', 'not in', ['ENDED', 'FAILED', 'EXPIRED'])
        .returningAll()
        .executeTakeFirst();
}

function mapAcquireConstraintError(error: unknown): LiveInspectionAcquireResult {
    const message = String((error as { message?: string }).message ?? error);

    if (message.includes('live_inspection_leases_active_viewer_key')) {
        return { ok: false, code: 'VIEWER_ALREADY_ACTIVE' };
    }

    return { ok: false, code: 'INSPECTION_ALREADY_ACTIVE' };
}

function isTerminalState(state: LiveInspectionState) {
    return state === 'ENDED' || state === 'FAILED' || state === 'EXPIRED';
}
