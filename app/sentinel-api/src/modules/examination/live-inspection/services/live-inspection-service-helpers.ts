import { randomUUID } from 'node:crypto';
import { HTTPException } from 'hono/http-exception';
import type { DbClient } from '@sentinel/db';
import type {
    LiveInspectionState,
    LiveInspectionStaffStatus,
    LiveInspectionConnectionResponse,
} from '@sentinel/shared/schema';
import type { LiveKitConfig } from '../../../infrastructure/livekit/livekit.config';
import { getLiveKitConfig } from '../../../infrastructure/livekit/livekit.config';
import type { LiveKitManagedService } from '../../../infrastructure/livekit/services/livekit-managed.service';
import {
    buildLiveKitParticipantIdentity,
    LiveKitProviderError,
} from '../../../infrastructure/livekit/services/livekit-managed.service';
import type { Selectable } from 'kysely';
import type { live_inspection_leases } from '@sentinel/db';

export type LiveInspectionLeaseRecord = Selectable<live_inspection_leases>;

export type LiveInspectionServiceDeps = {
    config?: LiveKitConfig;
    liveKit?: Pick<
        LiveKitManagedService,
        | 'createInspectionRoom'
        | 'createPublisherToken'
        | 'createViewerToken'
        | 'removeParticipant'
        | 'deleteInspectionRoom'
        | 'listInspectionParticipants'
    >;
};

/**
 * Fails closed when the managed LiveKit feature is disabled or misconfigured.
 */
export function assertLiveInspectionEnabled(
    deps: LiveInspectionServiceDeps,
    institutionId?: string | null,
) {
    const config = deps.config ?? getLiveKitConfig();

    if (!config.enabled) {
        throw new HTTPException(503, { message: 'Live inspection is disabled.' });
    }

    if (
        config.allowedInstitutionIds.length > 0 &&
        institutionId &&
        !config.allowedInstitutionIds.includes(institutionId)
    ) {
        throw new HTTPException(403, {
            message: 'Live inspection is not enabled for this institution.',
        });
    }

    return config;
}

/**
 * Maps a lease row into the redacted staff status contract.
 */
export function mapLiveInspectionLeaseStatus(
    lease: LiveInspectionLeaseRecord,
    connection?: LiveInspectionConnectionResponse,
): LiveInspectionStaffStatus {
    return {
        leaseId: lease.lease_id,
        attemptId: lease.attempt_id,
        studentUserId: lease.student_user_id,
        viewerUserId: lease.viewer_user_id,
        state: lease.state as LiveInspectionState,
        revision: lease.version,
        requestedAt: lease.requested_at.toISOString(),
        expiresAt: lease.expires_at.toISOString(),
        startedAt: lease.started_at?.toISOString() ?? null,
        endedAt: lease.ended_at?.toISOString() ?? null,
        endReason: lease.end_reason,
        lastErrorCode: lease.last_error_code,
        ...(connection ? { connection } : {}),
    };
}

/**
 * Creates an opaque provider room name that carries no user/exam metadata.
 */
export function createLiveInspectionRoomName() {
    return `sentinel-live-inspection-${randomUUID()}`;
}

/**
 * Returns true for non-terminal leases that have passed their hard deadline.
 */
export function isLiveInspectionLeaseExpired(lease: LiveInspectionLeaseRecord, now = new Date()) {
    return lease.expires_at.getTime() <= now.getTime();
}

/**
 * Converts provider exceptions into bounded HTTP errors and optional failure codes.
 */
export function toLiveInspectionProviderFailureCode(error: unknown) {
    if (error instanceof LiveKitProviderError) {
        return error.code;
    }

    return 'PROVIDER_ROOM_ERROR';
}

export function throwLiveInspectionConflict(message = 'Live inspection lease conflict.'): never {
    throw new HTTPException(409, { message });
}

export function throwLiveInspectionUnavailable(
    message = 'Live inspection is not available.',
): never {
    throw new HTTPException(404, { message });
}

/**
 * Best-effort provider cleanup for the two opaque participants in a lease.
 */
export async function cleanupLiveInspectionProviderRoom(
    liveKit: LiveInspectionServiceDeps['liveKit'],
    lease: LiveInspectionLeaseRecord,
) {
    if (!liveKit) return;

    const cleanupResults = await Promise.allSettled([
        liveKit.removeParticipant({
            roomName: lease.provider_room_name,
            participantIdentity: buildLiveKitParticipantIdentity(lease.lease_id, 'publisher'),
        }),
        liveKit.removeParticipant({
            roomName: lease.provider_room_name,
            participantIdentity: buildLiveKitParticipantIdentity(lease.lease_id, 'viewer'),
        }),
        liveKit.deleteInspectionRoom(lease.provider_room_name),
    ]);

    const deleteResult = cleanupResults[2];
    if (deleteResult?.status === 'rejected') {
        throw deleteResult.reason;
    }
}

/**
 * Resolves the active attempt record used by staff lease acquisition.
 */
export async function getLiveInspectionAttemptForStaff(
    dbClient: DbClient,
    args: { examId: string; attemptId: string },
) {
    return dbClient
        .selectFrom('exam_attempts as ea')
        .innerJoin('students as st', 'st.student_id', 'ea.student_id')
        .innerJoin('exams as e', 'e.exam_id', 'ea.exam_id')
        .select([
            'ea.attempt_id as attemptId',
            'ea.exam_id as examId',
            'st.user_id as studentUserId',
            'e.institution_id as institutionId',
        ])
        .where('ea.attempt_id', '=', args.attemptId)
        .where('ea.exam_id', '=', args.examId)
        .executeTakeFirst();
}
