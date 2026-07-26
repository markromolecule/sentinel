import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    LiveKitManagedService,
    LiveKitProviderError,
    buildLiveKitParticipantIdentity,
} from './livekit-managed.service';
import type { LiveKitConfig } from '../livekit.config';

const config: LiveKitConfig = {
    enabled: true,
    allowedInstitutionIds: [],
    liveKitUrl: 'wss://sentinel-test.livekit.cloud',
    apiKey: 'api-key',
    apiSecret: 'api-secret',
    requestTimeoutMs: 20_000,
    viewerJoinTimeoutMs: 15_000,
    maxInspectionDurationSeconds: 300,
    tokenTtlSeconds: 60,
    roomEmptyTimeoutSeconds: 30,
    roomDepartureTimeoutSeconds: 10,
    globalActiveInspectionLimit: 20,
    institutionActiveInspectionLimit: 10,
};

const tokenInstances: MockAccessToken[] = [];

class MockAccessToken {
    readonly grants: unknown[] = [];

    constructor(
        readonly apiKey: string,
        readonly apiSecret: string,
        readonly options: { identity: string; ttl: number },
    ) {
        tokenInstances.push(this);
    }

    addGrant(grant: unknown) {
        this.grants.push(grant);
    }

    async toJwt() {
        return `jwt-for-${this.options.identity}`;
    }
}

describe('LiveKitManagedService', () => {
    const roomClient = {
        createRoom: vi.fn(),
        removeParticipant: vi.fn(),
        deleteRoom: vi.fn(),
        listParticipants: vi.fn(),
    };
    const webhookReceiver = {
        receive: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        tokenInstances.length = 0;
    });

    function createService() {
        return new LiveKitManagedService({
            config,
            roomClient,
            tokenFactory: MockAccessToken as any,
            webhookReceiver,
        });
    }

    it('creates a two-participant room with lease-only metadata and no egress', async () => {
        roomClient.createRoom.mockResolvedValueOnce({ name: 'room-1' });

        await createService().createInspectionRoom({
            roomName: 'room-1',
            leaseId: '11111111-1111-4111-8111-111111111111',
        });

        expect(roomClient.createRoom).toHaveBeenCalledWith({
            name: 'room-1',
            maxParticipants: 2,
            emptyTimeout: 30,
            departureTimeout: 10,
            metadata: JSON.stringify({ leaseId: '11111111-1111-4111-8111-111111111111' }),
        });
        expect(
            JSON.stringify(roomClient.createRoom.mock.calls[0]?.[0]).toLowerCase(),
        ).not.toContain('egress');
        expect(
            JSON.stringify(roomClient.createRoom.mock.calls[0]?.[0]).toLowerCase(),
        ).not.toContain('record');
    });

    it('generates camera-only publisher grants with a 60 second TTL', async () => {
        const result = await createService().createPublisherToken({
            roomName: 'room-1',
            leaseId: '11111111-1111-4111-8111-111111111111',
        });

        expect(result).toMatchObject({
            token: 'jwt-for-live-inspection:publisher:11111111-1111-4111-8111-111111111111',
            participantIdentity: 'live-inspection:publisher:11111111-1111-4111-8111-111111111111',
            liveKitUrl: config.liveKitUrl,
        });
        expect(tokenInstances[0]?.options.ttl).toBe(60);
        expect(tokenInstances[0]?.grants[0]).toMatchObject({
            room: 'room-1',
            roomJoin: true,
            canPublish: true,
            canSubscribe: false,
            canPublishData: false,
        });
        expect(JSON.stringify(tokenInstances[0]?.grants[0]).toLowerCase()).not.toContain('screen');
        expect(JSON.stringify(tokenInstances[0]?.grants[0]).toLowerCase()).not.toContain('record');
    });

    it('generates subscribe-only viewer grants', async () => {
        await createService().createViewerToken({
            roomName: 'room-1',
            leaseId: '11111111-1111-4111-8111-111111111111',
        });

        expect(tokenInstances[0]?.grants[0]).toMatchObject({
            room: 'room-1',
            roomJoin: true,
            canPublish: false,
            canSubscribe: true,
            canPublishData: false,
        });
    });

    it('tolerates provider not-found cleanup', async () => {
        roomClient.removeParticipant.mockRejectedValueOnce(new Error('participant not found'));
        roomClient.deleteRoom.mockRejectedValueOnce({ status: 404 });

        await expect(
            createService().removeParticipant({
                roomName: 'room-1',
                participantIdentity: 'live-inspection:publisher:lease-1',
            }),
        ).resolves.toBeUndefined();
        await expect(createService().deleteInspectionRoom('room-1')).resolves.toBeUndefined();
    });

    it('redacts provider errors behind bounded codes', async () => {
        roomClient.createRoom.mockRejectedValueOnce(new Error('secret provider stack'));

        await expect(
            createService().createInspectionRoom({ roomName: 'room-1', leaseId: 'lease-1' }),
        ).rejects.toMatchObject({
            code: 'PROVIDER_ROOM_ERROR',
            message: 'LiveKit provider operation failed.',
        });
    });

    it('bounds provider operations with the configured request timeout', async () => {
        vi.useFakeTimers();
        const timeoutConfig = { ...config, requestTimeoutMs: 25 };
        roomClient.deleteRoom.mockReturnValueOnce(new Promise(() => undefined));
        const assertion = expect(
            new LiveKitManagedService({
                config: timeoutConfig,
                roomClient,
                tokenFactory: MockAccessToken as any,
                webhookReceiver,
            }).deleteInspectionRoom('room-stuck'),
        ).rejects.toMatchObject({
            code: 'PROVIDER_ROOM_ERROR',
            message: 'LiveKit provider operation failed.',
        });

        await vi.advanceTimersByTimeAsync(25);
        await assertion;
        vi.useRealTimers();
    });

    it('verifies webhooks with the receiver and rejects invalid signatures', async () => {
        webhookReceiver.receive.mockResolvedValueOnce({ event: 'participant_joined' });

        await expect(
            createService().receiveWebhook('{"event":"x"}', 'Bearer token'),
        ).resolves.toEqual({
            event: 'participant_joined',
        });
        expect(webhookReceiver.receive).toHaveBeenCalledWith('{"event":"x"}', 'Bearer token');

        webhookReceiver.receive.mockRejectedValueOnce(new Error('bad signature'));

        await expect(createService().receiveWebhook('{}', 'bad')).rejects.toBeInstanceOf(
            LiveKitProviderError,
        );
    });

    it('builds opaque participant identities without personal data', () => {
        expect(
            buildLiveKitParticipantIdentity('11111111-1111-4111-8111-111111111111', 'viewer'),
        ).toBe('live-inspection:viewer:11111111-1111-4111-8111-111111111111');
    });
});
