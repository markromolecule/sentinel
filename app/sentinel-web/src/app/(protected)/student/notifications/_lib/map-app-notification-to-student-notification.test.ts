import { describe, expect, it } from 'vitest';
import {
    mapAppNotificationToStudentNotification,
    resolveStudentNotificationHref,
} from './map-app-notification-to-student-notification';
import type { AppNotification } from '@sentinel/services';

function buildAppNotification(overrides?: Partial<AppNotification>): AppNotification {
    return {
        id: '123',
        title: 'Test Notification',
        message: 'This is a test notification.',
        status: 'UNREAD',
        actionType: 'ANNOUNCEMENT_CREATED',
        institutionId: 'inst-123',
        actor: {
            id: 'actor-123',
            name: 'Actor Name',
        },
        resource: {
            type: 'ANNOUNCEMENT',
            id: 'ann-123',
            label: 'Announcement Label',
        },
        metadata: null,
        createdAt: '2026-07-25T12:00:00.000Z',
        readAt: null,
        ...overrides,
    };
}

describe('resolveStudentNotificationHref', () => {
    it('returns undefined when resource is missing', () => {
        const notification = buildAppNotification({ resource: undefined as any });
        expect(resolveStudentNotificationHref(notification)).toBeUndefined();
    });

    it('resolves ANNOUNCEMENT to classroom', () => {
        const notification = buildAppNotification({
            resource: { type: 'ANNOUNCEMENT', id: 'ann-123', label: 'Ann' },
        });
        expect(resolveStudentNotificationHref(notification)).toBe('/student/classroom');
    });

    it('resolves INSTITUTION_ACTIVITY with conversationId to message page', () => {
        const notification = buildAppNotification({
            resource: { type: 'INSTITUTION_ACTIVITY', id: 'conv-123', label: 'Msg' },
            metadata: { conversationId: 'conv-123' },
        });
        expect(resolveStudentNotificationHref(notification)).toBe(
            '/student/message?conversationId=conv-123',
        );
    });

    it('resolves INSTITUTION_ACTIVITY with calendarEventId to calendar page', () => {
        const notification = buildAppNotification({
            resource: { type: 'INSTITUTION_ACTIVITY', id: 'cal-123', label: 'Cal' },
            metadata: { calendarEventId: 'cal-123' },
        });
        expect(resolveStudentNotificationHref(notification)).toBe('/student/calendar');
    });

    it('resolves INSTITUTION_ACTIVITY with eventType to calendar page', () => {
        const notification = buildAppNotification({
            resource: { type: 'INSTITUTION_ACTIVITY', id: 'cal-123', label: 'Cal' },
            metadata: { eventType: 'EVENT' },
        });
        expect(resolveStudentNotificationHref(notification)).toBe('/student/calendar');
    });

    it('resolves EXAM_ASSIGNMENT to exam instruction page', () => {
        const notification = buildAppNotification({
            resource: { type: 'EXAM_ASSIGNMENT', id: 'exam-123', label: 'Exam' },
        });
        expect(resolveStudentNotificationHref(notification)).toBe(
            '/student/exam/exam-123/instruction',
        );
    });

    it('resolves INSTRUCTOR_SUBJECT_REQUEST to history page', () => {
        const notification = buildAppNotification({
            resource: { type: 'INSTRUCTOR_SUBJECT_REQUEST', id: 'req-123', label: 'Request' },
        });
        expect(resolveStudentNotificationHref(notification)).toBe('/student/history');
    });

    it('returns undefined for unsupported resource types', () => {
        const notification = buildAppNotification({
            resource: { type: 'UNKNOWN_TYPE' as any, id: '123', label: 'Unknown' },
        });
        expect(resolveStudentNotificationHref(notification)).toBeUndefined();
    });
});

describe('mapAppNotificationToStudentNotification', () => {
    it('maps AppNotification to UI Notification model', () => {
        const appNotification = buildAppNotification({
            id: 'n-123',
            title: 'Welcome',
            message: 'Hello Student',
            status: 'READ',
            actionType: 'EXAM_ATTEMPT_SUBMITTED',
            createdAt: '2026-07-25T10:00:00.000Z',
            resource: { type: 'EXAM_ASSIGNMENT', id: 'exam-456', label: 'Exam' },
        });

        const mapped = mapAppNotificationToStudentNotification(appNotification);

        expect(mapped).toEqual({
            id: 'n-123',
            title: 'Welcome',
            message: 'Hello Student',
            type: 'exam',
            priority: 'low',
            isRead: true,
            date: new Date('2026-07-25T10:00:00.000Z'),
            link: '/student/exam/exam-456/instruction',
        });
    });
});
