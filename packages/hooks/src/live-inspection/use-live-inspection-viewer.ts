'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Room, RoomEvent, Track } from 'livekit-client';
import type { LiveInspectionStaffStatus, LiveInspectionState } from '@sentinel/shared/schema';
import {
    createLiveInspectionViewerConnection,
    getLiveInspectionStatus,
    startLiveInspection,
    stopLiveInspection,
    type ApiClientType,
} from '@sentinel/services';
import { useApi } from '../api-provider';

const VIEWER_STATUS_POLL_MS = 1_000;
const PUBLISHER_READY_TIMEOUT_MS = 30_000;
const TERMINAL_STATES = new Set<LiveInspectionState>(['ENDED', 'FAILED', 'EXPIRED']);

export type LiveInspectionViewerState =
    | 'idle'
    | 'requesting'
    | 'waiting_for_student'
    | 'connecting'
    | 'live'
    | 'reconnecting'
    | 'stopping'
    | 'ended'
    | 'failed';

export type LiveInspectionViewerReason =
    | 'NOT_ELIGIBLE'
    | 'PERMISSION_DENIED'
    | 'CAPACITY_REACHED'
    | 'CONFLICT'
    | 'OFFLINE'
    | 'TIMEOUT'
    | 'STUDENT_UNAVAILABLE'
    | 'UNEXPECTED_TRACK'
    | 'CONNECT_FAILED'
    | 'STOPPED'
    | 'NO_LIVE_CAMERA_TRACK'
    | 'LIVEKIT_CONNECT_FAILED'
    | 'LIVEKIT_PUBLISH_FAILED'
    | 'LIVEKIT_RUNTIME_LOST'
    | null;

export type UseLiveInspectionViewerArgs = {
    examId: string;
    studentId: string;
    attemptId: string | null | undefined;
    enabled: boolean;
    apiClient?: ApiClientType;
};

function mapErrorReason(error: unknown): LiveInspectionViewerReason {
    const message = error instanceof Error ? error.message : String(error ?? '');

    if (/429|capacity/i.test(message)) return 'CAPACITY_REACHED';
    if (/409|already|active|conflict/i.test(message)) return 'CONFLICT';
    if (/401|403|permission|denied|forbidden/i.test(message)) return 'PERMISSION_DENIED';
    if (/network|fetch|offline/i.test(message)) return 'OFFLINE';
    if (/timeout/i.test(message)) return 'TIMEOUT';

    return 'STUDENT_UNAVAILABLE';
}

function isExpectedRemoteCameraTrack(track: any, publication: any) {
    const source = publication?.source ?? track?.source;
    const kind = track?.kind ?? publication?.kind;

    return (
        kind !== 'audio' &&
        source !== Track.Source.ScreenShare &&
        source !== Track.Source.ScreenShareAudio &&
        (source === Track.Source.Camera || kind === 'video')
    );
}

/**
 * Owns the staff/admin LiveKit viewer lifecycle without exposing room tokens.
 */
