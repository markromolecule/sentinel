import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPublisherConnection } from './create-publisher-connection.service';
import * as accessService from '../live-inspection-access.service';
import * as repository from '../live-inspection.repository';
import * as stateService from '../live-inspection-state.service';

vi.mock('../live-inspection-access.service');
vi.mock('../live-inspection.repository');
vi.mock('../live-inspection-state.service');
vi.mock('../../../infrastructure/livekit/livekit.service');

const config = {
    enabled: true,
    allowedInstitutionIds: [],
    liveKitUrl: 'wss://livekit.test',
    apiKey: 'key',
    apiSecret: 'secret',
    requestTimeoutMs: 20_000,
    viewerJoinTimeoutMs: 15_000,
    maxInspectionDurationSeconds: 300,
    tokenTtlSeconds: 60,
    roomEmptyTimeoutSeconds: 30,
    roomDepartureTimeoutSeconds: 10,
    globalActiveInspectionLimit: 20,
    institutionActiveInspectionLimit: 10,
};

const connectingLease = {
    lease_id: '11111111-1111-4111-8111-111111111111',
    exam_id: '22222222-2222-4222-8222-222222222222',
    attempt_id: '33333333-3333-4333-8333-333333333333',
    student_user_id: '44444444-4444-4444-8444-444444444444',
    viewer_user_id: '55555555-5555-4555-8555-555555555555',
    institution_id: '66666666-6666-4666-8666-666666666666',
    provider_room_name: 'room-1',
    state: 'PUBLISHER_CONNECTING',
    version: 2,
    requested_at: new Date(),
    expires_at: new Date(Date.now() + 60_000),
};

describe('createPublisherConnection', () => {
    const liveKit = {
        createPublisherToken: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(accessService.assertLiveInspectionStudentAccess).mockResolvedValue({
            attempt_id: connectingLease.attempt_id,
        } as any);
        vi.mocked(repository.getLiveInspectionLeaseForStudent).mockResolvedValue(
            connectingLease as any,
        );
        liveKit.createPublisherToken.mockResolvedValue({
            token: 'replacement-token',
            participantIdentity: `live-inspection:publisher:${connectingLease.lease_id}`,
            liveKitUrl: config.liveKitUrl,
            expiresAt: new Date('2026-07-27T00:00:00.000Z'),
        });
    });

    it('reissues credentials for the current PUBLISHER_CONNECTING revision', async () => {
        const result = await createPublisherConnection(
            {
                dbClient: {} as any,
                sessionId: '77777777-7777-4777-8777-777777777777',
                studentUserId: connectingLease.student_user_id,
                leaseId: connectingLease.lease_id,
                revision: 2,
            },
            { config, liveKit: liveKit as any },
        );

        expect(stateService.transitionLiveInspectionLeaseState).not.toHaveBeenCalled();
        expect(liveKit.createPublisherToken).toHaveBeenCalledWith({
            roomName: 'room-1',
            leaseId: connectingLease.lease_id,
        });
        expect(result).toMatchObject({
            leaseId: connectingLease.lease_id,
            revision: 2,
            token: 'replacement-token',
        });
    });
});
