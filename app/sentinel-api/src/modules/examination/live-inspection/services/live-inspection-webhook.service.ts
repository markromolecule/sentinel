import type { DbClient } from '@sentinel/db';
import type { WebhookEvent } from 'livekit-server-sdk';
import {
    getLiveInspectionLeaseByRoomName,
    markLiveKitWebhookEventProcessed,
    recordLiveKitWebhookEventOnce,
} from '../live-inspection.repository';
import {
    terminalizeLiveInspectionLeaseState,
    transitionLiveInspectionLeaseState,
} from '../live-inspection-state.service';
import {
    getLiveKitWebhookRoomName,
    buildLiveKitParticipantIdentity,
} from '../../../infrastructure/livekit/services/livekit-managed.service';
import { LiveKitService } from '../../../infrastructure/livekit/livekit.service';
import type { LiveKitManagedService } from '../../../infrastructure/livekit/services/livekit-managed.service';

export type ProcessLiveKitWebhookArgs = {
    dbClient: DbClient;
    event: WebhookEvent;
    liveKit?: Pick<LiveKitManagedService, 'listInspectionParticipants'>;
};

/**
 * Records and processes one verified LiveKit webhook event.
 */
export async function processLiveKitWebhook(args: ProcessLiveKitWebhookArgs) {
    const roomName = getLiveKitWebhookRoomName(args.event);
    const providerEventId = buildWebhookEventId(args.event);
    const lease = roomName
        ? await getLiveInspectionLeaseByRoomName(args.dbClient, roomName)
        : undefined;
    const inserted = await recordLiveKitWebhookEventOnce(args.dbClient, {
        providerEventId,
        leaseId: lease?.lease_id,
        eventType: args.event.event,
    });

    if (!inserted) {
        return { processed: false, result: 'DUPLICATE' };
    }

    let result = 'IGNORED';

    if (lease) {
        const identity = args.event.participant?.identity ?? '';

        try {
            if (
                args.event.event === 'track_published' &&
                identity === buildLiveKitParticipantIdentity(lease.lease_id, 'publisher') &&
                lease.state === 'PUBLISHER_CONNECTING'
            ) {
                const readyLease = await transitionLiveInspectionLeaseState({
                    dbClient: args.dbClient,
                    leaseId: lease.lease_id,
                    fromState: 'PUBLISHER_CONNECTING',
                    toState: 'PUBLISHER_READY',
                    expectedVersion: lease.version,
                });
                await LiveKitService.logLiveInspectionLifecycleEvent(args.dbClient, {
                    metric: 'publisher_ready',
                    leaseId: lease.lease_id,
                    attemptId: lease.attempt_id,
                    examId: lease.exam_id,
                    actorId: lease.student_user_id,
                    institutionId: lease.institution_id,
                    role: 'publisher',
                    state: 'PUBLISHER_READY',
                    previousState: 'PUBLISHER_CONNECTING',
                    durationMs: Date.now() - lease.requested_at.getTime(),
                    boundedCode: 'PUBLISHER_READY',
                });
                result = (await promoteWaitingViewerToLive(args, readyLease))
                    ? 'VIEWER_LIVE'
                    : 'PUBLISHER_READY';
            } else if (
                args.event.event === 'track_published' &&
                identity === buildLiveKitParticipantIdentity(lease.lease_id, 'publisher') &&
                lease.state === 'PUBLISHER_READY'
            ) {
                result = (await promoteWaitingViewerToLive(args, lease))
                    ? 'VIEWER_LIVE'
                    : 'PUBLISHER_READY';
            } else if (
                args.event.event === 'participant_joined' &&
                identity === buildLiveKitParticipantIdentity(lease.lease_id, 'viewer') &&
                lease.state === 'PUBLISHER_READY'
            ) {
                await transitionLiveInspectionLeaseState({
                    dbClient: args.dbClient,
                    leaseId: lease.lease_id,
                    fromState: 'PUBLISHER_READY',
                    toState: 'LIVE',
                    expectedVersion: lease.version,
                });
                await LiveKitService.logLiveInspectionLifecycleEvent(args.dbClient, {
                    metric: 'live',
                    leaseId: lease.lease_id,
                    attemptId: lease.attempt_id,
                    examId: lease.exam_id,
                    actorId: lease.viewer_user_id,
                    institutionId: lease.institution_id,
                    role: 'viewer',
                    state: 'LIVE',
                    previousState: 'PUBLISHER_READY',
                    durationMs: Date.now() - lease.requested_at.getTime(),
                    boundedCode: 'VIEWER_LIVE',
                });
                result = 'VIEWER_LIVE';
            } else if (args.event.event === 'room_finished') {
                await terminalizeLiveInspectionLeaseState({
                    dbClient: args.dbClient,
                    leaseId: lease.lease_id,
                    state: 'ENDED',
                    endReason: 'EXAM_ENDED',
                });
                await LiveKitService.logLiveInspectionLifecycleEvent(args.dbClient, {
                    metric: 'ended',
                    leaseId: lease.lease_id,
                    attemptId: lease.attempt_id,
                    examId: lease.exam_id,
                    actorId: lease.viewer_user_id,
                    institutionId: lease.institution_id,
                    role: 'system',
                    state: 'ENDED',
                    previousState: lease.state,
                    reason: 'EXAM_ENDED',
                    durationMs: Date.now() - lease.requested_at.getTime(),
                    boundedCode: 'ROOM_FINISHED',
                });
                result = 'ROOM_FINISHED';
            } else if (
                [
                    'participant_left',
                    'participant_connection_aborted',
                    'track_unpublished',
                ].includes(args.event.event)
            ) {
                const endReason =
                    identity === buildLiveKitParticipantIdentity(lease.lease_id, 'publisher')
                        ? 'STUDENT_DISCONNECTED'
                        : 'VIEWER_DISCONNECTED';
                await terminalizeLiveInspectionLeaseState({
                    dbClient: args.dbClient,
                    leaseId: lease.lease_id,
                    state: 'FAILED',
                    endReason,
                });
                await LiveKitService.logLiveInspectionLifecycleEvent(args.dbClient, {
                    metric: 'failed',
                    leaseId: lease.lease_id,
                    attemptId: lease.attempt_id,
                    examId: lease.exam_id,
                    actorId:
                        endReason === 'STUDENT_DISCONNECTED'
                            ? lease.student_user_id
                            : lease.viewer_user_id,
                    institutionId: lease.institution_id,
                    role: endReason === 'STUDENT_DISCONNECTED' ? 'publisher' : 'viewer',
                    state: 'FAILED',
                    previousState: lease.state,
                    reason: endReason,
                    durationMs: Date.now() - lease.requested_at.getTime(),
                    boundedCode: 'PARTICIPANT_DISCONNECTED',
                });
                result = 'PARTICIPANT_DISCONNECTED';
            }
        } catch {
            result = 'OUT_OF_ORDER';
        }
    }

    await markLiveKitWebhookEventProcessed(args.dbClient, {
        providerEventId,
        processingResult: result,
    });

    return { processed: true, result };
}

