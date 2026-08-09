import { describe, expect, it } from 'vitest';
import { getUnreadNotificationsCount } from './notification-helpers';
import type { AppNotification } from '@sentinel/shared/types';

describe('getUnreadNotificationsCount utility', () => {
    it('returns 0 for empty or null notifications', () => {
        expect(getUnreadNotificationsCount(null)).toBe(0);
        expect(getUnreadNotificationsCount(undefined)).toBe(0);
        expect(getUnreadNotificationsCount([])).toBe(0);
    });

    it('correctly filters and counts unread notifications', () => {
        const notifications: AppNotification[] = [
            {
                id: '1',
                title: 'Exam Created',
                message: 'Math Exam is scheduled',
                status: 'UNREAD',
                actionType: 'EXAM_ASSIGNMENT_CREATED',
                institutionId: null,
                actor: { id: null, name: null },
                resource: { type: 'EXAM_ASSIGNMENT', id: null, label: null },
                createdAt: new Date().toISOString(),
                readAt: null,
            },
            {
                id: '2',
                title: 'Announcement',
                message: 'Class is suspended',
                status: 'READ',
                actionType: 'ANNOUNCEMENT_PUBLISHED',
                institutionId: null,
                actor: { id: null, name: null },
                resource: { type: 'ANNOUNCEMENT', id: null, label: null },
                createdAt: new Date().toISOString(),
                readAt: new Date().toISOString(),
            },
            {
                id: '3',
                title: 'Exam Assigned',
                message: 'Physics Exam is assigned',
                status: 'UNREAD',
                actionType: 'EXAM_ASSIGNMENT_CREATED',
                institutionId: null,
                actor: { id: null, name: null },
                resource: { type: 'EXAM_ASSIGNMENT', id: null, label: null },
                createdAt: new Date().toISOString(),
                readAt: null,
            },
        ];

        expect(getUnreadNotificationsCount(notifications)).toBe(2);
    });
});
