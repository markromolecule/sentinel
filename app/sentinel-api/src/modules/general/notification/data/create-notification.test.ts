import { describe, expect, it, vi } from 'vitest';
import { createNotificationData } from './create-notification';

describe('createNotificationData', () => {
    it('saves a valid UUID resource ID directly', async () => {
        const mockExecute = vi.fn().mockResolvedValue({
            notification_id: '11111111-1111-1111-1111-111111111111',
            title: 'Test',
            message: 'Test',
            status: 'UNREAD',
            action_type: 'EXAM_ASSIGNMENT_CREATED',
            resource_type: 'EXAM_ASSIGNMENT',
            resource_id: '44444444-4444-4444-4444-444444444444',
            metadata: null,
        });

        const mockInsertInto = vi.fn().mockReturnValue({
            values: vi.fn().mockReturnValue({
                returningAll: vi.fn().mockReturnValue({
                    executeTakeFirstOrThrow: mockExecute,
                }),
            }),
        });

        const dbClient = {
            insertInto: mockInsertInto,
        } as any;

        const args = {
            dbClient,
            recipientUserId: 'user-1',
            title: 'Test',
            message: 'Test',
            actionType: 'EXAM_ASSIGNMENT_CREATED' as const,
            resourceType: 'EXAM_ASSIGNMENT' as const,
            resourceId: '44444444-4444-4444-4444-444444444444',
        };

        await createNotificationData(args);

        expect(mockInsertInto).toHaveBeenCalledWith('notifications');
        const valuesCalled = mockInsertInto.mock.results[0].value.values.mock.calls[0][0];
        expect(valuesCalled.resource_id).toBe('44444444-4444-4444-4444-444444444444');
        expect(valuesCalled.metadata).toBeNull();
    });

    it('persists a valid actor only when the referenced user still exists', async () => {
        const mockExecuteUserLookup = vi.fn().mockResolvedValue({
            id: '33333333-3333-3333-3333-333333333333',
        });
        const mockExecute = vi.fn().mockResolvedValue({
            notification_id: '11111111-1111-1111-1111-111111111111',
            title: 'Test',
            message: 'Test',
            status: 'UNREAD',
            action_type: 'EXAM_ASSIGNMENT_CREATED',
            resource_type: 'EXAM_ASSIGNMENT',
            resource_id: '44444444-4444-4444-4444-444444444444',
            metadata: null,
        });

        const mockInsertInto = vi.fn().mockReturnValue({
            values: vi.fn().mockReturnValue({
                returningAll: vi.fn().mockReturnValue({
                    executeTakeFirstOrThrow: mockExecute,
                }),
            }),
        });

        const mockSelectFrom = vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                    executeTakeFirst: mockExecuteUserLookup,
                }),
            }),
        });

        const dbClient = {
            insertInto: mockInsertInto,
            selectFrom: mockSelectFrom,
        } as any;

        await createNotificationData({
            dbClient,
            recipientUserId: 'user-1',
            actorUserId: '33333333-3333-3333-3333-333333333333',
            title: 'Test',
            message: 'Test',
            actionType: 'EXAM_ASSIGNMENT_CREATED' as const,
            resourceType: 'EXAM_ASSIGNMENT' as const,
            resourceId: '44444444-4444-4444-4444-444444444444',
        });

        expect(mockSelectFrom).toHaveBeenCalledWith('users');
        const valuesCalled = mockInsertInto.mock.results[0].value.values.mock.calls[0][0];
        expect(valuesCalled.actor_user_id).toBe('33333333-3333-3333-3333-333333333333');
    });

    it('falls back to null when the actor user no longer exists', async () => {
        const mockExecute = vi.fn().mockResolvedValue({
            notification_id: '11111111-1111-1111-1111-111111111111',
            title: 'Test',
            message: 'Test',
            status: 'UNREAD',
            action_type: 'EXAM_ASSIGNMENT_CREATED',
            resource_type: 'EXAM_ASSIGNMENT',
            resource_id: '44444444-4444-4444-4444-444444444444',
            metadata: null,
        });

        const mockInsertInto = vi.fn().mockReturnValue({
            values: vi.fn().mockReturnValue({
                returningAll: vi.fn().mockReturnValue({
                    executeTakeFirstOrThrow: mockExecute,
                }),
            }),
        });

        const mockSelectFrom = vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                    executeTakeFirst: vi.fn().mockResolvedValue(undefined),
                }),
            }),
        });

        const dbClient = {
            insertInto: mockInsertInto,
            selectFrom: mockSelectFrom,
        } as any;

        await createNotificationData({
            dbClient,
            recipientUserId: 'user-1',
            actorUserId: '44444444-4444-4444-4444-444444444444',
            title: 'Test',
            message: 'Test',
            actionType: 'EXAM_ASSIGNMENT_CREATED' as const,
            resourceType: 'EXAM_ASSIGNMENT' as const,
            resourceId: '44444444-4444-4444-4444-444444444444',
        });

        expect(mockSelectFrom).toHaveBeenCalledWith('users');
        const valuesCalled = mockInsertInto.mock.results[0].value.values.mock.calls[0][0];
        expect(valuesCalled.actor_user_id).toBeNull();
    });

    it('ignores malformed actor ids and does not query the users table', async () => {
        const mockExecute = vi.fn().mockResolvedValue({
            notification_id: '11111111-1111-1111-1111-111111111111',
            title: 'Test',
            message: 'Test',
            status: 'UNREAD',
            action_type: 'EXAM_ASSIGNMENT_CREATED',
            resource_type: 'EXAM_ASSIGNMENT',
            resource_id: '44444444-4444-4444-4444-444444444444',
            metadata: null,
        });

        const mockInsertInto = vi.fn().mockReturnValue({
            values: vi.fn().mockReturnValue({
                returningAll: vi.fn().mockReturnValue({
                    executeTakeFirstOrThrow: mockExecute,
                }),
            }),
        });

        const mockSelectFrom = vi.fn();

        const dbClient = {
            insertInto: mockInsertInto,
            selectFrom: mockSelectFrom,
        } as any;

        await createNotificationData({
            dbClient,
            recipientUserId: 'user-1',
            actorUserId: 'system-actor',
            title: 'Test',
            message: 'Test',
            actionType: 'EXAM_ASSIGNMENT_CREATED' as const,
            resourceType: 'EXAM_ASSIGNMENT' as const,
            resourceId: '44444444-4444-4444-4444-444444444444',
        });

        expect(mockSelectFrom).not.toHaveBeenCalled();
        const valuesCalled = mockInsertInto.mock.results[0].value.values.mock.calls[0][0];
        expect(valuesCalled.actor_user_id).toBeNull();
    });

    it('replaces a non-UUID resource ID with null in db, saving it to metadata instead', async () => {
        const mockExecute = vi.fn().mockResolvedValue({
            notification_id: '11111111-1111-1111-1111-111111111111',
            title: 'Test',
            message: 'Test',
            status: 'UNREAD',
            action_type: 'INSTITUTION_ACTIVITY_TRANSACTION_COMPLETED',
            resource_type: 'INSTITUTION_ACTIVITY',
            resource_id: null,
            metadata: { originalResourceId: '7' },
        });

        const mockInsertInto = vi.fn().mockReturnValue({
            values: vi.fn().mockReturnValue({
                returningAll: vi.fn().mockReturnValue({
                    executeTakeFirstOrThrow: mockExecute,
                }),
            }),
        });

        const dbClient = {
            insertInto: mockInsertInto,
        } as any;

        const args = {
            dbClient,
            recipientUserId: 'user-1',
            title: 'Test',
            message: 'Test',
            actionType: 'INSTITUTION_ACTIVITY_TRANSACTION_COMPLETED' as const,
            resourceType: 'INSTITUTION_ACTIVITY' as const,
            resourceId: '7',
            metadata: { foo: 'bar' },
        };

        await createNotificationData(args);

        expect(mockInsertInto).toHaveBeenCalledWith('notifications');
        const valuesCalled = mockInsertInto.mock.results[0].value.values.mock.calls[0][0];
        expect(valuesCalled.resource_id).toBeNull();
        expect(valuesCalled.metadata).toEqual({
            foo: 'bar',
            originalResourceId: '7',
        });
    });
});
