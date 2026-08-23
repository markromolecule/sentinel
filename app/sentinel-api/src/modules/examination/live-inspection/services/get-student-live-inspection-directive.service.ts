import { HTTPException } from 'hono/http-exception';
import type { DbClient } from '@sentinel/db';
import { liveInspectionDirectiveSchema } from '@sentinel/shared/schema';
import {
    getActiveLiveInspectionLeaseForAttempt,
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
import { LiveKitManagedService } from '../../../infrastructure/livekit/services/livekit-managed.service';
import { LiveKitService } from '../../../infrastructure/livekit/livekit.service';
import { getLiveKitConfig } from '../../../infrastructure/livekit/livekit.config';

export type GetStudentLiveInspectionDirectiveArgs = {
    dbClient: DbClient;
    sessionId: string;
    studentUserId: string;
};

/**
 * Returns the authenticated student's private wake-up directive for an active lease.
 * When the lease is actionable (REQUESTED or PUBLISHER_CONNECTING), bundles pre-generated
 * publisher LiveKit credentials and transitions state to PUBLISHER_CONNECTING.
 */
export async function getStudentLiveInspectionDirective(
    args: GetStudentLiveInspectionDirectiveArgs,
    deps: LiveInspectionServiceDeps = {},
) {
    const attempt = await assertLiveInspectionStudentAccess({
        dbClient: args.dbClient,
        sessionId: args.sessionId,
        studentUserId: args.studentUserId,
    });

    if (!attempt.exam_id) {
        throw new HTTPException(404, { message: 'Live inspection is not available.' });
    }

    const lease = await getActiveLiveInspectionLeaseForAttempt(args.dbClient, {
        examId: attempt.exam_id,
        attemptId: attempt.attempt_id,
    });

    if (!lease || isLiveInspectionLeaseExpired(lease)) {
        throw new HTTPException(404, { message: 'Live inspection is not available.' });
    }

    if (lease.state === 'REQUESTED' || lease.state === 'PUBLISHER_CONNECTING') {
        const config = assertLiveInspectionEnabled(deps, lease.institution_id);

        const connecting =
            lease.state === 'REQUESTED'
                ? await transitionLiveInspectionLeaseState({
                      dbClient: args.dbClient,
                      leaseId: lease.lease_id,
                      fromState: 'REQUESTED',
                      toState: 'PUBLISHER_CONNECTING',
                      expectedVersion: lease.version,
                  })
                : lease;

        const liveKit =
            deps.liveKit ?? new LiveKitManagedService({ config: deps.config ?? config });

        try {
            const token = await liveKit.createPublisherToken({
                roomName: lease.provider_room_name,
                leaseId: lease.lease_id,
            });

            if (lease.state === 'REQUESTED') {
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
            }

            await LiveKitService.logLiveKitTokenGranted(args.dbClient, {
                attemptId: lease.attempt_id,
                actorId: args.studentUserId,
                institutionId: lease.institution_id,
                roomName: lease.provider_room_name,
                identity: token.participantIdentity,
                role: 'publisher',
            });

            const connection = {
                leaseId: lease.lease_id,
                revision: connecting.version,
                roomName: lease.provider_room_name,
                token: token.token,
                liveKitUrl: token.liveKitUrl,
                participantIdentity: token.participantIdentity,
                expiresAt: token.expiresAt.toISOString(),
            };

            return liveInspectionDirectiveSchema.parse({
                leaseId: lease.lease_id,
                revision: connecting.version,
                state: connecting.state,
                attemptId: lease.attempt_id,
                topic: `exam-attempt:${lease.attempt_id}:live-inspection`,
                connection,
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

    return liveInspectionDirectiveSchema.parse({
        leaseId: lease.lease_id,
        revision: lease.version,
        state: lease.state,
        attemptId: lease.attempt_id,
        topic: `exam-attempt:${lease.attempt_id}:live-inspection`,
    });
}
