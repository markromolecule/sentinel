import { beforeEach, describe, expect, it, vi } from 'vitest';
import { processLiveKitWebhook } from './live-inspection-webhook.service';
import {
    getLiveInspectionLeaseByRoomName,
    markLiveKitWebhookEventProcessed,
    recordLiveKitWebhookEventOnce,
} from '../live-inspection.repository';
import { transitionLiveInspectionLeaseState } from '../live-inspection-state.service';
import { LiveKitService } from '../../../infrastructure/livekit/livekit.service';

vi.mock('../live-inspection.repository', () => ({
    getLiveInspectionLeaseByRoomName: vi.fn(),
    markLiveKitWebhookEventProcessed: vi.fn(),
    recordLiveKitWebhookEventOnce: vi.fn(),
}));

vi.mock('../live-inspection-state.service', () => ({
    terminalizeLiveInspectionLeaseState: vi.fn(),
    transitionLiveInspectionLeaseState: vi.fn(),
}));

vi.mock('../../../infrastructure/livekit/livekit.service', () => ({
    LiveKitService: {
        logLiveInspectionLifecycleEvent: vi.fn(),
    },
}));

describe('processLiveKitWebhook', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('treats duplicate provider events as successful no-ops', async () => {
        vi.mocked(getLiveInspectionLeaseByRoomName).mockResolvedValueOnce(undefined as any);
        vi.mocked(recordLiveKitWebhookEventOnce).mockResolvedValueOnce(false);

        await expect(
            processLiveKitWebhook({
                dbClient: {} as any,
                event: {
                    event: 'participant_joined',
                    room: { name: 'room-1' },
                    participant: { identity: 'viewer' },
                    createdAt: 1,
                } as any,
            }),
        ).resolves.toEqual({ processed: false, result: 'DUPLICATE' });
        expect(markLiveKitWebhookEventProcessed).not.toHaveBeenCalled();
    });

    it('maps publisher track publication to publisher-ready transition', async () => {
        vi.mocked(getLiveInspectionLeaseByRoomName).mockResolvedValueOnce({
            lease_id: '11111111-1111-4111-8111-111111111111',
            attempt_id: '22222222-2222-4222-8222-222222222222',
            exam_id: '33333333-3333-4333-8333-333333333333',
            student_user_id: '44444444-4444-4444-8444-444444444444',
            viewer_user_id: '55555555-5555-4555-8555-555555555555',
            institution_id: '66666666-6666-4666-8666-666666666666',
            provider_room_name: 'room-1',
            state: 'PUBLISHER_CONNECTING',
            version: 4,
            requested_at: new Date('2026-07-20T00:00:00.000Z'),
        } as any);
        vi.mocked(recordLiveKitWebhookEventOnce).mockResolvedValueOnce(true);

        const result = await processLiveKitWebhook({
            dbClient: {} as any,
            event: {
                event: 'track_published',
                room: { name: 'room-1' },
                participant: {
                    identity: 'live-inspection:publisher:11111111-1111-4111-8111-111111111111',
                },
                createdAt: 2,
            } as any,
        });

        expect(result).toEqual({ processed: true, result: 'PUBLISHER_READY' });
        expect(transitionLiveInspectionLeaseState).toHaveBeenCalledWith({
            dbClient: {},
            leaseId: '11111111-1111-4111-8111-111111111111',
            fromState: 'PUBLISHER_CONNECTING',
            toState: 'PUBLISHER_READY',
            expectedVersion: 4,
        });
        expect(markLiveKitWebhookEventProcessed).toHaveBeenCalledWith({} as any, {
            providerEventId:
                'track_published:room-1:live-inspection:publisher:11111111-1111-4111-8111-111111111111:2',
            processingResult: 'PUBLISHER_READY',
        });
        expect(LiveKitService.logLiveInspectionLifecycleEvent).toHaveBeenCalledWith(
            {},
            expect.objectContaining({
                metric: 'publisher_ready',
                leaseId: '11111111-1111-4111-8111-111111111111',
                role: 'publisher',
                state: 'PUBLISHER_READY',
                previousState: 'PUBLISHER_CONNECTING',
                boundedCode: 'PUBLISHER_READY',
            }),
        );
    });

    it('promotes an already-connected viewer to live as soon as the publisher track arrives', async () => {
        const lease = {
            lease_id: '11111111-1111-4111-8111-111111111111',
            attempt_id: '22222222-2222-4222-8222-222222222222',
            exam_id: '33333333-3333-4333-8333-333333333333',
            student_user_id: '44444444-4444-4444-8444-444444444444',
            viewer_user_id: '55555555-5555-4555-8555-555555555555',
            institution_id: '66666666-6666-4666-8666-666666666666',
            provider_room_name: 'room-1',
            state: 'PUBLISHER_CONNECTING',
            version: 4,
            requested_at: new Date('2026-07-20T00:00:00.000Z'),
        };
        const readyLease = { ...lease, state: 'PUBLISHER_READY', version: 5 };
        const listInspectionParticipants = vi.fn().mockResolvedValue([
            {
                identity: 'live-inspection:viewer:11111111-1111-4111-8111-111111111111',
            },
        ]);
        vi.mocked(getLiveInspectionLeaseByRoomName).mockResolvedValueOnce(lease as any);
        vi.mocked(recordLiveKitWebhookEventOnce).mockResolvedValueOnce(true);
        vi.mocked(transitionLiveInspectionLeaseState)
            .mockResolvedValueOnce(readyLease as any)
            .mockResolvedValueOnce({ ...readyLease, state: 'LIVE', version: 6 } as any);

        const result = await processLiveKitWebhook({
            dbClient: {} as any,
            liveKit: { listInspectionParticipants },
            event: {
                event: 'track_published',
                room: { name: 'room-1' },
                participant: {
                    identity: 'live-inspection:publisher:11111111-1111-4111-8111-111111111111',
                },
                createdAt: 3,
            } as any,
        });

        expect(result).toEqual({ processed: true, result: 'VIEWER_LIVE' });
        expect(listInspectionParticipants).toHaveBeenCalledWith('room-1');
        expect(transitionLiveInspectionLeaseState).toHaveBeenNthCalledWith(2, {
            dbClient: {},
            leaseId: lease.lease_id,
            fromState: 'PUBLISHER_READY',
            toState: 'LIVE',
            expectedVersion: 5,
        });
        expect(LiveKitService.logLiveInspectionLifecycleEvent).toHaveBeenCalledWith(
            {},
            expect.objectContaining({
                metric: 'live',
                state: 'LIVE',
                previousState: 'PUBLISHER_READY',
                boundedCode: 'VIEWER_LIVE',
            }),
        );
    });
});
