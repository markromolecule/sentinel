import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiProvider, useLiveInspectionViewer } from '..';

const {
    mockStart,
    mockStatus,
    mockCredentials,
    mockStop,
    mockConnect,
    mockDisconnect,
    mockOn,
    mockAttach,
    mockDetach,
} = vi.hoisted(() => ({
    mockStart: vi.fn(),
    mockStatus: vi.fn(),
    mockCredentials: vi.fn(),
    mockStop: vi.fn(),
    mockConnect: vi.fn(),
    mockDisconnect: vi.fn(),
    mockOn: vi.fn(),
    mockAttach: vi.fn(),
    mockDetach: vi.fn(),
}));

vi.mock('@sentinel/services', () => ({
    startLiveInspection: mockStart,
    getLiveInspectionStatus: mockStatus,
    createLiveInspectionViewerConnection: mockCredentials,
    stopLiveInspection: mockStop,
}));

vi.mock('livekit-client', () => ({
    Track: {
        Source: {
            Camera: 'camera',
            ScreenShare: 'screen_share',
            ScreenShareAudio: 'screen_share_audio',
        },
    },
    RoomEvent: {
        TrackSubscribed: 'trackSubscribed',
        TrackUnsubscribed: 'trackUnsubscribed',
        TrackMuted: 'trackMuted',
        TrackUnmuted: 'trackUnmuted',
        Reconnecting: 'reconnecting',
        Reconnected: 'reconnected',
        Disconnected: 'disconnected',
        ConnectionQualityChanged: 'connectionQualityChanged',
    },
    Room: vi.fn().mockImplementation(function Room(options) {
        return {
            options,
            on: mockOn,
            connect: mockConnect,
            disconnect: mockDisconnect,
        };
    }),
}));

const lease = {
    leaseId: '11111111-1111-4111-8111-111111111111',
    attemptId: '22222222-2222-4222-8222-222222222222',
    studentUserId: '33333333-3333-4333-8333-333333333333',
    viewerUserId: '44444444-4444-4444-8444-444444444444',
    state: 'REQUESTED',
    revision: 1,
    requestedAt: '2026-07-20T00:00:00.000Z',
    expiresAt: '2026-07-20T00:05:00.000Z',
    startedAt: null,
    endedAt: null,
    endReason: null,
    lastErrorCode: null,
};

function wrapper({ children }: { children: ReactNode }) {
    return <ApiProvider apiClient={vi.fn() as never}>{children}</ApiProvider>;
}

