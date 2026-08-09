import type { AppNotification } from '@sentinel/shared/types';

/**
 * Calculates the total number of unread notifications.
 *
 * @param notifications Array of app notifications.
 */
export function getUnreadNotificationsCount(notifications?: AppNotification[] | null): number {
    if (!notifications) return 0;
    return notifications.filter((n) => n.status === 'UNREAD').length;
}
