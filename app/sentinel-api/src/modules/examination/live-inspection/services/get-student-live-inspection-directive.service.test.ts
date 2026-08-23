import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HTTPException } from 'hono/http-exception';
import { getStudentLiveInspectionDirective } from './get-student-live-inspection-directive.service';
import * as accessService from '../live-inspection-access.service';
import * as repository from '../live-inspection.repository';
import * as stateService from '../live-inspection-state.service';
import { LiveKitService } from '../../../infrastructure/livekit/livekit.service';

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

const requestedLease = {
    lease_id: '11111111-1111-4111-8111-111111111111',
    exam_id: '22222222-2222-4222-8222-222222222222',
    attempt_id: '33333333-3333-4333-8333-333333333333',
    student_user_id: '44444444-4444-4444-8444-444444444444',
    viewer_user_id: '55555555-5555-4555-8555-555555555555',
    institution_id: '66666666-6666-4666-8666-666666666666',
    provider_room_name: 'room-1',
    state: 'REQUESTED',
    version: 1,
    requested_at: new Date('2026-07-27T00:00:00.000Z'),
    expires_at: new Date(Date.now() + 60_000),
    started_at: null,
    ended_at: null,
    end_reason: null,
    last_error_code: null,
};

describe('getStudentLiveInspectionDirective', () => {
    const liveKit = {
        createPublisherToken: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(accessService.assertLiveInspectionStudentAccess).mockResolvedValue({
            attempt_id: requestedLease.attempt_id,
            exam_id: requestedLease.exam_id,
        } as any);
        liveKit.createPublisherToken.mockResolvedValue({
            token: 'mock-publisher-token',
            participantIdentity: `sentinel:publisher:${requestedLease.student_user_id}`,
            liveKitUrl: config.liveKitUrl,
            expiresAt: new Date('2026-07-27T00:05:00.000Z'),
        });
    });

    it('transitions lease from REQUESTED to PUBLISHER_CONNECTING and returns bundled connection', async () => {
        vi.mocked(repository.getActiveLiveInspectionLeaseForAttempt).mockResolvedValue(
            requestedLease as any,
        );
        vi.mocked(stateService.transitionLiveInspectionLeaseState).mockResolvedValue({
            ...requestedLease,
            state: 'PUBLISHER_CONNECTING',
            version: 2,
        } as any);

        const result = await getStudentLiveInspectionDirective(
            {
                dbClient: {} as any,
                sessionId: '77777777-7777-4777-8777-777777777777',
                studentUserId: requestedLease.student_user_id,
            },
            { config, liveKit: liveKit as any },
        );

        expect(stateService.transitionLiveInspectionLeaseState).toHaveBeenCalledWith({
            dbClient: expect.any(Object),
            leaseId: requestedLease.lease_id,
            fromState: 'REQUESTED',
            toState: 'PUBLISHER_CONNECTING',
            expectedVersion: 1,
        });
        expect(liveKit.createPublisherToken).toHaveBeenCalledWith({
            roomName: 'room-1',
            leaseId: requestedLease.lease_id,
        });
        expect(result).toMatchObject({
            leaseId: requestedLease.lease_id,
            revision: 2,
            state: 'PUBLISHER_CONNECTING',
            connection: {
                token: 'mock-publisher-token',
                liveKitUrl: config.liveKitUrl,
                participantIdentity: `sentinel:publisher:${requestedLease.student_user_id}`,
            },
        });
    });

    it('returns bundled connection without state transition when already PUBLISHER_CONNECTING', async () => {
        const connectingLease = {
            ...requestedLease,
            state: 'PUBLISHER_CONNECTING',
            version: 2,
        };
        vi.mocked(repository.getActiveLiveInspectionLeaseForAttempt).mockResolvedValue(
            connectingLease as any,
        );

        const result = await getStudentLiveInspectionDirective(
            {
                dbClient: {} as any,
                sessionId: '77777777-7777-4777-8777-777777777777',
                studentUserId: requestedLease.student_user_id,
            },
            { config, liveKit: liveKit as any },
        );

        expect(stateService.transitionLiveInspectionLeaseState).not.toHaveBeenCalled();
        expect(liveKit.createPublisherToken).toHaveBeenCalled();
        expect(result.connection).toBeDefined();
        expect(result.connection?.token).toBe('mock-publisher-token');
    });

    it('returns directive without bundled connection when lease is LIVE', async () => {
        const liveLease = {
            ...requestedLease,
            state: 'LIVE',
            version: 3,
        };
        vi.mocked(repository.getActiveLiveInspectionLeaseForAttempt).mockResolvedValue(
            liveLease as any,
        );

        const result = await getStudentLiveInspectionDirective(
            {
                dbClient: {} as any,
                sessionId: '77777777-7777-4777-8777-777777777777',
                studentUserId: requestedLease.student_user_id,
            },
            { config, liveKit: liveKit as any },
        );

        expect(stateService.transitionLiveInspectionLeaseState).not.toHaveBeenCalled();
        expect(liveKit.createPublisherToken).not.toHaveBeenCalled();
        expect(result.connection).toBeUndefined();
        expect(result.state).toBe('LIVE');
    });

    it('terminalizes lease and throws if publisher token generation fails', async () => {
        vi.mocked(repository.getActiveLiveInspectionLeaseForAttempt).mockResolvedValue(
            requestedLease as any,
        );
        vi.mocked(stateService.transitionLiveInspectionLeaseState).mockResolvedValue({
            ...requestedLease,
            state: 'PUBLISHER_CONNECTING',
            version: 2,
        } as any);
        liveKit.createPublisherToken.mockRejectedValue(new Error('LiveKit down'));

        await expect(
            getStudentLiveInspectionDirective(
                {
                    dbClient: {} as any,
                    sessionId: '77777777-7777-4777-8777-777777777777',
                    studentUserId: requestedLease.student_user_id,
                },
                { config, liveKit: liveKit as any },
            ),
        ).rejects.toThrow('LiveKit down');

        expect(repository.terminalizeLiveInspectionLease).toHaveBeenCalledWith(
            expect.any(Object),
            expect.objectContaining({
                leaseId: requestedLease.lease_id,
                state: 'FAILED',
                endReason: 'TOKEN_ERROR',
            }),
        );
    });

    it('throws 404 if no active lease exists or lease is expired', async () => {
        vi.mocked(repository.getActiveLiveInspectionLeaseForAttempt).mockResolvedValue(null);

        await expect(
            getStudentLiveInspectionDirective(
                {
                    dbClient: {} as any,
                    sessionId: '77777777-7777-4777-8777-777777777777',
                    studentUserId: requestedLease.student_user_id,
                },
                { config, liveKit: liveKit as any },
            ),
        ).rejects.toBeInstanceOf(HTTPException);
    });
});