describe('useLiveInspectionViewer', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockConnect.mockResolvedValue(undefined);
        mockStop.mockResolvedValue(undefined);
        mockStart.mockResolvedValue(lease);
        mockStatus.mockResolvedValue({ ...lease, state: 'PUBLISHER_READY', revision: 2 });
        mockCredentials.mockResolvedValue({
            leaseId: lease.leaseId,
            revision: 2,
            roomName: 'room-1',
            token: 'viewer-token',
            liveKitUrl: 'wss://sentinel-test.livekit.cloud',
            participantIdentity: 'viewer-1',
            expiresAt: '2026-07-20T00:05:00.000Z',
        });
        mockOn.mockReturnThis();
    });

    afterEach(() => {
        cleanup();
    });

    it('connects the viewer immediately and waits for media without exposing tokens', async () => {
        const { result } = renderHook(
            () =>
                useLiveInspectionViewer({
                    examId: 'exam-1',
                    studentId: 'student-1',
                    attemptId: lease.attemptId,
                    enabled: true,
                }),
            { wrapper },
        );

        await act(async () => {
            await result.current.start();
        });

        await waitFor(() => expect(mockCredentials).toHaveBeenCalled());
        expect(mockStart).toHaveBeenCalledWith(expect.anything(), {
            examId: 'exam-1',
            attemptId: lease.attemptId,
            restart: false,
        });
        expect(mockCredentials.mock.invocationCallOrder[0]).toBeLessThan(
            mockStatus.mock.invocationCallOrder[0],
        );
        expect(mockConnect).toHaveBeenCalledWith(
            'wss://sentinel-test.livekit.cloud',
            'viewer-token',
            {
                autoSubscribe: true,
            },
        );
        expect(JSON.stringify(result.current).toLowerCase()).not.toContain('viewer-token');
    });

    it('uses bundled credentials from startLiveInspection and bypasses createLiveInspectionViewerConnection', async () => {
        const bundledConnection = {
            leaseId: lease.leaseId,
            revision: 1,
            roomName: 'room-bundled',
            token: 'bundled-viewer-token',
            liveKitUrl: 'wss://sentinel-bundled.livekit.cloud',
            participantIdentity: 'sentinel:viewer:viewer-1',
            expiresAt: '2026-07-20T00:05:00.000Z',
        };
        mockStart.mockResolvedValueOnce({
            ...lease,
            connection: bundledConnection,
        });

        const { result } = renderHook(
            () =>
                useLiveInspectionViewer({
                    examId: 'exam-1',
                    studentId: 'student-1',
                    attemptId: lease.attemptId,
                    enabled: true,
                }),
            { wrapper },
        );

        await act(async () => {
            await result.current.start();
        });

        expect(mockCredentials).not.toHaveBeenCalled();
        expect(mockConnect).toHaveBeenCalledWith(
            'wss://sentinel-bundled.livekit.cloud',
            'bundled-viewer-token',
            {
                autoSubscribe: true,
            },
        );
    });

    it('does not enter live until the expected camera track is attached and playable', async () => {
        const video = document.createElement('video');
        const { result } = renderHook(
            () =>
                useLiveInspectionViewer({
                    examId: 'exam-1',
                    studentId: 'student-1',
                    attemptId: lease.attemptId,
                    enabled: true,
                }),
            { wrapper },
        );

        act(() => result.current.setVideoRef(video));
        await act(async () => {
            await result.current.start();
        });

        expect(result.current.state).toBe('connecting');
        const subscribedHandler = mockOn.mock.calls.find(
            ([event]) => event === 'trackSubscribed',
        )?.[1];
        act(() => {
            subscribedHandler?.(
                { kind: 'video', attach: mockAttach, detach: mockDetach },
                { source: 'camera', kind: 'video' },
                { identity: 'publisher-1' },
            );
        });

        expect(mockAttach).toHaveBeenCalledWith(video);
        expect(result.current.state).toBe('connecting');

        act(() => {
            video.dispatchEvent(new Event('playing'));
        });

        expect(result.current.state).toBe('live');
    });

    it('marks the live view reconnecting when the remote camera track is lost', async () => {
        const video = document.createElement('video');
        const track = { kind: 'video', attach: mockAttach, detach: mockDetach };
        const { result } = renderHook(
            () =>
                useLiveInspectionViewer({
                    examId: 'exam-1',
                    studentId: 'student-1',
                    attemptId: lease.attemptId,
                    enabled: true,
                }),
            { wrapper },
        );

        act(() => result.current.setVideoRef(video));
        await act(async () => {
            await result.current.start();
        });

        const subscribedHandler = mockOn.mock.calls.find(
            ([event]) => event === 'trackSubscribed',
        )?.[1];
        const unsubscribedHandler = mockOn.mock.calls.find(
            ([event]) => event === 'trackUnsubscribed',
        )?.[1];

        act(() => {
            subscribedHandler?.(track, { source: 'camera', kind: 'video' });
            video.dispatchEvent(new Event('playing'));
        });

        expect(result.current.state).toBe('live');

        act(() => {
            unsubscribedHandler?.(track);
        });

        expect(mockDetach).toHaveBeenCalledWith(video);
        expect(result.current.state).toBe('reconnecting');
        expect(result.current.reason).toBe('LIVEKIT_RUNTIME_LOST');
    });

    it('does not auto-stop the live inspection when connection quality updates', async () => {
        const video = document.createElement('video');
        const track = { kind: 'video', attach: mockAttach, detach: mockDetach };
        const { result } = renderHook(
            () =>
                useLiveInspectionViewer({
                    examId: 'exam-1',
                    studentId: 'student-1',
                    attemptId: lease.attemptId,
                    enabled: true,
                }),
            { wrapper },
        );

        act(() => result.current.setVideoRef(video));
        await act(async () => {
            await result.current.start();
        });

        const subscribedHandler = mockOn.mock.calls.find(
            ([event]) => event === 'trackSubscribed',
        )?.[1];
        const qualityHandler = mockOn.mock.calls.find(
            ([event]) => event === 'connectionQualityChanged',
        )?.[1];

        act(() => {
            subscribedHandler?.(track, { source: 'camera', kind: 'video' });
            video.dispatchEvent(new Event('playing'));
        });

        expect(result.current.state).toBe('live');

        act(() => {
            qualityHandler?.('excellent');
        });

        await waitFor(() => {
            expect(result.current.connectionQuality).toBe('excellent');
        });

        expect(result.current.state).toBe('live');
        expect(mockStop).not.toHaveBeenCalled();
    });

    it('rejects audio/screen-share tracks and never shows false LIVE', async () => {
        const video = document.createElement('video');
        const { result } = renderHook(
            () =>
                useLiveInspectionViewer({
                    examId: 'exam-1',
                    studentId: 'student-1',
                    attemptId: lease.attemptId,
                    enabled: true,
                }),
            { wrapper },
        );

        act(() => result.current.setVideoRef(video));
        await act(async () => {
            await result.current.start();
        });

        const subscribedHandler = mockOn.mock.calls.find(
            ([event]) => event === 'trackSubscribed',
        )?.[1];
        act(() => {
            subscribedHandler?.(
                { kind: 'audio', attach: mockAttach, detach: mockDetach },
                { source: 'microphone', kind: 'audio' },
                { identity: 'publisher-1' },
            );
        });

        expect(result.current.state).not.toBe('live');
        expect(result.current.reason).toBe('UNEXPECTED_TRACK');
        expect(mockAttach).not.toHaveBeenCalled();
    });

    it('stops idempotently and disconnects on unmount', async () => {
        const { result, unmount } = renderHook(
            () =>
                useLiveInspectionViewer({
                    examId: 'exam-1',
                    studentId: 'student-1',
                    attemptId: lease.attemptId,
                    enabled: true,
                }),
            { wrapper },
        );

        await act(async () => {
            await result.current.start();
            await result.current.stop();
            await result.current.stop();
        });

        expect(mockStop).toHaveBeenCalledWith(expect.anything(), {
            examId: 'exam-1',
            leaseId: lease.leaseId,
        });
        expect(mockDisconnect).toHaveBeenCalled();

        unmount();
        expect(mockDisconnect).toHaveBeenCalled();
    });

    it('maps conflicts to a safe bounded reason', async () => {
        mockStart.mockRejectedValueOnce(new Error('409 already active'));
        const { result } = renderHook(
            () =>
                useLiveInspectionViewer({
                    examId: 'exam-1',
                    studentId: 'student-1',
                    attemptId: lease.attemptId,
                    enabled: true,
                }),
            { wrapper },
        );

        await act(async () => {
            await result.current.start();
        });

        expect(result.current.state).toBe('failed');
        expect(result.current.reason).toBe('CONFLICT');
        expect(JSON.stringify(result.current).toLowerCase()).not.toContain('token');
    });

    it('keeps an immediate viewer connection failure terminal and does not start polling', async () => {
        mockCredentials.mockRejectedValueOnce(new Error('network unavailable'));
        const { result } = renderHook(
            () =>
                useLiveInspectionViewer({
                    examId: 'exam-1',
                    studentId: 'student-1',
                    attemptId: lease.attemptId,
                    enabled: true,
                }),
            { wrapper },
        );

        await act(async () => {
            await result.current.start();
        });

        expect(result.current.state).toBe('failed');
        expect(result.current.reason).toBe('OFFLINE');
        expect(mockStatus).not.toHaveBeenCalled();
    });

    it('times out and transitions to failed state when student camera response is delayed', async () => {
        vi.useFakeTimers();
        mockStatus.mockResolvedValue({ ...lease, state: 'REQUESTED' });

        const { result } = renderHook(
            () =>
                useLiveInspectionViewer({
                    examId: 'exam-1',
                    studentId: 'student-1',
                    attemptId: lease.attemptId,
                    enabled: true,
                }),
            { wrapper },
        );

        await act(async () => {
            await result.current.start();
        });

        expect(result.current.state).toBe('waiting_for_student');

        // Advance timers by 32 seconds to exceed the 30-second timeout limit in 2-second steps
        for (let i = 0; i < 16; i++) {
            await act(async () => {
                await vi.advanceTimersByTimeAsync(2000);
            });
        }

        expect(result.current.state).toBe('failed');
        expect(result.current.reason).toBe('TIMEOUT');
        expect(mockStop).toHaveBeenCalledWith(expect.anything(), {
            examId: 'exam-1',
            leaseId: lease.leaseId,
        });

        vi.useRealTimers();
    });

    it('succeeds after about 15 seconds but before the 30 second deadline', async () => {
        vi.useFakeTimers();
        let pollCount = 0;
        mockStatus.mockImplementation(async () => {
            pollCount++;
            if (pollCount <= 15) {
                return { ...lease, state: 'REQUESTED' };
            }
            return { ...lease, state: 'PUBLISHER_READY', revision: 2 };
        });

        const { result } = renderHook(
            () =>
                useLiveInspectionViewer({
                    examId: 'exam-1',
                    studentId: 'student-1',
                    attemptId: lease.attemptId,
                    enabled: true,
                }),
            { wrapper },
        );

        await act(async () => {
            await result.current.start();
        });

        expect(result.current.state).toBe('waiting_for_student');

        // Advance 14 seconds in 1-second steps; the student is still not ready.
        for (let i = 0; i < 14; i++) {
            await act(async () => {
                await vi.advanceTimersByTimeAsync(1000);
            });
        }

        expect(result.current.state).toBe('waiting_for_student');

        // Advance once more; the next poll receives PUBLISHER_READY while the
        // already-connected viewer waits for the first playable frame.
        await act(async () => {
            await vi.advanceTimersByTimeAsync(1000);
        });

        expect(result.current.state).toBe('connecting');
        expect(mockCredentials).toHaveBeenCalledTimes(1);

        vi.useRealTimers();
    });

    it('retries with restart: true, resetting the deadline and polling the new lease', async () => {
        const { result } = renderHook(
            () =>
                useLiveInspectionViewer({
                    examId: 'exam-1',
                    studentId: 'student-1',
                    attemptId: lease.attemptId,
                    enabled: true,
                }),
            { wrapper },
        );

        await act(async () => {
            await result.current.start();
        });

        expect(mockStart).toHaveBeenLastCalledWith(expect.anything(), {
            examId: 'exam-1',
            attemptId: lease.attemptId,
            restart: false,
        });

        // Mock a new lease for restart
        const restartLease = { ...lease, leaseId: '55555555-5555-5555-5555-555555555555' };
        mockStart.mockResolvedValueOnce(restartLease);

        await act(async () => {
            await result.current.retry();
        });

        expect(mockStart).toHaveBeenLastCalledWith(expect.anything(), {
            examId: 'exam-1',
            attemptId: lease.attemptId,
            restart: true,
        });
    });

    it('ignores stale poll callbacks from the old lease', async () => {
        let resolveFirstPoll: Function = () => {};
        const firstPollPromise = new Promise((resolve) => {
            resolveFirstPoll = resolve;
        });

        // First poll returns a deferred promise; subsequent polls resolve immediately
        mockStatus.mockImplementation((apiClient, args) => {
            if (args.leaseId === lease.leaseId) {
                return firstPollPromise;
            }
            return Promise.resolve({
                leaseId: args.leaseId,
                attemptId: lease.attemptId,
                state: 'REQUESTED',
                revision: 1,
            });
        });

        const { result } = renderHook(
            () =>
                useLiveInspectionViewer({
                    examId: 'exam-1',
                    studentId: 'student-1',
                    attemptId: lease.attemptId,
                    enabled: true,
                }),
            { wrapper },
        );

        // Start the first lease (first poll remains pending)
        act(() => {
            void result.current.start();
        });

        // Start a restart (updates leaseRef.current to restartLease)
        const restartLease = { ...lease, leaseId: '55555555-5555-5555-5555-555555555555' };
        mockStart.mockResolvedValueOnce(restartLease);

        await act(async () => {
            await result.current.retry();
        });

        // Now resolve the first poll (from the old lease) as FAILED
        await act(async () => {
            resolveFirstPoll({
                leaseId: lease.leaseId,
                attemptId: lease.attemptId,
                state: 'FAILED',
                lastErrorCode: 'NO_LIVE_CAMERA_TRACK',
            });
            await Promise.resolve();
        });

        // State should still be waiting_for_student (not failed)
        expect(result.current.state).toBe('waiting_for_student');
        expect(result.current.reason).toBeNull();
    });

    it('maps terminal failure codes to corresponding bounded reasons', async () => {
        const { result } = renderHook(
            () =>
                useLiveInspectionViewer({
                    examId: 'exam-1',
                    studentId: 'student-1',
                    attemptId: lease.attemptId,
                    enabled: true,
                }),
            { wrapper },
        );

        // Test NO_LIVE_CAMERA_TRACK
        mockStatus.mockResolvedValueOnce({
            ...lease,
            state: 'FAILED',
            lastErrorCode: 'NO_LIVE_CAMERA_TRACK',
        });
        await act(async () => {
            await result.current.start();
        });
        expect(result.current.state).toBe('failed');
        expect(result.current.reason).toBe('NO_LIVE_CAMERA_TRACK');

        // Test LIVEKIT_CONNECT_FAILED
        mockStatus.mockResolvedValueOnce({
            ...lease,
            state: 'FAILED',
            lastErrorCode: 'LIVEKIT_CONNECT_FAILED',
        });
        await act(async () => {
            await result.current.start();
        });
        expect(result.current.state).toBe('failed');
        expect(result.current.reason).toBe('LIVEKIT_CONNECT_FAILED');

        // Test LIVEKIT_PUBLISH_FAILED
        mockStatus.mockResolvedValueOnce({
            ...lease,
            state: 'FAILED',
            lastErrorCode: 'LIVEKIT_PUBLISH_FAILED',
        });
        await act(async () => {
            await result.current.start();
        });
        expect(result.current.state).toBe('failed');
        expect(result.current.reason).toBe('LIVEKIT_PUBLISH_FAILED');

        // Test LIVEKIT_RUNTIME_LOST
        mockStatus.mockResolvedValueOnce({
            ...lease,
            state: 'FAILED',
            lastErrorCode: 'LIVEKIT_RUNTIME_LOST',
        });
        await act(async () => {
            await result.current.start();
        });
        expect(result.current.state).toBe('failed');
        expect(result.current.reason).toBe('LIVEKIT_RUNTIME_LOST');
    });

    it('dispatches LIVE_INSPECTION_CHANGED broadcast on start() and stop()', async () => {
        const sendMock = vi.fn().mockResolvedValue('ok');
        const channelMock = { send: sendMock };
        const supabaseMock = {
            channel: vi.fn(() => channelMock),
            removeChannel: vi.fn(),
        } as never;

        const { result } = renderHook(
            () =>
                useLiveInspectionViewer({
                    examId: 'exam-1',
                    studentId: 'student-1',
                    attemptId: lease.attemptId,
                    enabled: true,
                    supabase: supabaseMock,
                }),
            { wrapper },
        );

        await act(async () => {
            await result.current.start();
        });

        expect((supabaseMock as any).channel).toHaveBeenCalledWith(
            `exam-attempt:${lease.attemptId}:live-inspection`,
            { config: { private: true } },
        );
        expect(sendMock).toHaveBeenCalledWith({
            type: 'broadcast',
            event: 'LIVE_INSPECTION_CHANGED',
            payload: expect.objectContaining({
                attemptId: lease.attemptId,
            }),
        });

        sendMock.mockClear();

        await act(async () => {
            await result.current.stop();
        });

        expect(sendMock).toHaveBeenCalledWith({
            type: 'broadcast',
            event: 'LIVE_INSPECTION_CHANGED',
            payload: expect.objectContaining({
                attemptId: lease.attemptId,
            }),
        });
    });

    it('dispatches LIVE_INSPECTION_CHANGED broadcast on unmount cleanup when attemptId is active', async () => {
        const sendMock = vi.fn().mockResolvedValue('ok');
        const channelMock = { send: sendMock };
        const supabaseMock = {
            channel: vi.fn(() => channelMock),
            removeChannel: vi.fn(),
        } as never;

        const { result, unmount } = renderHook(
            () =>
                useLiveInspectionViewer({
                    examId: 'exam-1',
                    studentId: 'student-1',
                    attemptId: lease.attemptId,
                    enabled: true,
                    supabase: supabaseMock,
                }),
            { wrapper },
        );

        await act(async () => {
            await result.current.start();
        });

        sendMock.mockClear();
        unmount();

        expect(sendMock).toHaveBeenCalledWith({
            type: 'broadcast',
            event: 'LIVE_INSPECTION_CHANGED',
            payload: expect.objectContaining({
                attemptId: lease.attemptId,
            }),
        });
    });
});
