import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HTTPException } from 'hono/http-exception';
import {
    createDirectConversation,
    sendMessage,
    markConversationRead,
} from './message-write.service';
import * as dataLayer from '../data';
import { NotificationService } from '../../notification/notification.service';

vi.mock('../data', () => ({
    findDirectConversationData: vi.fn(),
    createConversationData: vi.fn(),
    addConversationParticipantsData: vi.fn(),
    createMessageData: vi.fn(),
    markConversationReadData: vi.fn(),
    getConversationByIdData: vi.fn(),
}));

vi.mock('../../notification/notification.service', () => ({
    NotificationService: {
        createNotification: vi.fn(),
    },
}));

describe('message-write.service', () => {
    const userId = 'a7c93cb6-bce7-440a-9db1-3ef5a9b9a67a';
    const recipientId = '550e8400-e29b-41d4-a716-446655440000';
    const conversationId = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';

    let mockDbClient: any;

    beforeEach(() => {
        vi.clearAllMocks();

        // Standard mock Kysely DbClient with selectFrom and transaction support
        mockDbClient = {
            selectFrom: vi.fn().mockReturnThis(),
            innerJoin: vi.fn().mockReturnThis(),
            leftJoin: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            whereRef: vi.fn().mockReturnThis(),
            orderBy: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            executeTakeFirst: vi.fn(),
            transaction: vi.fn().mockReturnValue({
                execute: vi.fn((cb) => cb(mockDbClient)),
            }),
        } as any;
    });

    describe('createDirectConversation', () => {
        it('should throw 400 if user starts conversation with themselves', async () => {
            await expect(
                createDirectConversation(mockDbClient, { userId, recipientId: userId }),
            ).rejects.toThrowError(
                new HTTPException(400, { message: 'Cannot start a conversation with yourself.' }),
            );
        });

        it('should throw 404 if recipient profile does not exist', async () => {
            mockDbClient.executeTakeFirst
                .mockResolvedValueOnce({ institution_id: 'inst-1' }) // requesterProfile
                .mockResolvedValueOnce({ roleName: 'instructor' }) // requesterRole
                .mockResolvedValueOnce(undefined); // recipient exists check fails

            await expect(
                createDirectConversation(mockDbClient, { userId, recipientId }),
            ).rejects.toThrowError(
                new HTTPException(404, { message: 'Recipient user profile not found.' }),
            );
        });

        it('should return existing conversation if found', async () => {
            // 1. Requester profile/role checks + Recipient check
            mockDbClient.executeTakeFirst
                .mockResolvedValueOnce({ institution_id: 'inst-1' }) // requesterProfile
                .mockResolvedValueOnce({ roleName: 'instructor' }) // requesterRole
                .mockResolvedValueOnce({ user_id: recipientId }); // recipient check
            // 2. Existing check
            vi.mocked(dataLayer.findDirectConversationData).mockResolvedValue(conversationId);
            // 3. Get by ID
            const mockConv = {
                conversationId,
                type: 'DIRECT',
                createdAt: new Date(),
                participants: [],
            };
            vi.mocked(dataLayer.getConversationByIdData).mockResolvedValue(mockConv as any);

            const result = await createDirectConversation(mockDbClient, { userId, recipientId });

            expect(dataLayer.findDirectConversationData).toHaveBeenCalledWith(mockDbClient, {
                userAId: userId,
                userBId: recipientId,
            });
            expect(result.conversationId).toBe(conversationId);
            expect(dataLayer.createConversationData).not.toHaveBeenCalled();
        });

        it('should create new conversation if not exists', async () => {
            // 1. Requester profile/role checks + Recipient check + Log sender check
            mockDbClient.executeTakeFirst
                .mockResolvedValueOnce({ institution_id: 'inst-1' }) // requesterProfile
                .mockResolvedValueOnce({ roleName: 'instructor' }) // requesterRole
                .mockResolvedValueOnce({ user_id: recipientId }) // recipient check
                .mockResolvedValueOnce({ institution_id: 'inst-1' }); // log sender profile check
            // 2. Existing check -> null
            vi.mocked(dataLayer.findDirectConversationData).mockResolvedValue(null);
            // 3. Create conversation -> new ID
            vi.mocked(dataLayer.createConversationData).mockResolvedValue(conversationId);
            // 4. Get by ID
            const mockConv = {
                conversationId,
                type: 'DIRECT',
                createdAt: new Date(),
                participants: [
                    { userId, name: 'User A', role: 'instructor' },
                    { userId: recipientId, name: 'User B', role: 'student' },
                ],
            };
            vi.mocked(dataLayer.getConversationByIdData).mockResolvedValue(mockConv as any);

            const result = await createDirectConversation(mockDbClient, { userId, recipientId });

            expect(dataLayer.createConversationData).toHaveBeenCalled();
            expect(dataLayer.addConversationParticipantsData).toHaveBeenCalledWith(mockDbClient, {
                conversationId,
                userIds: [userId, recipientId],
            });
            expect(result.conversationId).toBe(conversationId);
        });

        it('should throw 404 for student requesters if recipient is ineligible', async () => {
            mockDbClient.executeTakeFirst
                .mockResolvedValueOnce({ institution_id: 'inst-1' }) // requesterProfile
                .mockResolvedValueOnce({ roleName: 'student' }) // requesterRole (student)
                .mockResolvedValueOnce(undefined); // assertEligibleDirectMessageRecipient returns nothing (ineligible)

            await expect(
                createDirectConversation(mockDbClient, { userId, recipientId }),
            ).rejects.toThrowError(
                new HTTPException(404, { message: 'Message recipient not found.' }),
            );
        });

        it('should allow student direct conversation if recipient is eligible', async () => {
            mockDbClient.executeTakeFirst
                .mockResolvedValueOnce({ institution_id: 'inst-1' }) // requesterProfile
                .mockResolvedValueOnce({ roleName: 'student' }) // requesterRole (student)
                .mockResolvedValueOnce({ userId: recipientId }) // assertEligibleDirectMessageRecipient matches eligible recipient
                .mockResolvedValueOnce({ institution_id: 'inst-1' }); // log sender profile check

            vi.mocked(dataLayer.findDirectConversationData).mockResolvedValue(null);
            vi.mocked(dataLayer.createConversationData).mockResolvedValue(conversationId);

            const mockConv = {
                conversationId,
                type: 'DIRECT',
                createdAt: new Date(),
                participants: [
                    { userId, name: 'User A', role: 'student' },
                    { userId: recipientId, name: 'User B', role: 'student' },
                ],
            };
            vi.mocked(dataLayer.getConversationByIdData).mockResolvedValue(mockConv as any);

            const result = await createDirectConversation(mockDbClient, { userId, recipientId });
            expect(result.conversationId).toBe(conversationId);
        });
    });

    describe('sendMessage', () => {
        const content = 'Hello!';

        it('should send a message if sender is a participant', async () => {
            // 1. Verify participant -> success
            mockDbClient.executeTakeFirst.mockResolvedValueOnce({
                conversation_id: conversationId,
            });

            const mockMessage = {
                messageId: 'b3cd17f8-fb3a-4be0-80de-4ff45037d032',
                conversationId,
                senderId: userId,
                content,
                status: 'SENT',
                createdAt: new Date(),
            };
            vi.mocked(dataLayer.createMessageData).mockResolvedValue(mockMessage as any);

            const result = await sendMessage(mockDbClient, {
                conversationId,
                senderId: userId,
                content,
            });

            expect(dataLayer.createMessageData).toHaveBeenCalledWith(mockDbClient, {
                conversationId,
                senderId: userId,
                content,
            });
            expect(result.content).toBe(content);
        });

        it('should throw 403 if sender is not a participant', async () => {
            // 1. Verify participant -> fails
            mockDbClient.executeTakeFirst.mockResolvedValueOnce(undefined);

            await expect(
                sendMessage(mockDbClient, { conversationId, senderId: userId, content }),
            ).rejects.toThrowError(
                new HTTPException(403, {
                    message: 'You are not a participant in this conversation.',
                }),
            );
        });

        describe('sendMessage notifications', () => {
            const longContent =
                'Hello, this is a very long message that should be truncated when used in the notification preview text to keep things clean and concise.';

            it('sends notifications to other participants with correct metadata and institutionId', async () => {
                const mockExecuteTakeFirst = vi
                    .fn()
                    .mockResolvedValueOnce({ conversation_id: conversationId })
                    .mockResolvedValueOnce({ institution_id: 'inst-789' })
                    .mockResolvedValueOnce({ first_name: 'John', last_name: 'Doe' });

                const mockExecute = vi.fn().mockResolvedValueOnce([{ user_id: 'other-user-1' }]);

                const mockDb = {
                    selectFrom: vi.fn().mockReturnThis(),
                    select: vi.fn().mockReturnThis(),
                    where: vi.fn().mockReturnThis(),
                    insertInto: vi.fn().mockReturnThis(),
                    values: vi.fn().mockReturnThis(),
                    executeTakeFirst: mockExecuteTakeFirst,
                    execute: mockExecute,
                } as any;

                const mockMessage = {
                    messageId: 'b3cd17f8-fb3a-4be0-80de-4ff45037d032',
                    conversationId,
                    senderId: userId,
                    content: longContent,
                    status: 'SENT',
                    createdAt: new Date(),
                };
                vi.mocked(dataLayer.createMessageData).mockResolvedValue(mockMessage as any);

                await sendMessage(mockDb, {
                    conversationId,
                    senderId: userId,
                    content: longContent,
                });

                expect(NotificationService.createNotification).toHaveBeenCalledWith({
                    dbClient: mockDb,
                    recipientUserId: 'other-user-1',
                    actorUserId: userId,
                    institutionId: 'inst-789',
                    title: 'New Message',
                    message:
                        'John Doe messaged you: "Hello, this is a very long message that should be truncat..."',
                    actionType: 'INSTITUTION_ACTIVITY_CREATED',
                    resourceType: 'INSTITUTION_ACTIVITY',
                    resourceId: conversationId,
                    resourceLabel: 'Message Thread',
                    metadata: {
                        institutionId: 'inst-789',
                        conversationId,
                        senderId: userId,
                    },
                });
            });

            it('does not roll back message if notification throws error', async () => {
                const mockExecuteTakeFirst = vi
                    .fn()
                    .mockResolvedValueOnce({ conversation_id: conversationId })
                    .mockResolvedValueOnce({ institution_id: 'inst-789' })
                    .mockResolvedValueOnce({ first_name: 'John', last_name: 'Doe' });

                const mockExecute = vi.fn().mockResolvedValueOnce([{ user_id: 'other-user-1' }]);

                const mockDb = {
                    selectFrom: vi.fn().mockReturnThis(),
                    select: vi.fn().mockReturnThis(),
                    where: vi.fn().mockReturnThis(),
                    insertInto: vi.fn().mockReturnThis(),
                    values: vi.fn().mockReturnThis(),
                    executeTakeFirst: mockExecuteTakeFirst,
                    execute: mockExecute,
                } as any;

                const mockMessage = {
                    messageId: 'b3cd17f8-fb3a-4be0-80de-4ff45037d032',
                    conversationId,
                    senderId: userId,
                    content: 'Hi',
                    status: 'SENT',
                    createdAt: new Date(),
                };
                vi.mocked(dataLayer.createMessageData).mockResolvedValue(mockMessage as any);
                vi.mocked(NotificationService.createNotification).mockRejectedValueOnce(
                    new Error('DB Error'),
                );

                const result = await sendMessage(mockDb, {
                    conversationId,
                    senderId: userId,
                    content: 'Hi',
                });

                expect(result.content).toBe('Hi');
                expect(NotificationService.createNotification).toHaveBeenCalled();
            });
        });
    });

    describe('markConversationRead', () => {
        it('should mark conversation as read if user is participant', async () => {
            // 1. Verify participant -> success
            mockDbClient.executeTakeFirst.mockResolvedValueOnce({
                conversation_id: conversationId,
            });

            const result = await markConversationRead(mockDbClient, { conversationId, userId });

            expect(dataLayer.markConversationReadData).toHaveBeenCalledWith(mockDbClient, {
                conversationId,
                userId,
            });
            expect(result.success).toBe(true);
        });

        it('should throw 403 if user is not participant', async () => {
            // 1. Verify participant -> fails
            mockDbClient.executeTakeFirst.mockResolvedValueOnce(undefined);

            await expect(
                markConversationRead(mockDbClient, { conversationId, userId }),
            ).rejects.toThrowError(
                new HTTPException(403, {
                    message: 'You are not a participant in this conversation.',
                }),
            );
        });
    });
});
