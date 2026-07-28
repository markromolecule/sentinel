import { HTTPException } from 'hono/http-exception';
import type { DbClient } from '@sentinel/db';
import { LiveKitService } from '../../../infrastructure/livekit/livekit.service';
import {
    acquireLiveInspectionLease,
    countActiveLiveInspectionLeases,
    countActiveLiveInspectionLeasesByInstitution,
    getActiveLiveInspectionLeaseForAttempt,
    getActiveLiveInspectionLeaseForViewer,
    terminalizeLiveInspectionLease,
} from '../live-inspection.repository';
import { assertLiveInspectionViewerAccess } from '../live-inspection-access.service';
import { stopLiveInspection } from './stop-live-inspection.service';
import {
    assertLiveInspectionEnabled,
    createLiveInspectionRoomName,
    getLiveInspectionAttemptForStaff,
    mapLiveInspectionLeaseStatus,
    type LiveInspectionServiceDeps,
} from './live-inspection-service-helpers';

export type StartLiveInspectionArgs = {
    dbClient: DbClient;
    examId: string;
    attemptId: string;
    restart?: boolean;
    viewerUserId: string;
    role: string;
    activeInstitutionId: string;
    activePermissionKeys?: string[] | Set<string>;
};

/**
 * Starts one durable inspection lease and returns immediately so the viewer and
 * student can begin their LiveKit handshakes without waiting on a separate
 * provider room-creation round trip.
 */
