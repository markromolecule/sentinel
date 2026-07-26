import { HTTPException } from 'hono/http-exception';
import type { DbClient } from '@sentinel/db';
import { liveInspectionConnectionResponseSchema } from '@sentinel/shared/schema';
import { getLiveKitConfig } from '../../../infrastructure/livekit/livekit.config';
import { LiveKitManagedService } from '../../../infrastructure/livekit/services/livekit-managed.service';
import { LiveKitService } from '../../../infrastructure/livekit/livekit.service';
import {
    getLiveInspectionLeaseForStudent,
    terminalizeLiveInspectionLease,
} from '../live-inspection.repository';
import { assertLiveInspectionStudentAccess } from '../live-inspection-access.service';
import { transitionLiveInspectionLeaseState } from '../live-inspection-state.service';
import {
    assertLiveInspectionEnabled,
    isLiveInspectionLeaseExpired,
    toLiveInspectionProviderFailureCode,
    type LiveInspectionServiceDeps,
} from './live-inspection-service-helpers';

export type CreatePublisherConnectionArgs = {
    dbClient: DbClient;
    sessionId: string;
    studentUserId: string;
    leaseId: string;
    revision: number;
};

/**
 * Claims the publisher slot and returns a camera-only token to the owning student.
 */
export async function createPublisherConnection(
    args: CreatePublisherConnectionArgs,
    deps: LiveInspectionServiceDeps = {},
) {
    const config = assertLiveInspectionEnabled(deps);
    const attempt = await assertLiveInspectionStudentAccess({
        dbClient: args.dbClient,
        sessionId: args.sessionId,
        studentUserId: args.studentUserId,
    });
    const lease = await getLiveInspectionLeaseForStudent(args.dbClient, {
        leaseId: args.leaseId,
        studentUserId: args.studentUserId,
    });

    if (!lease || lease.attempt_id !== attempt.attempt_id || isLiveInspectionLeaseExpired(lease)) {
        throw new HTTPException(404, { message: 'Live inspection is not available.' });
    }

    if (
        (lease.state !== 'REQUESTED' && lease.state !== 'PUBLISHER_CONNECTING') ||
        lease.version !== args.revision
    ) {
        throw new HTTPException(409, { message: 'Live inspection lease changed.' });
    }

    // Reissuing credentials while already connecting is safe and makes the
    // handshake recoverable when the first token response is lost after the
    // REQUESTED -> PUBLISHER_CONNECTING transition commits.
    const connecting =
        lease.state === 'REQUESTED'
            ? await transitionLiveInspectionLeaseState({
                  dbClient: args.dbClient,
                  leaseId: lease.lease_id,
                  fromState: 'REQUESTED',
                  toState: 'PUBLISHER_CONNECTING',
                  expectedVersion: args.revision,
              })
            : lease;

    const liveKit = deps.liveKit ?? new LiveKitManagedService({ config: deps.config ?? config });

    try {
        const token = await liveKit.createPublisherToken({
            roomName: lease.provider_room_name,
            leaseId: lease.lease_id,
        });
        await LiveKitService.logLiveInspectionLifecycleEvent(args.dbClient, {
            metric: 'publisher_connecting',
            leaseId: lease.lease_id,
            attemptId: lease.attempt_id,
            examId: lease.exam_id,
            actorId: args.studentUserId,
            institutionId: lease.institution_id,
            role: 'publisher',
            state: 'PUBLISHER_CONNECTING',
            previousState: lease.state,
            durationMs: Date.now() - lease.requested_at.getTime(),
        });
        await LiveKitService.logLiveKitTokenGranted(args.dbClient, {
            attemptId: lease.attempt_id,
            actorId: args.studentUserId,
            institutionId: lease.institution_id,
            roomName: lease.provider_room_name,
            identity: token.participantIdentity,
            role: 'publisher',
        });

        return liveInspectionConnectionResponseSchema.parse({
            leaseId: lease.lease_id,
            revision: connecting.version,
            roomName: lease.provider_room_name,
            token: token.token,
            liveKitUrl: token.liveKitUrl,
            participantIdentity: token.participantIdentity,
            expiresAt: token.expiresAt.toISOString(),
        });
    } catch (error) {
        await terminalizeLiveInspectionLease(args.dbClient, {
            leaseId: lease.lease_id,
            state: 'FAILED',
            endReason: 'TOKEN_ERROR',
            lastErrorCode: toLiveInspectionProviderFailureCode(error),
        });
        throw error;
    }
}
