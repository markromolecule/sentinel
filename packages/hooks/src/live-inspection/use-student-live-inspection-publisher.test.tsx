import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useStudentLiveInspectionPublisher } from './use-student-live-inspection-publisher';
import { ApiError } from '@sentinel/services';

let lastRoomInstance: any = null;

const {
    mockDirective,
    mockPublisherConnection,
    mockPublisherReady,
    mockPublisherFailure,
    mockConnect,
    mockPublishTrack,
    mockUnpublishTrack,
    mockDisconnect,
} = vi.hoisted(() => ({
    mockDirective: vi.fn(),
    mockPublisherConnection: vi.fn(),
    mockPublisherReady: vi.fn(),
    mockPublisherFailure: vi.fn(),
    mockConnect: vi.fn(),
    mockPublishTrack: vi.fn(),
    mockUnpublishTrack: vi.fn(),
    mockDisconnect: vi.fn(),
}));

vi.mock('@sentinel/services', () => {
    class ApiError extends Error {
        status: number;
        constructor(init: { message: string; status: number }) {
            super(init.message);
            this.status = init.status;
            this.name = 'ApiError';
        }
    }
    return {
        getStudentLiveInspectionDirective: mockDirective,
        createLiveInspectionPublisherConnection: mockPublisherConnection,
        acknowledgeLiveInspectionPublisherReady: mockPublisherReady,
        acknowledgeLiveInspectionPublisherFailure: mockPublisherFailure,
        ApiError,
    };
});

vi.mock('livekit-client', () => ({
    Track: {
        Source: {
            Camera: 'camera',
        },
    },
    Room: vi.fn().mockImplementation(function Room(options) {
        const listeners: Record<string, Function[]> = {};
        const instance = {
            options,
            connect: mockConnect,
            disconnect: mockDisconnect,
            state: 'connected',
            localParticipant: {
                publishTrack: mockPublishTrack,
                unpublishTrack: mockUnpublishTrack,
            },
            on: vi.fn().mockImplementation((event, callback) => {
                listeners[event] = listeners[event] || [];
                listeners[event].push(callback);
            }),
            emit: vi.fn().mockImplementation((event, ...args) => {
                listeners[event]?.forEach((cb) => cb(...args));
            }),
        };
        lastRoomInstance = instance;
        return instance;
    }),
}));

const attemptId = '22222222-2222-4222-8222-222222222222';
const leaseId = '11111111-1111-4111-8111-111111111111';

function createDirective(revision: number, state = 'REQUESTED', directiveLeaseId = leaseId) {
    return {
        leaseId: directiveLeaseId,
        revision,
        state,
        attemptId,
        topic: `exam-attempt:${attemptId}:live-inspection`,
    };
}

function createSupabase() {
    let broadcastHandler: Function | null = null;
    let subscribeHandler: Function | null = null;
    const channel = {
        on: vi.fn().mockImplementation((type: string, filter: any, callback: Function) => {
            if (type === 'broadcast' && filter?.event === 'LIVE_INSPECTION_CHANGED') {
                broadcastHandler = callback;
            }
            return channel;
        }),
        subscribe: vi.fn().mockImplementation((callback?: Function) => {
            subscribeHandler = callback ?? null;
            return channel;
        }),
    };
    return {
        channel,
        getBroadcastHandler: () => broadcastHandler,
        getSubscribeHandler: () => subscribeHandler,
        supabase: {
            auth: {} as never,
            channel: vi.fn(() => channel),
            removeChannel: vi.fn(),
        } as never,
    };
}

function createLiveTrack() {
    let cloneReadyState: MediaStreamTrack['readyState'] = 'live';
    const clone = {
        get readyState() {
            return cloneReadyState;
        },
        stop: vi.fn(() => {
            cloneReadyState = 'ended';
        }),
    } as unknown as MediaStreamTrack & { stop: ReturnType<typeof vi.fn> };
    const original = {
        readyState: 'live',
        clone: vi.fn(() => clone),
        stop: vi.fn(),
    } as unknown as MediaStreamTrack & {
        clone: ReturnType<typeof vi.fn>;
        stop: ReturnType<typeof vi.fn>;
    };

    return { original, clone };
}