export function useLiveInspectionViewer({
    examId,
    studentId,
    attemptId,
    enabled,
    apiClient: providedApiClient,
}: UseLiveInspectionViewerArgs) {
    const contextApiClient = useApi();
    const apiClient = providedApiClient ?? contextApiClient;
    const videoElementRef = useRef<HTMLVideoElement | null>(null);
    const roomRef = useRef<Room | null>(null);
    const leaseRef = useRef<LiveInspectionStaffStatus | null>(null);
    const attachedTrackRef = useRef<any>(null);
    const isVideoPlayableRef = useRef(false);
    const pollTimerRef = useRef<number | null>(null);
    const pollStartTimeRef = useRef<number | null>(null);
    const stopRequestedRef = useRef(false);
    const [state, setState] = useState<LiveInspectionViewerState>('idle');
    const [reason, setReason] = useState<LiveInspectionViewerReason>(null);
    const [connectionQuality, setConnectionQuality] = useState<string | null>(null);
    const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

    const clearPollTimer = useCallback(() => {
        if (pollTimerRef.current !== null) {
            window.clearTimeout(pollTimerRef.current);
            pollTimerRef.current = null;
        }
    }, []);

    const detachLocalVideo = useCallback(() => {
        const track = attachedTrackRef.current;
        const videoElement = videoElementRef.current;
        attachedTrackRef.current = null;
        isVideoPlayableRef.current = false;

        if (!track || !videoElement) {
            return;
        }

        try {
            track.detach(videoElement);
        } catch {
            // Best-effort local cleanup only.
        }
    }, []);

    const cleanupRoom = useCallback(() => {
        clearPollTimer();
        detachLocalVideo();
        roomRef.current?.disconnect();
        roomRef.current = null;
        setConnectionQuality(null);
    }, [clearPollTimer, detachLocalVideo]);

    const markVideoPlayable = useCallback(() => {
        isVideoPlayableRef.current = true;
        clearPollTimer();
        setState((current) =>
            current === 'waiting_for_student' ||
            current === 'connecting' ||
            current === 'reconnecting'
                ? 'live'
                : current,
        );
        setReason(null);
    }, [clearPollTimer]);

    const markRemoteVideoLost = useCallback(() => {
        if (stopRequestedRef.current) {
            return;
        }

        detachLocalVideo();
        setState((current) =>
            current === 'live' || current === 'connecting' || current === 'reconnecting'
                ? 'reconnecting'
                : current,
        );
        setReason('LIVEKIT_RUNTIME_LOST');
    }, [detachLocalVideo]);

    const setVideoRef = useCallback(
        (element: HTMLVideoElement | null) => {
            const current = videoElementRef.current;
            if (current) {
                current.removeEventListener('playing', markVideoPlayable);
                current.removeEventListener('canplay', markVideoPlayable);
            }

            videoElementRef.current = element;

            if (element) {
                element.addEventListener('playing', markVideoPlayable);
                element.addEventListener('canplay', markVideoPlayable);
            }
        },
        [markVideoPlayable],
    );

    const connectViewer = useCallback(
        async (lease: LiveInspectionStaffStatus) => {
            setState('connecting');
            setReason(null);

            try {
                const credentials = await createLiveInspectionViewerConnection(apiClient, {
                    examId,
                    leaseId: lease.leaseId,
                });
                const room = new Room({ adaptiveStream: true });
                roomRef.current = room;

                room.on(RoomEvent.TrackSubscribed, (track: any, publication: any) => {
                    if (
                        !isExpectedRemoteCameraTrack(track, publication) ||
                        attachedTrackRef.current
                    ) {
                        setReason('UNEXPECTED_TRACK');
                        return;
                    }

                    const videoElement = videoElementRef.current;
                    if (!videoElement) {
                        setReason('UNEXPECTED_TRACK');
                        return;
                    }

                    attachedTrackRef.current = track;
                    track.attach(videoElement);
                    setState((current) =>
                        current === 'waiting_for_student' ? 'connecting' : current,
                    );

                    track.mediaStreamTrack?.addEventListener?.('ended', markRemoteVideoLost, {
                        once: true,
                    });
                });
                room.on(RoomEvent.TrackUnsubscribed, (track: any) => {
                    if (attachedTrackRef.current === track) {
                        markRemoteVideoLost();
                    }
                });
                room.on(RoomEvent.TrackMuted, (_publication: any, participant: any) => {
                    if (!participant?.isLocal) {
                        markRemoteVideoLost();
                    }
                });
                room.on(RoomEvent.TrackUnmuted, () => {
                    setReason(null);
                    setState((current) => (current === 'reconnecting' ? 'connecting' : current));
                });
                room.on(RoomEvent.Reconnecting, () => setState('reconnecting'));
                room.on(RoomEvent.Reconnected, () =>
                    setState((current) => (current === 'reconnecting' ? 'connecting' : current)),
                );
                room.on(RoomEvent.Disconnected, () => {
                    markRemoteVideoLost();
                });
                room.on(RoomEvent.ConnectionQualityChanged, (quality: unknown) => {
                    setConnectionQuality(String(quality));
                });

                await room.connect(credentials.liveKitUrl, credentials.token, {
                    autoSubscribe: true,
                });
                return true;
            } catch (error) {
                cleanupRoom();
                setState('failed');
                setReason(mapErrorReason(error) ?? 'CONNECT_FAILED');
                return false;
            }
        },
        [apiClient, cleanupRoom, examId, markRemoteVideoLost],
    );

    const pollUntilPublisherReady = useCallback(
        async (leaseId: string) => {
            clearPollTimer();

            if (stopRequestedRef.current) {
                return;
            }

            if (
                pollStartTimeRef.current &&
                Date.now() - pollStartTimeRef.current > PUBLISHER_READY_TIMEOUT_MS
            ) {
                cleanupRoom();
                setState('failed');
                setReason('TIMEOUT');
                try {
                    void stopLiveInspection(apiClient, { examId, leaseId });
                } catch {
                    // Best-effort cleanup
                }
                return;
            }

            try {
                const status = await getLiveInspectionStatus(apiClient, { examId, leaseId });

                if (leaseRef.current?.leaseId !== leaseId) {
                    return;
                }

                leaseRef.current = status;

                if (isVideoPlayableRef.current) {
                    return;
                }

                if (TERMINAL_STATES.has(status.state)) {
                    cleanupRoom();

                    if (status.state === 'FAILED') {
                        setState('failed');
                        if (status.lastErrorCode === 'NO_LIVE_CAMERA_TRACK') {
                            setReason('NO_LIVE_CAMERA_TRACK');
                        } else if (status.lastErrorCode === 'LIVEKIT_CONNECT_FAILED') {
                            setReason('LIVEKIT_CONNECT_FAILED');
                        } else if (status.lastErrorCode === 'LIVEKIT_PUBLISH_FAILED') {
                            setReason('LIVEKIT_PUBLISH_FAILED');
                        } else if (status.lastErrorCode === 'LIVEKIT_RUNTIME_LOST') {
                            setReason('LIVEKIT_RUNTIME_LOST');
                        } else {
                            setReason('STUDENT_UNAVAILABLE');
                        }
                    } else {
                        setState('ended');
                        setReason('STOPPED');
                    }
                    return;
                }

                setState((current) => {
                    if (current === 'live' || current === 'reconnecting') {
                        return current;
                    }

                    return status.state === 'PUBLISHER_READY' || status.state === 'LIVE'
                        ? 'connecting'
                        : 'waiting_for_student';
                });
                pollTimerRef.current = window.setTimeout(
                    () => void pollUntilPublisherReady(leaseId),
                    VIEWER_STATUS_POLL_MS,
                );
            } catch (error) {
                setState('failed');
                setReason(mapErrorReason(error));
            }
        },
        [apiClient, cleanupRoom, clearPollTimer, connectViewer, examId],
    );

    const start = useCallback(
        async (options?: { restart?: boolean }) => {
            if (!enabled || !attemptId) {
                setReason('NOT_ELIGIBLE');
                return;
            }

            stopRequestedRef.current = false;
            cleanupRoom();
            setState('requesting');
            setReason(null);

            try {
                const lease = await startLiveInspection(apiClient, {
                    examId,
                    attemptId,
                    restart: options?.restart ?? false,
                });
                leaseRef.current = lease;
                pollStartTimeRef.current = Date.now();
                const viewerConnected = await connectViewer(lease);
                if (!viewerConnected || leaseRef.current?.leaseId !== lease.leaseId) {
                    return;
                }
                setState((current) => (current === 'live' ? current : 'waiting_for_student'));
                await pollUntilPublisherReady(lease.leaseId);
            } catch (error) {
                setState('failed');
                setReason(mapErrorReason(error));
            }
        },
        [
            apiClient,
            attemptId,
            cleanupRoom,
            connectViewer,
            enabled,
            examId,
            pollUntilPublisherReady,
        ],
    );

    const stop = useCallback(async () => {
        stopRequestedRef.current = true;
        clearPollTimer();
        setState((current) => (current === 'idle' ? current : 'stopping'));

        const lease = leaseRef.current;
        cleanupRoom();

        if (lease) {
            try {
                await stopLiveInspection(apiClient, { examId, leaseId: lease.leaseId });
            } catch {
                // Server expiry/reconciler remains authoritative; local cleanup still completes.
            }
        }

        leaseRef.current = null;
        setState('ended');
        setReason('STOPPED');
    }, [apiClient, cleanupRoom, clearPollTimer, examId]);

    const retry = useCallback(() => {
        void start({ restart: true });
    }, [start]);

    useEffect(() => {
        if (!enabled) {
            stopRequestedRef.current = true;
            cleanupRoom();
            setState('idle');
            setReason('NOT_ELIGIBLE');
        }
    }, [cleanupRoom, enabled]);

    useEffect(() => {
        return () => {
            stopRequestedRef.current = true;
            const lease = leaseRef.current;
            cleanupRoom();
            if (lease) {
                void stopLiveInspection(apiClient, { examId, leaseId: lease.leaseId });
            }
        };
    }, [apiClient, cleanupRoom, examId]);

    useEffect(() => {
        const isWaiting = ['requesting', 'waiting_for_student', 'connecting'].includes(state);
        if (!isWaiting || !pollStartTimeRef.current) {
            setElapsedSeconds(0);
            return;
        }

        const updateElapsed = () => {
            if (pollStartTimeRef.current) {
                setElapsedSeconds(Math.floor((Date.now() - pollStartTimeRef.current) / 1000));
            }
        };
        updateElapsed();

        const timer = window.setInterval(updateElapsed, 1000);
        return () => window.clearInterval(timer);
    }, [state]);

    const waitingProgress = ['requesting', 'waiting_for_student', 'connecting'].includes(state)
        ? `Waiting for student device (${elapsedSeconds}s)...`
        : null;

    return {
        state,
        reason,
        connectionQuality,
        isLive: state === 'live',
        disabledExplanation: enabled
            ? null
            : 'Live camera viewing is unavailable for this attempt.',
        studentId,
        waitingProgress,
        start,
        stop,
        retry,
        setVideoRef,
    };
}
