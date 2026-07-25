import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ActivityNotificationService } from './activity-notification.service';
import { NotificationService } from '../notification.service';
import { CalendarActivityNotificationService } from './activity/calendar-activity-notification.service';


type FakeBuilderResult = {
    execute?: any[];
    executeTakeFirst?: any;
};

function createFakeBuilder(result: FakeBuilderResult) {
    return {
        innerJoin() {
            return this;
        },
        leftJoin() {
            return this;
        },
        select() {
            return this;
        },
        where() {
            return this;
        },
        groupBy() {
            return this;
        },
        orderBy() {
            return this;
        },
        async execute() {
            return result.execute ?? [];
        },
        async executeTakeFirst() {
            return result.executeTakeFirst;
        },
    };
}

function createFakeDbClient(results: FakeBuilderResult[]) {
    const queue = [...results];

    return {
        selectFrom: vi.fn((table: string) => {
            if (table === 'system_settings') {
                return createFakeBuilder({
                    executeTakeFirst: {
                        setting_value: {
                            support: ['admin', 'superadmin'],
                            admin: ['support', 'superadmin', 'admin', 'instructor'],
                            superadmin: ['support', 'superadmin', 'admin', 'instructor'],
                            default: ['admin', 'superadmin'],
                        },
                    },
                });
            }

            const next = queue.shift();

            if (!next) {
                throw new Error('Unexpected selectFrom call');
            }

            return createFakeBuilder(next);
        }),
    } as any;
}