async function promoteWaitingViewerToLive(
    args: ProcessLiveKitWebhookArgs,
    lease: Awaited<ReturnType<typeof getLiveInspectionLeaseByRoomName>>,
) {
    if (!lease || !args.liveKit) {
        return false;
    }

    const participants = await args.liveKit.listInspectionParticipants(lease.provider_room_name);
    const viewerIdentity = buildLiveKitParticipantIdentity(lease.lease_id, 'viewer');

    if (!participants.some((participant) => participant.identity === viewerIdentity)) {
        return false;
    }

    await transitionLiveInspectionLeaseState({
        dbClient: args.dbClient,
        leaseId: lease.lease_id,
        fromState: 'PUBLISHER_READY',
        toState: 'LIVE',
        expectedVersion: lease.version,
    });
    await LiveKitService.logLiveInspectionLifecycleEvent(args.dbClient, {
        metric: 'live',
        leaseId: lease.lease_id,
        attemptId: lease.attempt_id,
        examId: lease.exam_id,
        actorId: lease.viewer_user_id,
        institutionId: lease.institution_id,
        role: 'viewer',
        state: 'LIVE',
        previousState: 'PUBLISHER_READY',
        durationMs: Date.now() - lease.requested_at.getTime(),
        boundedCode: 'VIEWER_LIVE',
    });

    return true;
}

function buildWebhookEventId(event: WebhookEvent) {
    const roomName = event.room?.name ?? 'unknown-room';
    const identity = event.participant?.identity ?? 'none';
    const createdAt = String((event as { createdAt?: number | bigint }).createdAt ?? Date.now());

    return `${event.event}:${roomName}:${identity}:${createdAt}`.slice(0, 160);
}
