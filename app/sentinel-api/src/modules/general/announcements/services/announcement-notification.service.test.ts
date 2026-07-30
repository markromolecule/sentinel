import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AnnouncementNotificationService } from './announcement-notification.service';
import { NotificationService } from '../../notification/notification.service';

vi.mock('../../notification/notification.service', () => ({
    NotificationService: {
        createNotification: vi.fn(),
    },
}));

describe('AnnouncementNotificationService', () => {
    let mockDbClient: any;
    let service: AnnouncementNotificationService;

    beforeEach(() => {
        vi.clearAllMocks();
        mockDbClient = {
            selectFrom: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            execute: vi.fn(),
            executeTakeFirst: vi.fn(),
        } as any;
        service = new AnnouncementNotificationService(mockDbClient);
    });

    describe('onPublish', () => {
        it('should broadcast notifications to all users in the institution except the author', async () => {
            const announcement = {
                id: 'ann-123',
                title: 'New Policy',
                slug: 'new-policy',
                institution_id: 'inst-456',
                author_id: 'author-789',
            };

            const mockUsers = [
                { user_id: 'user-1' },
                { user_id: 'user-2' },
                { user_id: 'author-789' }, // the author
            ];

            mockDbClient.execute.mockResolvedValueOnce(mockUsers); // for users query
            mockDbClient.executeTakeFirst.mockResolvedValueOnce({
                first_name: 'Jane',
                last_name: 'Doe',
            }); // for author profile query

            vi.mocked(NotificationService.createNotification).mockResolvedValue({} as any);

            await service.onPublish(announcement);

            // Check that users query was filtered by institution
            expect(mockDbClient.selectFrom).toHaveBeenCalledWith('user_profiles');
            expect(mockDbClient.where).toHaveBeenCalledWith('institution_id', '=', 'inst-456');

            // Check that notification was sent only to user-1 and user-2 (excluding the author)
            expect(NotificationService.createNotification).toHaveBeenCalledTimes(2);
            expect(NotificationService.createNotification).toHaveBeenCalledWith(
                expect.objectContaining({
                    recipientUserId: 'user-1',
                    actorUserId: 'author-789',
                    institutionId: 'inst-456',
                    actionType: 'ANNOUNCEMENT_PUBLISHED',
                    resourceType: 'ANNOUNCEMENT',
                    resourceId: 'ann-123',
                    resourceLabel: 'New Policy',
                    title: 'New Announcement',
                    message: 'Jane Doe published: "New Policy"',
                    metadata: {
                        announcementId: 'ann-123',
                        title: 'New Policy',
                        slug: 'new-policy',
                    },
                }),
            );
        });
    });

    describe('onUpdate', () => {
        it('should broadcast update notifications if notify option is true', async () => {
            const announcement = {
                id: 'ann-123',
                title: 'New Policy Updated',
                slug: 'new-policy-updated',
                institution_id: 'inst-456',
                author_id: 'author-789',
            };

            const mockUsers = [{ user_id: 'user-1' }];

            mockDbClient.execute.mockResolvedValueOnce(mockUsers);
            mockDbClient.executeTakeFirst.mockResolvedValueOnce({
                first_name: 'Jane',
                last_name: 'Doe',
            });

            vi.mocked(NotificationService.createNotification).mockResolvedValue({} as any);

            await service.onUpdate(announcement, { notify: true });

            expect(NotificationService.createNotification).toHaveBeenCalledTimes(1);
            expect(NotificationService.createNotification).toHaveBeenCalledWith(
                expect.objectContaining({
                    recipientUserId: 'user-1',
                    actionType: 'ANNOUNCEMENT_UPDATED',
                    title: 'Announcement Updated',
                }),
            );
        });

        it('should do nothing if notify option is false/undefined', async () => {
            const announcement = {
                id: 'ann-123',
                title: 'New Policy Updated',
                slug: 'new-policy-updated',
                institution_id: 'inst-456',
                author_id: 'author-789',
            };

            await service.onUpdate(announcement);
            expect(NotificationService.createNotification).not.toHaveBeenCalled();
        });
    });
});
