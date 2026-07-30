import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    CalendarActivityNotificationService,
    mapCalendarAudienceToRecipientRoles,
} from './calendar-activity-notification.service';
import * as activityBaseService from './activity-notification-base.service';

describe('CalendarActivityNotificationService', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    describe('mapCalendarAudienceToRecipientRoles', () => {
        it('excludes support recipients for support-created ALL events', () => {
            expect(
                mapCalendarAudienceToRecipientRoles({
                    targetAudience: 'ALL',
                    actorRole: 'support',
                }),
            ).toEqual(['student', 'instructor', 'admin', 'superadmin']);
        });

        it('includes support recipients for admin-created ALL events', () => {
            expect(
                mapCalendarAudienceToRecipientRoles({
                    targetAudience: 'ALL',
                    actorRole: 'admin',
                }),
            ).toEqual(['student', 'instructor', 'admin', 'superadmin', 'support']);
        });

        it('includes support recipients for superadmin-created ALL events', () => {
            expect(
                mapCalendarAudienceToRecipientRoles({
                    targetAudience: 'ALL',
                    actorRole: 'superadmin',
                }),
            ).toEqual(['student', 'instructor', 'admin', 'superadmin', 'support']);
        });

        it('limits ADMINS audience to admin and superadmin recipients', () => {
            expect(
                mapCalendarAudienceToRecipientRoles({
                    targetAudience: 'ADMINS',
                    actorRole: 'admin',
                }),
            ).toEqual(['admin', 'superadmin']);
        });

        it('limits STUDENTS audience to student recipients only', () => {
            expect(
                mapCalendarAudienceToRecipientRoles({
                    targetAudience: 'STUDENTS',
                    actorRole: 'admin',
                }),
            ).toEqual(['student']);
        });

        it('limits INSTRUCTORS audience to instructor recipients only', () => {
            expect(
                mapCalendarAudienceToRecipientRoles({
                    targetAudience: 'INSTRUCTORS',
                    actorRole: 'superadmin',
                }),
            ).toEqual(['instructor']);
        });

        it('returns no recipients for SPECIFIC_GROUP until group targeting is supported', () => {
            expect(
                mapCalendarAudienceToRecipientRoles({
                    targetAudience: 'SPECIFIC_GROUP',
                    actorRole: 'admin',
                }),
            ).toEqual([]);
        });
    });

    describe('notifyCalendarEventCreated', () => {
        it('routes calendar event creation through shared institution activity notifications', async () => {
            const dbClient = {} as any;
            vi.spyOn(activityBaseService, 'getUserDisplayName').mockResolvedValue('Morgan Admin');
            vi.spyOn(activityBaseService, 'getUserPrimaryRole').mockResolvedValue('admin');
            vi.spyOn(activityBaseService, 'notifyInstitutionActivity').mockResolvedValue(
                undefined as any,
            );

            await CalendarActivityNotificationService.notifyCalendarEventCreated({
                dbClient,
                actorUserId: 'admin-1',
                institutionId: 'institution-1',
                eventId: 'event-1',
                payload: {
                    title: 'Enrollment Window',
                    description: 'Enrollment opens tomorrow.',
                    eventType: 'ANNOUNCEMENT',
                    targetAudience: 'ALL',
                    startDate: '2026-05-21T00:00:00.000Z',
                },
            });

            expect(activityBaseService.notifyInstitutionActivity).toHaveBeenCalledWith({
                dbClient,
                actorUserId: 'admin-1',
                institutionId: 'institution-1',
                permissionKey: 'notifications:view',
                actionType: 'INSTITUTION_ACTIVITY_CREATED',
                resourceType: 'INSTITUTION_ACTIVITY',
                resourceId: 'event-1',
                resourceLabel: 'Enrollment Window',
                roleNames: ['student', 'instructor', 'admin', 'superadmin', 'support'],
                metadata: {
                    eventType: 'ANNOUNCEMENT',
                    targetAudience: 'ALL',
                    calendarEventId: 'event-1',
                },
                title: 'New Calendar Event: Enrollment Window',
                message: 'Enrollment opens tomorrow.',
                sourceModule: 'calendar',
                sourceAction: 'create',
                targetType: 'CALENDAR_EVENT',
                operation: 'CREATED',
                includeChildInstitutions: true,
            });
        });

        it('routes instructor-only events with narrowed recipient roles', async () => {
            const dbClient = {} as any;
            vi.spyOn(activityBaseService, 'getUserDisplayName').mockResolvedValue('Morgan Admin');
            vi.spyOn(activityBaseService, 'getUserPrimaryRole').mockResolvedValue('admin');
            vi.spyOn(activityBaseService, 'notifyInstitutionActivity').mockResolvedValue(
                undefined as any,
            );

            await CalendarActivityNotificationService.notifyCalendarEventCreated({
                dbClient,
                actorUserId: 'admin-1',
                institutionId: 'institution-1',
                eventId: 'event-3',
                payload: {
                    title: 'Faculty Sync',
                    description: 'Instructor-only sync.',
                    eventType: 'EVENT',
                    targetAudience: 'INSTRUCTORS',
                    startDate: '2026-05-21T00:00:00.000Z',
                },
            });

            expect(activityBaseService.notifyInstitutionActivity).toHaveBeenCalledWith(
                expect.objectContaining({
                    actorUserId: 'admin-1',
                    institutionId: 'institution-1',
                    actionType: 'INSTITUTION_ACTIVITY_CREATED',
                    resourceType: 'INSTITUTION_ACTIVITY',
                    roleNames: ['instructor'],
                    metadata: expect.objectContaining({
                        targetAudience: 'INSTRUCTORS',
                    }),
                }),
            );
        });

        it('skips notification fan-out for SPECIFIC_GROUP until group resolution exists', async () => {
            const dbClient = {} as any;
            vi.spyOn(activityBaseService, 'getUserDisplayName').mockResolvedValue('Morgan Admin');
            vi.spyOn(activityBaseService, 'getUserPrimaryRole').mockResolvedValue('admin');
            vi.spyOn(activityBaseService, 'notifyInstitutionActivity').mockResolvedValue(
                undefined as any,
            );

            await CalendarActivityNotificationService.notifyCalendarEventCreated({
                dbClient,
                actorUserId: 'admin-1',
                institutionId: 'institution-1',
                eventId: 'event-2',
                payload: {
                    title: 'Targeted Review',
                    description: 'Small cohort review session.',
                    eventType: 'EVENT',
                    targetAudience: 'SPECIFIC_GROUP',
                    startDate: '2026-05-21T00:00:00.000Z',
                },
            });

            expect(activityBaseService.notifyInstitutionActivity).not.toHaveBeenCalled();
        });
    });
});
