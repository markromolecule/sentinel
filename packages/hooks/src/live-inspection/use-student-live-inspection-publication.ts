'use client';

import { useCallback, useRef, useState, type RefObject } from 'react';
import { Room, Track } from 'livekit-client';
import type { LiveInspectionDirective } from '@sentinel/shared/schema';
import type { ApiClientType } from '@sentinel/services';
import {
    acknowledgeLiveInspectionPublisherFailure,
    acknowledgeLiveInspectionPublisherReady,
    createLiveInspectionPublisherConnection,
} from '@sentinel/services';
import {
    cloneCameraTrackForLiveInspection,
    stopClonedInspectionTrack,
} from './live-inspection-room.utils';
import {
    logLocalDiagnostic,
    useLatestRef,
    waitForCameraTrack,
} from './use-student-live-inspection-publisher.helpers';
import type {
    StudentLiveInspectionPublisherFailureCode,
    StudentLiveInspectionPublisherStatus,
} from './use-student-live-inspection-publisher.types';

export type ActivePublication = {
    leaseId: string;
    revision: number;
    room: Room;
    clonedTrack: MediaStreamTrack;
};

export type UseStudentLiveInspectionPublicationArgs = {
    apiClient: ApiClientType;
    sessionId: string | null | undefined;
    enabled: boolean;
    getLiveVideoTrack: () => MediaStreamTrack | null;
    requestSequenceRef: RefObject<number>;
    isMountedRef: RefObject<boolean>;
    statusRef: RefObject<StudentLiveInspectionPublisherStatus>;
    setPublisherStatus: (status: StudentLiveInspectionPublisherStatus) => void;
    onFailure?: (code: StudentLiveInspectionPublisherFailureCode) => void;
    runReconcileNow: () => Promise<void>;
};

/**
 * Manages LiveKit publication connection, ready/failure acknowledgments,
 * camera track cloning, and room lifecycles.
 */
