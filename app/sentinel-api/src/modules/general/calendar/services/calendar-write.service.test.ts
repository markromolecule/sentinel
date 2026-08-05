import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    createCalendarEvent,
    updateCalendarEvent,
    deleteCalendarEvent,
} from './calendar-write.service';
import * as queryService from './calendar-query.service';
import * as dataLayer from '../data';
import { ActivityNotificationService } from '../../notification/services/activity-notification.service';

vi.mock('./calendar-query.service', () => ({
    getCalendarEventById: vi.fn(),
}));

vi.mock('../data', () => ({
    createCalendarEventData: vi.fn(),
    updateCalendarEventData: vi.fn(),
    deleteCalendarEventData: vi.fn(),
}));

vi.mock('../../notification/services/activity-notification.service', () => ({
    ActivityNotificationService: {
        notifyCalendarEventCreated: vi.fn(),
    },
}));

describe('calendar-write.service', () => {
    const mockDbClient = {} as any;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('createCalendarEvent', () => {
        it('delegates support-created ALL calendar events to shared notification routing', async () => {
            const payload = {
                title: 'Support Advisory',
                startDate: '2026-05-20T00:00:00Z',
                targetAudience: 'ALL',
            } as any;
            vi.mocked(dataLayer.createCalendarEventData).mockResolvedValue({
                event_id: 'event-1',
            } as any);
            vi.mocked(queryService.getCalendarEventById).mockResolvedValue({
                event_id: 'event-1',
            } as any);

            await createCalendarEvent({
                dbClient: mockDbClient,
                payload,
                userId: 'support-user',
                institutionId: 'inst-1',
            });

            expect(ActivityNotificationService.notifyCalendarEventCreated).toHaveBeenCalledWith({
                dbClient: mockDbClient,
                actorUserId: 'support-user',
                institutionId: 'inst-1',
                eventId: 'event-1',
                payload,
            });
        });

        it('delegates admin-created ALL calendar events to shared notification routing', async () => {
            const payload = {
                title: 'Admin Advisory',
                startDate: '2026-05-20T00:00:00Z',
                targetAudience: 'ALL',
            } as any;
            vi.mocked(dataLayer.createCalendarEventData).mockResolvedValue({
                event_id: 'event-2',
            } as any);
            vi.mocked(queryService.getCalendarEventById).mockResolvedValue({
                event_id: 'event-2',
            } as any);

            await createCalendarEvent({
                dbClient: mockDbClient,
                payload,
                userId: 'admin-user',
                institutionId: 'inst-1',
            });

            expect(ActivityNotificationService.notifyCalendarEventCreated).toHaveBeenCalledWith({
                dbClient: mockDbClient,
                actorUserId: 'admin-user',
                institutionId: 'inst-1',
                eventId: 'event-2',
                payload,
            });
        });

        it('delegates superadmin-created ALL calendar events to shared notification routing', async () => {
            const payload = {
                title: 'Superadmin Advisory',
                startDate: '2026-05-20T00:00:00Z',
                targetAudience: 'ALL',
            } as any;
            vi.mocked(dataLayer.createCalendarEventData).mockResolvedValue({
                event_id: 'event-3',
            } as any);
            vi.mocked(queryService.getCalendarEventById).mockResolvedValue({
                event_id: 'event-3',
            } as any);

            await createCalendarEvent({
                dbClient: mockDbClient,
                payload,
                userId: 'superadmin-user',
                institutionId: 'inst-1',
            });

            expect(ActivityNotificationService.notifyCalendarEventCreated).toHaveBeenCalledWith({
                dbClient: mockDbClient,
                actorUserId: 'superadmin-user',
                institutionId: 'inst-1',
                eventId: 'event-3',
                payload,
            });
        });

        it('delegates restricted-audience calendar events without doing local recipient filtering', async () => {
            const payload = {
                title: 'Instructor Sync',
                startDate: '2026-05-20T00:00:00Z',
                targetAudience: 'INSTRUCTORS',
            } as any;
            vi.mocked(dataLayer.createCalendarEventData).mockResolvedValue({
                event_id: 'event-4',
            } as any);
            vi.mocked(queryService.getCalendarEventById).mockResolvedValue({
                event_id: 'event-4',
            } as any);

            await createCalendarEvent({
                dbClient: mockDbClient,
                payload,
                userId: 'admin-user',
                institutionId: 'inst-1',
            });

            expect(ActivityNotificationService.notifyCalendarEventCreated).toHaveBeenCalledWith({
                dbClient: mockDbClient,
                actorUserId: 'admin-user',
                institutionId: 'inst-1',
                eventId: 'event-4',
                payload,
            });
        });

        it('passes the creator identity to shared routing so creator exclusion happens downstream', async () => {
            const payload = {
                title: 'Student Reminder',
                startDate: '2026-05-20T00:00:00Z',
                targetAudience: 'STUDENTS',
            } as any;
            vi.mocked(dataLayer.createCalendarEventData).mockResolvedValue({
                event_id: 'event-5',
            } as any);
            vi.mocked(queryService.getCalendarEventById).mockResolvedValue({
                event_id: 'event-5',
            } as any);

            await createCalendarEvent({
                dbClient: mockDbClient,
                payload,
                userId: 'creator-user',
                institutionId: 'inst-1',
            });

            expect(ActivityNotificationService.notifyCalendarEventCreated).toHaveBeenCalledWith(
                expect.objectContaining({
                    actorUserId: 'creator-user',
                }),
            );
        });

        it('persists NOTE calendar events with the authenticated creator id', async () => {
            const payload = {
                title: 'Private study note',
                startDate: '2026-05-20T08:00:00Z',
                targetAudience: 'STUDENTS',
                eventType: 'NOTE',
            } as any;
            vi.mocked(dataLayer.createCalendarEventData).mockResolvedValue({
                event_id: 'event-note-1',
            } as any);
            vi.mocked(queryService.getCalendarEventById).mockResolvedValue({
                event_id: 'event-note-1',
            } as any);

            await createCalendarEvent({
                dbClient: mockDbClient,
                payload,
                userId: 'student-user',
                institutionId: 'inst-1',
            });

            expect(dataLayer.createCalendarEventData).toHaveBeenCalledWith(mockDbClient, {
                payload,
                createdBy: 'student-user',
                institutionId: 'inst-1',
            });
        });

        it('should create an event and return fully hydrated record', async () => {
            const payload = {
                title: 'New Event',
                startDate: '2026-05-20T00:00:00Z',
                targetAudience: 'ALL',
            } as any;
            const insertResult = { event_id: 'new-id' } as any;
            const mockHydratedRecord = {
                event_id: 'new-id',
                title: 'New Event',
                created_by_name: 'John Doe',
            } as any;

            vi.mocked(dataLayer.createCalendarEventData).mockResolvedValue(insertResult);
            vi.mocked(queryService.getCalendarEventById).mockResolvedValue(mockHydratedRecord);

            const result = await createCalendarEvent({
                dbClient: mockDbClient,
                payload,
                userId: 'user-1',
                institutionId: 'inst-1',
            });

            expect(dataLayer.createCalendarEventData).toHaveBeenCalledWith(mockDbClient, {
                payload,
                createdBy: 'user-1',
                institutionId: 'inst-1',
            });
            expect(queryService.getCalendarEventById).toHaveBeenCalledWith(mockDbClient, {
                eventId: 'new-id',
                institutionId: 'inst-1',
            });
            expect(ActivityNotificationService.notifyCalendarEventCreated).toHaveBeenCalledWith({
                dbClient: mockDbClient,
                actorUserId: 'user-1',
                institutionId: 'inst-1',
                eventId: 'new-id',
                payload,
            });
            expect(result).toEqual(mockHydratedRecord);
        });

        it('should delegate notification routing through the shared activity notification service', async () => {
            const payload = {
                title: 'New Event',
                startDate: '2026-05-20T00:00:00Z',
                targetAudience: 'STUDENTS',
            } as any;
            const insertResult = { event_id: 'new-id' } as any;
            const mockHydratedRecord = {
                event_id: 'new-id',
                title: 'New Event',
                created_by_name: 'John Doe',
            } as any;

            vi.mocked(dataLayer.createCalendarEventData).mockResolvedValue(insertResult);
            vi.mocked(queryService.getCalendarEventById).mockResolvedValue(mockHydratedRecord);

            const result = await createCalendarEvent({
                dbClient: mockDbClient,
                payload,
                userId: 'user-1',
                institutionId: 'parent-inst-1',
            });

            expect(result).toEqual(mockHydratedRecord);
            expect(ActivityNotificationService.notifyCalendarEventCreated).toHaveBeenCalledTimes(1);
            expect(ActivityNotificationService.notifyCalendarEventCreated).toHaveBeenCalledWith({
                dbClient: mockDbClient,
                actorUserId: 'user-1',
                institutionId: 'parent-inst-1',
                eventId: 'new-id',
                payload,
            });
        });
    });

    describe('updateCalendarEvent', () => {
        it('should verify event existence, update it, and return updated hydrated record', async () => {
            const payload = { title: 'Updated Title' } as any;
            const originalRecord = { event_id: 'evt-1', institution_id: 'inst-1' } as any;
            const updatedRecord = {
                event_id: 'evt-1',
                title: 'Updated Title',
                created_by_name: 'John Doe',
            } as any;

            vi.mocked(queryService.getCalendarEventById)
                .mockResolvedValueOnce(originalRecord) // 1. ownership check
                .mockResolvedValueOnce(updatedRecord); // 3. hydration after update

            const result = await updateCalendarEvent({
                dbClient: mockDbClient,
                eventId: 'evt-1',
                payload,
                userId: 'user-1',
                institutionId: 'inst-1',
            });

            expect(queryService.getCalendarEventById).toHaveBeenNthCalledWith(1, mockDbClient, {
                eventId: 'evt-1',
                institutionId: 'inst-1',
            });
            expect(dataLayer.updateCalendarEventData).toHaveBeenCalledWith(mockDbClient, {
                eventId: 'evt-1',
                payload,
                updatedBy: 'user-1',
            });
            expect(queryService.getCalendarEventById).toHaveBeenNthCalledWith(2, mockDbClient, {
                eventId: 'evt-1',
                institutionId: 'inst-1',
            });
            expect(result).toEqual(updatedRecord);
        });
    });

    describe('deleteCalendarEvent', () => {
        it('should verify event existence and delete it if the user is the creator', async () => {
            const mockEvent = {
                eventId: 'evt-1',
                institutionId: 'inst-1',
                eventType: 'EVENT',
                createdBy: 'creator-user',
            } as any;
            vi.mocked(queryService.getCalendarEventById).mockResolvedValue(mockEvent);
            const mockDeleteData = vi.fn().mockResolvedValue(undefined);

            const result = await deleteCalendarEvent({
                dbClient: mockDbClient,
                eventId: 'evt-1',
                institutionId: 'inst-1',
                userId: 'creator-user',
                hasDeletePermission: true,
                dependencies: { deleteCalendarEventData: mockDeleteData },
            });

            expect(queryService.getCalendarEventById).toHaveBeenCalledWith(mockDbClient, {
                eventId: 'evt-1',
                institutionId: 'inst-1',
            });
            expect(mockDeleteData).toHaveBeenCalledWith(mockDbClient, {
                eventId: 'evt-1',
                institutionId: 'inst-1',
            });
            expect(result).toBeNull();
        });

        it('should throw a forbidden error if a user tries to delete an event they did not create', async () => {
            const mockEvent = {
                eventId: 'evt-2',
                eventType: 'ANNOUNCEMENT',
                createdBy: 'creator-user',
            } as any;
            vi.mocked(queryService.getCalendarEventById).mockResolvedValue(mockEvent);
            const mockDeleteData = vi.fn();

            await expect(
                deleteCalendarEvent({
                    dbClient: mockDbClient,
                    eventId: 'evt-2',
                    institutionId: 'inst-1',
                    userId: 'non-creator-user',
                    hasDeletePermission: true,
                    dependencies: { deleteCalendarEventData: mockDeleteData },
                }),
            ).rejects.toThrow(
                '403|Forbidden. You do not have permission to delete this calendar event as you are not the creator.',
            );

            expect(queryService.getCalendarEventById).toHaveBeenCalledWith(mockDbClient, {
                eventId: 'evt-2',
                institutionId: 'inst-1',
            });
            expect(mockDeleteData).not.toHaveBeenCalled();
        });
    });
});
