import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HTTPException } from 'hono/http-exception';
import type { LiveKitConfig } from '../../../infrastructure/livekit/livekit.config';
import { LiveKitService } from '../../../infrastructure/livekit/livekit.service';
import { getLiveInspectionLeaseForViewer } from '../live-inspection.repository';
import { assertLiveInspectionViewerAccess } from '../live-inspection-access.service';
import { createViewerConnection } from './create-viewer-connection.service';

vi.mock('../live-inspection.repository');
vi.mock('../live-inspection-access.service');
vi.mock('../../../infrastructure/livekit/livekit.service');

const config: LiveKitConfig = {
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

const lease = {
    lease_id: '11111111-1111-4111-8111-111111111111',
    attempt_id: '22222222-2222-4222-8222-222222222222',
    exam_id: '33333333-3333-4333-8333-333333333333',
    student_user_id: '44444444-4444-4444-8444-444444444444',
    viewer_user_id: '55555555-5555-4555-8555-555555555555',
    institution_id: '66666666-6666-4666-8666-666666666666',
    provider_room_name: 'room-1',
    state: 'REQUESTED',
    version: 1,
    requested_at: new Date('2099-07-26T12:00:00.000Z'),
    expires_at: new Date('2099-07-26T12:05:00.000Z'),
};

describe('createViewerConnection', () => {
    const liveKit = {
        createViewerToken: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(getLiveInspectionLeaseForViewer).mockResolvedValue(lease as any);
        vi.mocked(assertLiveInspectionViewerAccess).mockResolvedValue({} as any);
        liveKit.createViewerToken.mockResolvedValue({
            token: 'viewer-token',
            liveKitUrl: 'wss://livekit.test',
            participantIdentity: 'live-inspection:viewer:lease-1',
            expiresAt: new Date('2099-07-26T12:01:00.000Z'),
        });
    });

    it.each(['REQUESTED', 'PUBLISHER_CONNECTING', 'PUBLISHER_READY', 'LIVE'])(
        'issues the subscribe-only viewer token while the lease is %s',
        async (state) => {
            vi.mocked(getLiveInspectionLeaseForViewer).mockResolvedValueOnce({
                ...lease,
                state,
            } as any);

            await expect(
                createViewerConnection(
                    {
                        dbClient: {} as any,
                        examId: lease.exam_id,
                        leaseId: lease.lease_id,
                        viewerUserId: lease.viewer_user_id,
                        role: 'instructor',
                        activeInstitutionId: lease.institution_id,
                    },
                    { config, liveKit: liveKit as any },
                ),
            ).resolves.toMatchObject({
                leaseId: lease.lease_id,
                token: 'viewer-token',
            });

            expect(liveKit.createViewerToken).toHaveBeenCalledWith({
                roomName: lease.provider_room_name,
                leaseId: lease.lease_id,
            });
        },
    );

    it('rejects a stopping lease without minting a token', async () => {
        vi.mocked(getLiveInspectionLeaseForViewer).mockResolvedValueOnce({
            ...lease,
            state: 'STOPPING',
        } as any);

        await expect(
            createViewerConnection(
                {
                    dbClient: {} as any,
                    examId: lease.exam_id,
                    leaseId: lease.lease_id,
                    viewerUserId: lease.viewer_user_id,
                    role: 'instructor',
                    activeInstitutionId: lease.institution_id,
                },
                { config, liveKit: liveKit as any },
            ),
        ).rejects.toBeInstanceOf(HTTPException);

        expect(liveKit.createViewerToken).not.toHaveBeenCalled();
        expect(LiveKitService.logLiveKitTokenGranted).not.toHaveBeenCalled();
    });
});