export async function startLiveInspection(
    args: StartLiveInspectionArgs,
    deps: LiveInspectionServiceDeps = {},
) {
    const config = assertLiveInspectionEnabled(deps, args.activeInstitutionId);

    const access = await assertLiveInspectionViewerAccess({
        dbClient: args.dbClient,
        attemptId: args.attemptId,
        viewerUserId: args.viewerUserId,
        role: args.role,
        activeInstitutionId: args.activeInstitutionId,
        activePermissionKeys: args.activePermissionKeys,
    });

    const attempt = await getLiveInspectionAttemptForStaff(args.dbClient, {
        examId: args.examId,
        attemptId: args.attemptId,
    });

    if (!attempt?.studentUserId || !attempt.institutionId || access.examId !== args.examId) {
        throw new HTTPException(404, { message: 'Live inspection is not available.' });
    }

    const existingLease = await getActiveLiveInspectionLeaseForAttempt(args.dbClient, {
        examId: args.examId,
        attemptId: args.attemptId,
    });

    if (existingLease) {
        if (existingLease.viewer_user_id !== args.viewerUserId) {
            throw new HTTPException(409, { message: 'Live inspection is already active.' });
        }

        if (args.restart !== true) {
            return mapLiveInspectionLeaseStatus(existingLease);
        }

        // Restart requested: stop old lease and provider room
        await stopLiveInspection(
            {
                dbClient: args.dbClient,
                examId: args.examId,
                leaseId: existingLease.lease_id,
                viewerUserId: args.viewerUserId,
                role: args.role,
                activeInstitutionId: args.activeInstitutionId,
                activePermissionKeys: args.activePermissionKeys,
            },
            deps,
        );
    }

    // Browser navigation and tab closure can prevent the previous monitor's
    // best-effort stop request from reaching the API. Converge by stopping a
    // different lease still owned by this viewer before acquiring the new one.
    const previousViewerLease = await getActiveLiveInspectionLeaseForViewer(
        args.dbClient,
        args.viewerUserId,
    );

    if (previousViewerLease && previousViewerLease.attempt_id !== args.attemptId) {
        await stopLiveInspection(
            {
                dbClient: args.dbClient,
                examId: previousViewerLease.exam_id,
                leaseId: previousViewerLease.lease_id,
                viewerUserId: args.viewerUserId,
                role: args.role,
                activeInstitutionId: args.activeInstitutionId,
                activePermissionKeys: args.activePermissionKeys,
            },
            deps,
        );
    }

    // Capacity checks occur AFTER the old lease is stopped (releasing its slot)
    const activeGlobalCount = await countActiveLiveInspectionLeases(args.dbClient);

    if (activeGlobalCount >= config.globalActiveInspectionLimit) {
        throw new HTTPException(429, { message: 'Live inspection global capacity reached.' });
    }

    const activeInstitutionCount = await countActiveLiveInspectionLeasesByInstitution(
        args.dbClient,
        attempt.institutionId,
    );

    if (activeInstitutionCount >= config.institutionActiveInspectionLimit) {
        throw new HTTPException(429, { message: 'Live inspection institution capacity reached.' });
    }

    const providerRoomName = createLiveInspectionRoomName();
    const expiresAt = new Date(Date.now() + config.maxInspectionDurationSeconds * 1000);
    let acquired = await acquireLiveInspectionLease(args.dbClient, {
        examId: args.examId,
        attemptId: args.attemptId,
        studentUserId: attempt.studentUserId,
        viewerUserId: args.viewerUserId,
        institutionId: attempt.institutionId,
        providerRoomName,
        expiresAt,
    });

    if (!acquired.ok) {
        // Race condition: if another concurrent thread successfully acquired the lease for this same viewer/attempt
        const racedLease = await getActiveLiveInspectionLeaseForAttempt(args.dbClient, {
            examId: args.examId,
            attemptId: args.attemptId,
        });

        if (racedLease && racedLease.viewer_user_id === args.viewerUserId) {
            return mapLiveInspectionLeaseStatus(racedLease);
        }

        if (acquired.code === 'VIEWER_ALREADY_ACTIVE') {
            // The active-viewer pre-check can race with another request or a
            // delayed browser cleanup. Resolve the lease identified by the
            // database constraint, stop it, and retry the insert once.
            const conflictingViewerLease = await getActiveLiveInspectionLeaseForViewer(
                args.dbClient,
                args.viewerUserId,
            );

            if (conflictingViewerLease && conflictingViewerLease.attempt_id !== args.attemptId) {
                await stopLiveInspection(
                    {
                        dbClient: args.dbClient,
                        examId: conflictingViewerLease.exam_id,
                        leaseId: conflictingViewerLease.lease_id,
                        viewerUserId: args.viewerUserId,
                        role: args.role,
                        activeInstitutionId: args.activeInstitutionId,
                        activePermissionKeys: args.activePermissionKeys,
                    },
                    deps,
                );

                acquired = await acquireLiveInspectionLease(args.dbClient, {
                    examId: args.examId,
                    attemptId: args.attemptId,
                    studentUserId: attempt.studentUserId,
                    viewerUserId: args.viewerUserId,
                    institutionId: attempt.institutionId,
                    providerRoomName,
                    expiresAt,
                });

                if (!acquired.ok) {
                    const retriedLease = await getActiveLiveInspectionLeaseForAttempt(
                        args.dbClient,
                        {
                            examId: args.examId,
                            attemptId: args.attemptId,
                        },
                    );

                    if (retriedLease?.viewer_user_id === args.viewerUserId) {
                        return mapLiveInspectionLeaseStatus(retriedLease);
                    }
                }
            }
        }

        if (!acquired.ok) {
            throw new HTTPException(409, {
                message:
                    acquired.code === 'VIEWER_ALREADY_ACTIVE'
                        ? 'Viewer already has an active live inspection.'
                        : 'Live inspection is already active.',
            });
        }
    }

    await LiveKitService.logLiveInspectionLifecycleEvent(args.dbClient, {
        metric: 'requested',
        leaseId: acquired.leaseId,
        attemptId: args.attemptId,
        examId: args.examId,
        actorId: args.viewerUserId,
        institutionId: attempt.institutionId,
        role: 'viewer',
        state: 'REQUESTED',
        activeGlobalCount: activeGlobalCount + 1,
        activeInstitutionCount: activeInstitutionCount + 1,
    });

    const lease = await getActiveLiveInspectionLeaseForAttempt(args.dbClient, {
        examId: args.examId,
        attemptId: args.attemptId,
    });

    return mapLiveInspectionLeaseStatus(lease!);
}