describe('ActivityNotificationService', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        vi.spyOn(NotificationService, 'createNotification').mockResolvedValue({} as any);
        vi.spyOn(CalendarActivityNotificationService, 'notifyCalendarEventCreated').mockResolvedValue(undefined as any);
    });

    it('notifies institution approvers for a new subject enrollment request', async () => {
        const dbClient = createFakeDbClient([
            {
                executeTakeFirst: {
                    name: 'Jamie Instructor',
                },
            },
            {
                executeTakeFirst: {
                    parent_institution_id: null,
                },
            },
            {
                execute: [
                    {
                        userId: 'approver-1',
                        name: 'Admin One',
                    },
                    {
                        userId: 'approver-2',
                        name: 'Admin Two',
                    },
                ],
            },
        ]);

        await ActivityNotificationService.notifySubjectEnrollmentRequestSubmitted({
            dbClient,
            actorUserId: 'instructor-1',
            institutionId: 'institution-1',
            subjectOfferingId: 'offering-1',
            subjectLabel: 'CS101 - Intro to Computing',
            requestIds: ['request-1', 'request-2'],
            requestCount: 2,
        });

        expect(NotificationService.createNotification).toHaveBeenCalledTimes(2);
        expect(NotificationService.createNotification).toHaveBeenNthCalledWith(1, {
            dbClient,
            recipientUserId: 'approver-1',
            actorUserId: 'instructor-1',
            institutionId: 'institution-1',
            title: 'New subject enrollment request',
            message:
                'Jamie Instructor submitted a subject enrollment request for "CS101 - Intro to Computing" (2 sections).',
            actionType: 'SUBJECT_ENROLLMENT_REQUEST_SUBMITTED',
            resourceType: 'SUBJECT_ENROLLMENT_REQUEST',
            resourceId: 'offering-1',
            resourceLabel: 'CS101 - Intro to Computing',
            metadata: {
                requestIds: ['request-1', 'request-2'],
                requestCount: 2,
                subjectOfferingId: 'offering-1',
            },
        });
    });

    it('builds one aggregate approval notification per grouped request context', async () => {
        const dbClient = createFakeDbClient([
            {
                executeTakeFirst: {
                    name: 'Morgan Admin',
                },
            },
            {
                execute: [
                    {
                        requesterUserId: 'instructor-1',
                        subjectOfferingId: 'offering-1',
                        institutionId: 'institution-1',
                        subjectCode: 'CS101',
                        subjectTitle: 'Intro to Computing',
                        requesterName: 'Jamie Instructor',
                        requestCount: 2,
                        requestIds: ['request-1', 'request-2'],
                    },
                ],
            },
        ]);

        await ActivityNotificationService.notifySubjectEnrollmentRequestApproved({
            dbClient,
            actorUserId: 'admin-1',
            requestIds: ['request-1', 'request-2'],
        });

        expect(NotificationService.createNotification).toHaveBeenCalledTimes(1);
        expect(NotificationService.createNotification).toHaveBeenCalledWith({
            dbClient,
            recipientUserId: 'instructor-1',
            actorUserId: 'admin-1',
            institutionId: 'institution-1',
            title: 'Subject enrollment request approved',
            message:
                'Morgan Admin approved your subject enrollment request for "CS101 - Intro to Computing" (2 sections).',
            actionType: 'SUBJECT_ENROLLMENT_REQUEST_APPROVED',
            resourceType: 'SUBJECT_ENROLLMENT_REQUEST',
            resourceId: 'offering-1',
            resourceLabel: 'CS101 - Intro to Computing',
            metadata: {
                requestIds: ['request-1', 'request-2'],
                requestCount: 2,
                subjectOfferingId: 'offering-1',
            },
        });
    });

    it('builds one aggregate rejection notification per grouped request context', async () => {
        const dbClient = createFakeDbClient([
            {
                executeTakeFirst: {
                    name: 'Morgan Admin',
                },
            },
            {
                execute: [
                    {
                        requesterUserId: 'instructor-1',
                        subjectOfferingId: 'offering-1',
                        institutionId: 'institution-1',
                        subjectCode: 'CS101',
                        subjectTitle: 'Intro to Computing',
                        requesterName: 'Jamie Instructor',
                        requestCount: 1,
                        requestIds: ['request-3'],
                    },
                ],
            },
        ]);

        await ActivityNotificationService.notifySubjectEnrollmentRequestRejected({
            dbClient,
            actorUserId: 'admin-1',
            requestIds: ['request-3'],
        });

        expect(NotificationService.createNotification).toHaveBeenCalledTimes(1);
        expect(NotificationService.createNotification).toHaveBeenCalledWith({
            dbClient,
            recipientUserId: 'instructor-1',
            actorUserId: 'admin-1',
            institutionId: 'institution-1',
            title: 'Subject enrollment request rejected',
            message:
                'Morgan Admin rejected your subject enrollment request for "CS101 - Intro to Computing" (1 section).',
            actionType: 'SUBJECT_ENROLLMENT_REQUEST_REJECTED',
            resourceType: 'SUBJECT_ENROLLMENT_REQUEST',
            resourceId: 'offering-1',
            resourceLabel: 'CS101 - Intro to Computing',
            metadata: {
                requestIds: ['request-3'],
                requestCount: 1,
                subjectOfferingId: 'offering-1',
            },
        });
    });

    it('fans out section activity notifications to institution admins and superadmins', async () => {
        const dbClient = createFakeDbClient([
            {
                executeTakeFirst: {
                    name: 'Morgan Admin',
                },
            },
            {
                execute: [{ roleName: 'admin' }],
            },
            {
                executeTakeFirst: {
                    parent_institution_id: null,
                },
            },
            {
                execute: [
                    {
                        userId: 'support-1',
                        name: 'Support One',
                    },
                    {
                        userId: 'instructor-1',
                        name: 'Instructor One',
                    },
                ],
            },
        ]);

        await ActivityNotificationService.notifySectionCreated({
            dbClient,
            actorUserId: 'admin-1',
            institutionId: 'institution-1',
            sectionId: 'section-1',
            sectionLabel: 'BSCS 3A',
        });

        expect(NotificationService.createNotification).toHaveBeenCalledTimes(2);
        expect(NotificationService.createNotification).toHaveBeenNthCalledWith(1, {
            dbClient,
            recipientUserId: 'support-1',
            actorUserId: 'admin-1',
            institutionId: 'institution-1',
            title: 'Section created',
            message: 'Morgan Admin created section "BSCS 3A".',
            actionType: 'SECTION_CREATED',
            resourceType: 'SECTION',
            resourceId: 'section-1',
            resourceLabel: 'BSCS 3A',
            metadata: {
                sectionId: 'section-1',
                actorRole: 'admin',
                institutionLevel: 'BRANCH_INSTITUTION',
                targetType: 'SECTION',
                operation: 'CREATED',
                isAdminOverride: false,
                sourceModule: 'sections',
                sourceAction: 'create',
                occurredAt: expect.any(String),
            },
        });
    });

    it('fans out support institution operations to admin and superadmin recipients only', async () => {
        const dbClient = createFakeDbClient([
            {
                executeTakeFirst: {
                    name: 'Support User',
                },
            },
            {
                execute: [{ roleName: 'support' }],
            },
            {
                executeTakeFirst: {
                    parent_institution_id: null,
                },
            },
            {
                execute: [
                    {
                        userId: 'superadmin-1',
                        name: 'Super Admin',
                    },
                    {
                        userId: 'admin-2',
                        name: 'Admin Two',
                    },
                ],
            },
        ]);

        await ActivityNotificationService.notifySupportInstitutionOperationCompleted({
            dbClient,
            actorUserId: 'support-1',
            institutionId: 'institution-1',
            institutionRecordId: 'institution-1',
            institutionLabel: 'Sentinel University',
            operation: 'UPDATED',
        });

        expect(NotificationService.createNotification).toHaveBeenCalledTimes(2);
        expect(NotificationService.createNotification).toHaveBeenNthCalledWith(1, {
            dbClient,
            recipientUserId: 'superadmin-1',
            actorUserId: 'support-1',
            institutionId: 'institution-1',
            title: 'Support operation completed',
            message: 'Support User updated institution "Sentinel University".',
            actionType: 'SUPPORT_OPERATION_COMPLETED',
            resourceType: 'SUPPORT_OPERATION',
            resourceId: 'institution-1',
            resourceLabel: 'Sentinel University',
            metadata: {
                operation: 'UPDATED',
                targetType: 'INSTITUTION',
                institutionId: 'institution-1',
                actorRole: 'support',
                institutionLevel: 'PARENT_INSTITUTION',
                isAdminOverride: false,
                sourceModule: 'institutions',
                sourceAction: 'updated',
                occurredAt: expect.any(String),
            },
        });
    });

    it('forces recipient roles to admin and superadmin when isAdminOverride is true', async () => {
        const dbClient = createFakeDbClient([
            {
                executeTakeFirst: {
                    roleName: 'admin',
                },
            },
            {
                executeTakeFirst: {
                    parent_institution_id: null,
                },
            },
            {
                execute: [
                    {
                        userId: 'superadmin-1',
                        name: 'Super Admin',
                    },
                    {
                        userId: 'admin-2',
                        name: 'Admin Two',
                    },
                ],
            },
        ]);

        await ActivityNotificationService.notifyGenericInstitutionActivity({
            dbClient,
            actorUserId: 'admin-1',
            institutionId: 'institution-1',
            operation: 'OVERRIDE_COMPLETED',
            targetType: 'COURSE',
            targetId: 'course-1',
            targetLabel: 'CS101',
            title: 'Course override applied',
            message: 'A course override was applied.',
            sourceModule: 'courses',
            sourceAction: 'hide-inherited',
            isAdminOverride: true,
        });

        expect(NotificationService.createNotification).toHaveBeenCalledTimes(2);
        expect(NotificationService.createNotification).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({
                recipientUserId: 'superadmin-1',
                metadata: expect.objectContaining({
                    isAdminOverride: true,
                    institutionLevel: 'ADMIN_OVERRIDE',
                }),
            }),
        );
    });

    it('notifies support, superadmin, admin, and instructor when an admin performs a generic activity without override', async () => {
        const dbClient = createFakeDbClient([
            {
                executeTakeFirst: {
                    roleName: 'admin',
                },
            },
            {
                executeTakeFirst: {
                    parent_institution_id: null,
                },
            },
            {
                execute: [
                    {
                        userId: 'support-1',
                        name: 'Support User',
                    },
                    {
                        userId: 'superadmin-1',
                        name: 'Super Admin User',
                    },
                    {
                        userId: 'admin-2',
                        name: 'Admin Colleague',
                    },
                    {
                        userId: 'instructor-1',
                        name: 'Instructor User',
                    },
                ],
            },
        ]);

        await ActivityNotificationService.notifyGenericInstitutionActivity({
            dbClient,
            actorUserId: 'admin-1',
            institutionId: 'institution-1',
            operation: 'CREATED',
            targetType: 'DEPARTMENT',
            targetId: 'dept-1',
            targetLabel: 'Computer Science',
            title: 'Department created',
            message: 'A department was created.',
            sourceModule: 'departments',
            sourceAction: 'create',
            isAdminOverride: false,
        });

        expect(NotificationService.createNotification).toHaveBeenCalledTimes(4);
        expect(NotificationService.createNotification).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({
                recipientUserId: 'support-1',
            }),
        );
        expect(NotificationService.createNotification).toHaveBeenNthCalledWith(
            2,
            expect.objectContaining({
                recipientUserId: 'superadmin-1',
            }),
        );
        expect(NotificationService.createNotification).toHaveBeenNthCalledWith(
            3,
            expect.objectContaining({
                recipientUserId: 'admin-2',
            }),
        );
        expect(NotificationService.createNotification).toHaveBeenNthCalledWith(
            4,
            expect.objectContaining({
                recipientUserId: 'instructor-1',
            }),
        );
    });

    it('delegates calendar event notifications to the calendar activity notification service', async () => {
        const dbClient = {} as any;
        const payload = {
            title: 'Calendar Event',
            eventType: 'EVENT',
            targetAudience: 'ALL',
            startDate: '2026-05-21T00:00:00.000Z',
        } as const;

        await ActivityNotificationService.notifyCalendarEventCreated({
            dbClient,
            actorUserId: 'admin-1',
            institutionId: 'institution-1',
            eventId: 'event-1',
            payload,
        });

        expect(CalendarActivityNotificationService.notifyCalendarEventCreated).toHaveBeenCalledWith(
            {
                dbClient,
                actorUserId: 'admin-1',
                institutionId: 'institution-1',
                eventId: 'event-1',
                payload,
            },
        );
    });

    it('successfully triggers notifyInstitutionActivityCreated', async () => {
        const dbClient = createFakeDbClient([
            { execute: [{ roleName: 'admin' }] },
            { executeTakeFirst: { parent_institution_id: null } },
            { execute: [{ userId: 'support-1', name: 'Support' }] },
        ]);

        await ActivityNotificationService.notifyInstitutionActivityCreated({
            dbClient,
            actorUserId: 'admin-1',
            institutionId: 'institution-1',
            targetType: 'DEPARTMENT',
            targetId: 'dept-1',
            targetLabel: 'CS',
            title: 'Department created',
            message: 'Morgan Admin created CS department',
            sourceModule: 'departments',
            sourceAction: 'create',
        });

        expect(NotificationService.createNotification).toHaveBeenCalledTimes(1);
        expect(NotificationService.createNotification).toHaveBeenCalledWith(
            expect.objectContaining({
                title: 'Department created',
                actionType: 'INSTITUTION_ACTIVITY_CREATED',
                resourceType: 'INSTITUTION_ACTIVITY',
                resourceId: 'dept-1',
                resourceLabel: 'CS',
            }),
        );
    });

    it('successfully triggers notifyInstitutionActivityUpdated', async () => {
        const dbClient = createFakeDbClient([
            { execute: [{ roleName: 'admin' }] },
            { executeTakeFirst: { parent_institution_id: null } },
            { execute: [{ userId: 'support-1', name: 'Support' }] },
        ]);

        await ActivityNotificationService.notifyInstitutionActivityUpdated({
            dbClient,
            actorUserId: 'admin-1',
            institutionId: 'institution-1',
            targetType: 'DEPARTMENT',
            targetId: 'dept-1',
            targetLabel: 'CS',
            title: 'Department updated',
            message: 'Morgan Admin updated CS department',
            sourceModule: 'departments',
            sourceAction: 'update',
        });

        expect(NotificationService.createNotification).toHaveBeenCalledTimes(1);
        expect(NotificationService.createNotification).toHaveBeenCalledWith(
            expect.objectContaining({
                title: 'Department updated',
                actionType: 'INSTITUTION_ACTIVITY_UPDATED',
                resourceType: 'INSTITUTION_ACTIVITY',
            }),
        );
    });

    it('successfully triggers notifyInstitutionActivityDeleted', async () => {
        const dbClient = createFakeDbClient([
            { execute: [{ roleName: 'admin' }] },
            { executeTakeFirst: { parent_institution_id: null } },
            { execute: [{ userId: 'support-1', name: 'Support' }] },
        ]);

        await ActivityNotificationService.notifyInstitutionActivityDeleted({
            dbClient,
            actorUserId: 'admin-1',
            institutionId: 'institution-1',
            targetType: 'DEPARTMENT',
            targetId: 'dept-1',
            targetLabel: 'CS',
            title: 'Department deleted',
            message: 'Morgan Admin deleted CS department',
            sourceModule: 'departments',
            sourceAction: 'delete',
        });

        expect(NotificationService.createNotification).toHaveBeenCalledTimes(1);
        expect(NotificationService.createNotification).toHaveBeenCalledWith(
            expect.objectContaining({
                title: 'Department deleted',
                actionType: 'INSTITUTION_ACTIVITY_DELETED',
                resourceType: 'INSTITUTION_ACTIVITY',
            }),
        );
    });

    it('successfully triggers notifyInstitutionActivityTransaction', async () => {
        const dbClient = createFakeDbClient([
            { execute: [{ roleName: 'admin' }] },
            { executeTakeFirst: { parent_institution_id: null } },
            { execute: [{ userId: 'support-1', name: 'Support' }] },
        ]);

        await ActivityNotificationService.notifyInstitutionActivityTransaction({
            dbClient,
            actorUserId: 'admin-1',
            institutionId: 'institution-1',
            targetType: 'DEPOSIT',
            targetId: 'dep-1',
            targetLabel: 'Tuition Payment',
            title: 'Transaction completed',
            message: 'Morgan Admin completed deposit transaction',
            sourceModule: 'billing',
            sourceAction: 'deposit',
        });

        expect(NotificationService.createNotification).toHaveBeenCalledTimes(1);
        expect(NotificationService.createNotification).toHaveBeenCalledWith(
            expect.objectContaining({
                title: 'Transaction completed',
                actionType: 'INSTITUTION_ACTIVITY_TRANSACTION_COMPLETED',
                resourceType: 'INSTITUTION_ACTIVITY',
            }),
        );
    });

    it('successfully triggers notifyInstitutionActivityOverride', async () => {
        const dbClient = createFakeDbClient([
            { executeTakeFirst: { roleName: 'admin' } },
            { executeTakeFirst: { parent_institution_id: null } },
            { execute: [{ userId: 'superadmin-1', name: 'Super Admin' }] },
        ]);

        await ActivityNotificationService.notifyInstitutionActivityOverride({
            dbClient,
            actorUserId: 'admin-1',
            institutionId: 'institution-1',
            targetType: 'SYSTEM_SETTINGS',
            targetId: 'setting-1',
            targetLabel: 'Maintenance Mode',
            title: 'System setting override',
            message: 'Morgan Admin enabled maintenance override',
            sourceModule: 'security',
            sourceAction: 'override',
        });

        expect(NotificationService.createNotification).toHaveBeenCalledTimes(1);
        expect(NotificationService.createNotification).toHaveBeenCalledWith(
            expect.objectContaining({
                title: 'System setting override',
                actionType: 'INSTITUTION_ACTIVITY_OVERRIDE_COMPLETED',
                resourceType: 'INSTITUTION_ACTIVITY',
                metadata: expect.objectContaining({
                    isAdminOverride: true,
                    institutionLevel: 'ADMIN_OVERRIDE',
                }),
            }),
        );
    });
});