describe('useStudentLiveInspectionPublisher', () => {
    beforeEach(() => {
        lastRoomInstance = null;
        mockDirective.mockReset();
        mockPublisherConnection.mockReset();
        mockPublisherReady.mockReset();
        mockPublisherFailure.mockReset();
        mockConnect.mockReset();
        mockPublishTrack.mockReset();
        mockUnpublishTrack.mockReset();
        mockDisconnect.mockReset();
        mockPublisherReady.mockResolvedValue({ leaseId, revision: 2, state: 'PUBLISHER_READY' });
        mockPublisherFailure.mockResolvedValue({ leaseId, revision: 1, state: 'FAILED' });
        mockConnect.mockResolvedValue(undefined);
        mockPublishTrack.mockResolvedValue(undefined);
        mockPublisherConnection.mockResolvedValue({
            leaseId,
            revision: 2,
            roomName: 'room-1',
            token: 'token',
            liveKitUrl: 'wss://sentinel-test.livekit.cloud',
            participantIdentity: 'publisher-1',
            expiresAt: '2026-07-20T00:00:00.000Z',
        });
    });

    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    it('subscribes to the private canonical attempt topic and reconciles through the API', async () => {
        const { supabase, channel } = createSupabase();
        const { original } = createLiveTrack();
        mockDirective.mockResolvedValue(createDirective(1));

        renderHook(() =>
            useStudentLiveInspectionPublisher({
                supabase,
                apiClient: vi.fn() as never,
                sessionId: 'session-1',
                attemptId,
                enabled: true,
                getLiveVideoTrack: () => original,
            }),
        );

        await waitFor(() =>
            expect(mockDirective).toHaveBeenCalledWith(expect.anything(), {
                sessionId: 'session-1',
            }),
        );

        expect((supabase as any).channel).toHaveBeenCalledWith(
            `exam-attempt:${attemptId}:live-inspection`,
            { config: { private: true } },
        );
        expect(channel.on).toHaveBeenCalledWith(
            'broadcast',
            { event: 'LIVE_INSPECTION_CHANGED' },
            expect.any(Function),
        );
    });

    it('publishes a cloned camera track without microphone or browser capture calls', async () => {
        const { supabase } = createSupabase();
        const { original, clone } = createLiveTrack();
        mockDirective.mockResolvedValue(createDirective(1));

        const { result } = renderHook(() =>
            useStudentLiveInspectionPublisher({
                supabase,
                apiClient: vi.fn() as never,
                sessionId: 'session-1',
                attemptId,
                enabled: true,
                getLiveVideoTrack: () => original,
            }),
        );

        await waitFor(() => expect(result.current.isLive).toBe(true));

        expect(original.clone).toHaveBeenCalledTimes(1);
        expect(original.stop).not.toHaveBeenCalled();
        expect(mockConnect).toHaveBeenCalledWith('wss://sentinel-test.livekit.cloud', 'token', {
            autoSubscribe: false,
        });
        expect(mockPublishTrack).toHaveBeenCalledWith(
            clone,
            expect.objectContaining({
                source: 'camera',
                simulcast: false,
                videoCodec: 'vp8',
                stopLocalTrackOnUnpublish: false,
            }),
        );
    });

    it('uses bundled connection from directive and skips createLiveInspectionPublisherConnection', async () => {
        const { supabase } = createSupabase();
        const { original } = createLiveTrack();
        const bundledConnection = {
            leaseId,
            revision: 1,
            roomName: 'room-bundled',
            token: 'bundled-publisher-token',
            liveKitUrl: 'wss://sentinel-bundled.livekit.cloud',
            participantIdentity: 'sentinel:publisher:student-1',
            expiresAt: '2026-07-20T00:05:00.000Z',
        };
        mockDirective.mockResolvedValue({
            ...createDirective(1),
            connection: bundledConnection,
        });

        const { result } = renderHook(() =>
            useStudentLiveInspectionPublisher({
                supabase,
                apiClient: vi.fn() as never,
                sessionId: 'session-1',
                attemptId,
                enabled: true,
                getLiveVideoTrack: () => original,
            }),
        );

        await waitFor(() => expect(result.current.isLive).toBe(true));

        expect(mockPublisherConnection).not.toHaveBeenCalled();
        expect(mockConnect).toHaveBeenCalledWith(
            'wss://sentinel-bundled.livekit.cloud',
            'bundled-publisher-token',
            { autoSubscribe: false },
        );
        expect(mockPublisherReady).toHaveBeenCalledWith(expect.anything(), {
            sessionId: 'session-1',
            leaseId,
            revision: 1,
        });
    });

    it('resumes publication from a server-side PUBLISHER_CONNECTING directive', async () => {
        const { supabase } = createSupabase();
        const { original } = createLiveTrack();
        mockDirective.mockResolvedValue(createDirective(2, 'PUBLISHER_CONNECTING'));
        mockPublisherConnection.mockResolvedValueOnce({
            leaseId,
            revision: 2,
            roomName: 'room-1',
            token: 'replacement-token',
            liveKitUrl: 'wss://sentinel-test.livekit.cloud',
            participantIdentity: 'publisher-1',
            expiresAt: '2026-07-20T00:00:00.000Z',
        });

        const { result } = renderHook(() =>
            useStudentLiveInspectionPublisher({
                supabase,
                apiClient: vi.fn() as never,
                sessionId: 'session-1',
                attemptId,
                enabled: true,
                getLiveVideoTrack: () => original,
            }),
        );

        await waitFor(() => expect(result.current.isLive).toBe(true));

        expect(mockPublisherConnection).toHaveBeenCalledWith(expect.anything(), {
            sessionId: 'session-1',
            leaseId,
            revision: 2,
        });
        expect(mockConnect).toHaveBeenCalledWith(
            'wss://sentinel-test.livekit.cloud',
            'replacement-token',
            { autoSubscribe: false },
        );
    });

    it('does not register periodic polling timers on mount and relies on realtime events', async () => {
        vi.useFakeTimers();
        const { supabase } = createSupabase();
        const { original } = createLiveTrack();
        const setTimeoutSpy = vi.spyOn(window, 'setTimeout');
        mockDirective
            .mockResolvedValueOnce(
                createDirective(1, 'ENDED', '33333333-3333-4333-8333-333333333333'),
            )
            .mockResolvedValue(createDirective(2));

        renderHook(() =>
            useStudentLiveInspectionPublisher({
                supabase,
                apiClient: vi.fn() as never,
                sessionId: 'session-1',
                attemptId,
                enabled: true,
                getLiveVideoTrack: () => original,
            }),
        );

        // Let the mount effects run
        await act(async () => {
            await Promise.resolve();
        });

        expect(setTimeoutSpy).not.toHaveBeenCalledWith(expect.any(Function), 500);
    });

    it('reconciles on visibilitychange and online reconnect events', async () => {
        const { supabase } = createSupabase();
        const { original } = createLiveTrack();
        mockDirective
            .mockResolvedValueOnce(
                createDirective(1, 'ENDED', '33333333-3333-4333-8333-333333333333'),
            )
            .mockResolvedValue(createDirective(2));

        renderHook(() =>
            useStudentLiveInspectionPublisher({
                supabase,
                apiClient: vi.fn() as never,
                sessionId: 'session-1',
                attemptId,
                enabled: true,
                getLiveVideoTrack: () => original,
            }),
        );

        await waitFor(() => expect(mockDirective).toHaveBeenCalledTimes(1));

        // Trigger visibilitychange event
        act(() => {
            document.dispatchEvent(new Event('visibilitychange'));
        });

        await waitFor(() => expect(mockDirective).toHaveBeenCalledTimes(2));

        // Trigger online event
        act(() => {
            window.dispatchEvent(new Event('online'));
        });

        await waitFor(() => expect(mockDirective).toHaveBeenCalledTimes(3));
    });

    it('cleans up only the clone when unmounted', async () => {
        const { supabase } = createSupabase();
        const { original, clone } = createLiveTrack();
        mockDirective.mockResolvedValue(createDirective(1));

        const { unmount, result } = renderHook(() =>
            useStudentLiveInspectionPublisher({
                supabase,
                apiClient: vi.fn() as never,
                sessionId: 'session-1',
                attemptId,
                enabled: true,
                getLiveVideoTrack: () => original,
            }),
        );

        await waitFor(() => expect(result.current.isLive).toBe(true));
        unmount();

        expect(mockUnpublishTrack).toHaveBeenCalledWith(clone, false);
        expect(mockDisconnect).toHaveBeenCalled();
        expect(clone.stop).toHaveBeenCalledTimes(1);
        expect(original.stop).not.toHaveBeenCalled();
        expect((supabase as any).removeChannel).toHaveBeenCalled();
    });

    it('retries track acquisition for up to 8 seconds and succeeds if track becomes ready', async () => {
        const { supabase } = createSupabase();
        const { original } = createLiveTrack();
        let trackCalled = 0;
        const getTrackMock = vi.fn().mockImplementation(() => {
            trackCalled++;
            return trackCalled >= 3 ? original : null;
        });

        mockDirective.mockResolvedValue(createDirective(1));

        const { result } = renderHook(() =>
            useStudentLiveInspectionPublisher({
                supabase,
                apiClient: vi.fn() as never,
                sessionId: 'session-1',
                attemptId,
                enabled: true,
                getLiveVideoTrack: getTrackMock,
            }),
        );

        await waitFor(() => expect(result.current.isLive).toBe(true));
        expect(getTrackMock.mock.calls.length).toBeGreaterThanOrEqual(3);
    });

    it('acknowledges NO_LIVE_CAMERA_TRACK when track is missing for more than 8 seconds', async () => {
        vi.useFakeTimers();
        const { supabase } = createSupabase();
        mockDirective.mockResolvedValue(createDirective(1));

        const { result } = renderHook(() =>
            useStudentLiveInspectionPublisher({
                supabase,
                apiClient: vi.fn() as never,
                sessionId: 'session-1',
                attemptId,
                enabled: true,
                getLiveVideoTrack: () => null,
            }),
        );

        // Advance 8 seconds of camera check in 100ms steps
        for (let i = 0; i < 82; i++) {
            await act(async () => {
                await vi.advanceTimersByTimeAsync(100);
            });
        }

        expect(result.current.status).toBe('failed');
        expect(mockPublisherFailure).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                errorCode: 'NO_LIVE_CAMERA_TRACK',
            }),
        );
    });

    it('reconciles immediately when LiveKit room is disconnected', async () => {
        const { supabase } = createSupabase();
        const { original } = createLiveTrack();
        mockDirective.mockResolvedValue(createDirective(1));

        const { result } = renderHook(() =>
            useStudentLiveInspectionPublisher({
                supabase,
                apiClient: vi.fn() as never,
                sessionId: 'session-1',
                attemptId,
                enabled: true,
                getLiveVideoTrack: () => original,
            }),
        );

        await waitFor(() => expect(result.current.isLive).toBe(true));
        expect(lastRoomInstance).not.toBeNull();

        // Simulate disconnection
        mockDirective.mockClear();
        mockDirective.mockResolvedValue(createDirective(2, 'REQUESTED', leaseId));

        act(() => {
            lastRoomInstance.emit('disconnected');
        });

        await waitFor(() => expect(mockDirective).toHaveBeenCalled());
    });

    it('aborts track acquisition and does not acknowledge failure if disabled or superseded while waiting', async () => {
        vi.useFakeTimers();
        const { supabase } = createSupabase();
        mockDirective.mockResolvedValue(createDirective(1));

        const { rerender, result } = renderHook(
            ({ enabled }) =>
                useStudentLiveInspectionPublisher({
                    supabase,
                    apiClient: vi.fn() as never,
                    sessionId: 'session-1',
                    attemptId,
                    enabled,
                    getLiveVideoTrack: () => null,
                }),
            { initialProps: { enabled: true } },
        );

        // Allow mount reconcile to run and enter waitForCameraTrack
        await act(async () => {
            await Promise.resolve();
        });

        // Now change enabled to false
        rerender({ enabled: false });

        // Fast-forward time
        await act(async () => {
            await vi.advanceTimersByTimeAsync(8000);
        });

        // Verify status goes back to idle or doesn't fail with NO_LIVE_CAMERA_TRACK
        expect(result.current.status).not.toBe('failed');
        expect(mockPublisherFailure).not.toHaveBeenCalled();
    });

    it('logs bounded diagnostics for 403 and does not log for 404', async () => {
        const { supabase } = createSupabase();
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        // Mock 403 error using ApiError
        const forbiddenError = new ApiError({
            message: 'Forbidden',
            status: 403,
            statusText: 'Forbidden',
        });
        mockDirective.mockRejectedValueOnce(forbiddenError);

        const { result, rerender } = renderHook(
            ({ sessionId }) =>
                useStudentLiveInspectionPublisher({
                    supabase,
                    apiClient: vi.fn() as never,
                    sessionId,
                    attemptId,
                    enabled: true,
                    getLiveVideoTrack: () => null,
                }),
            { initialProps: { sessionId: 'session-1' } },
        );

        await waitFor(() =>
            expect(consoleWarnSpy).toHaveBeenCalledWith(
                expect.stringContaining(
                    '[LiveInspection Diagnostic] Phase: fetch_directive_authorization, Status: 403, Code: UNAUTHORIZED',
                ),
            ),
        );

        // Reset warn spy
        consoleWarnSpy.mockClear();

        // Mock 404 error using ApiError
        const notFoundError = new ApiError({
            message: 'Not Found',
            status: 404,
            statusText: 'Not Found',
        });
        mockDirective.mockRejectedValueOnce(notFoundError);

        rerender({ sessionId: 'session-2' });

        // Wait a bit to ensure it reconciles
        await waitFor(() => expect(mockDirective).toHaveBeenCalled());

        // It should NOT call console.warn because 404 is normal/idle
        expect(consoleWarnSpy).not.toHaveBeenCalled();

        consoleWarnSpy.mockRestore();
    });

    it('resets authorization cooldown on new broadcast signal after transient 401/403', async () => {
        const { supabase, getBroadcastHandler } = createSupabase();
        const { original } = createLiveTrack();
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        // Mock 403 error using ApiError
        const forbiddenError = new ApiError({
            message: 'Forbidden',
            status: 403,
            statusText: 'Forbidden',
        });
        mockDirective.mockRejectedValueOnce(forbiddenError).mockResolvedValue(createDirective(1));

        const { result } = renderHook(() =>
            useStudentLiveInspectionPublisher({
                supabase,
                apiClient: vi.fn() as never,
                sessionId: 'session-1',
                attemptId,
                enabled: true,
                getLiveVideoTrack: () => original,
            }),
        );

        // First call fails with 403
        await waitFor(() => expect(mockDirective).toHaveBeenCalledTimes(1));

        // Simulate broadcast signal from proctor
        const broadcastHandler = getBroadcastHandler();
        expect(broadcastHandler).toBeDefined();

        await act(async () => {
            broadcastHandler?.();
        });

        // Broadcast signal triggers immediate reconcile without waiting for a cooldown
        await waitFor(() => expect(mockDirective.mock.calls.length).toBeGreaterThan(1));
        await waitFor(() => expect(result.current.isLive).toBe(true));

        consoleWarnSpy.mockRestore();
    });
});