export function useStudentLiveInspectionPublication({
    apiClient,
    sessionId,
    enabled,
    getLiveVideoTrack,
    requestSequenceRef,
    isMountedRef,
    statusRef,
    setPublisherStatus,
    onFailure,
    runReconcileNow,
}: UseStudentLiveInspectionPublicationArgs) {
    const [activeLeaseId, setActiveLeaseId] = useState<string | null>(null);

    const activePublicationRef = useRef<ActivePublication | null>(null);
    const currentLeaseIdRef = useRef<string | null>(null);
    const currentRevisionRef = useRef(0);

    const getLiveVideoTrackRef = useLatestRef(getLiveVideoTrack);
    const apiClientRef = useLatestRef(apiClient);
    const onFailureRef = useLatestRef(onFailure);
    const runReconcileNowRef = useLatestRef(runReconcileNow);

    const cleanupPublication = useCallback(() => {
        const publication = activePublicationRef.current;
        if (!publication) {
            return;
        }

        activePublicationRef.current = null;
        try {
            publication.room.localParticipant.unpublishTrack(publication.clonedTrack, false);
        } catch {
            // Best-effort browser cleanup; authoritative state is handled by the backend API.
        }
        stopClonedInspectionTrack(publication.clonedTrack);
        publication.room.removeAllListeners?.();
        publication.room.disconnect();
        setActiveLeaseId(null);
    }, []);

    const acknowledgeFailure = useCallback(
        async (
            directive: LiveInspectionDirective,
            errorCode: StudentLiveInspectionPublisherFailureCode,
        ) => {
            onFailureRef.current?.(errorCode);
            setPublisherStatus('failed');
            try {
                await acknowledgeLiveInspectionPublisherFailure(apiClientRef.current, {
                    sessionId: sessionId ?? '',
                    leaseId: directive.leaseId,
                    revision: directive.revision,
                    errorCode,
                });
            } catch (error) {
                logLocalDiagnostic('acknowledge_failure', error);
                // A stale/terminal lease might reject the acknowledgement; do not retry.
            }
        },
        [sessionId, setPublisherStatus],
    );

    const startPublication = useCallback(
        async (directive: LiveInspectionDirective, sequence: number) => {
            if (!sessionId || activePublicationRef.current?.leaseId === directive.leaseId) {
                return;
            }

            setPublisherStatus('connecting');

            const originalTrack = await waitForCameraTrack({
                sequence,
                getLiveVideoTrack: () => getLiveVideoTrackRef.current(),
                isMounted: isMountedRef,
                enabled,
                requestSequenceRef,
            });
            const clonedTrack = cloneCameraTrackForLiveInspection(originalTrack);

            if (sequence !== requestSequenceRef.current || !isMountedRef.current) {
                return;
            }

            if (!clonedTrack) {
                await acknowledgeFailure(directive, 'NO_LIVE_CAMERA_TRACK');
                return;
            }

            let room: Room | null = null;
            let credentials = directive.connection;

            if (!credentials) {
                try {
                    credentials = await createLiveInspectionPublisherConnection(apiClientRef.current, {
                        sessionId,
                        leaseId: directive.leaseId,
                        revision: directive.revision,
                    });
                } catch (error) {
                    logLocalDiagnostic('create_publisher_connection', error);
                    if (sequence !== requestSequenceRef.current || !isMountedRef.current) {
                        stopClonedInspectionTrack(clonedTrack);
                        return;
                    }
                    stopClonedInspectionTrack(clonedTrack);
                    await acknowledgeFailure(directive, 'LIVEKIT_CONNECT_FAILED');
                    return;
                }
            }

            try {
                if (sequence !== requestSequenceRef.current || !isMountedRef.current) {
                    stopClonedInspectionTrack(clonedTrack);
                    return;
                }

                room = new Room({ dynacast: true });
                // react-doctor-disable-next-line react-doctor/effect-needs-cleanup
                room.on('disconnected', () => {
                    logLocalDiagnostic('room_disconnected', {
                        message: 'LiveKit room disconnected.',
                    });
                    void runReconcileNowRef.current?.();
                });

                await room.connect(credentials.liveKitUrl, credentials.token, {
                    autoSubscribe: false,
                });
                await room.localParticipant.publishTrack(clonedTrack, {
                    source: Track.Source.Camera,
                    simulcast: false,
                    videoCodec: 'vp8',
                    stopLocalTrackOnUnpublish: false,
                } as Parameters<Room['localParticipant']['publishTrack']>[1]);

                activePublicationRef.current = {
                    leaseId: directive.leaseId,
                    revision: credentials.revision,
                    room,
                    clonedTrack,
                };
                currentRevisionRef.current = credentials.revision;
                setActiveLeaseId(directive.leaseId);

                // Non-blocking background ready acknowledgment
                void acknowledgeLiveInspectionPublisherReady(apiClientRef.current, {
                    sessionId,
                    leaseId: directive.leaseId,
                    revision: credentials.revision,
                }).catch((error) => {
                    logLocalDiagnostic('acknowledge_ready', error);
                });

                if (sequence === requestSequenceRef.current && isMountedRef.current) {
                    setPublisherStatus('live');
                }
            } catch (error) {
                logLocalDiagnostic('livekit_publish_or_connect', error);
                if (room) {
                    room.disconnect();
                }
                stopClonedInspectionTrack(clonedTrack);
                await acknowledgeFailure(
                    directive,
                    room ? 'LIVEKIT_PUBLISH_FAILED' : 'LIVEKIT_CONNECT_FAILED',
                );
            }
        },
        [acknowledgeFailure, enabled, sessionId, setPublisherStatus],
    );

    return {
        activeLeaseId,
        activePublicationRef,
        currentLeaseIdRef,
        currentRevisionRef,
        cleanupPublication,
        startPublication,
        acknowledgeFailure,
    };
}
