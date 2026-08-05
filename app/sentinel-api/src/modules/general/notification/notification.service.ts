import { type DbClient } from '@sentinel/db';
import { HTTPException } from 'hono/http-exception';
import type {
    AppNotificationType,
    NotificationActionType,
    NotificationListType,
    NotificationResourceType,
    NotificationStatusType,
} from '@sentinel/shared/schema';
import { createNotificationData } from './data/create-notification';
import { deleteNotificationsData } from './data/delete-notifications';
import { getNotificationsData } from './data/get-notifications';
import { markNotificationReadData } from './data/mark-notification-read';
import { markAllNotificationsReadData } from './data/mark-all-notifications-read';
import { getNotificationTableSupport } from './helper/notification-schema-compat';
import { mapNotification } from './services/map-notification';
import { LogsService } from '../logs/logs.service';

export type CreateNotificationArgs = {
    dbClient: DbClient;
    recipientUserId: string;
    actorUserId?: string | null;
    institutionId?: string | null;
    title: string;
    message: string;
    actionType: NotificationActionType;
    resourceType: NotificationResourceType;
    resourceId?: string | null;
    resourceLabel?: string | null;
    metadata?: Record<string, unknown> | null;
};

export class NotificationService {
    static async createNotification(args: CreateNotificationArgs): Promise<AppNotificationType> {
        const notificationTableSupport = await getNotificationTableSupport(args.dbClient);

        if (!notificationTableSupport.hasNotificationsTable) {
            return {
                id: '00000000-0000-0000-0000-000000000000',
                title: args.title,
                message: args.message,
                status: 'UNREAD',
                actionType: args.actionType,
                institutionId: args.institutionId ?? null,
                actor: {
                    id: args.actorUserId ?? null,
                    name: null,
                },
                resource: {
                    type: args.resourceType,
                    id: args.resourceId ?? null,
                    label: args.resourceLabel ?? null,
                },
                metadata: args.metadata ?? null,
                createdAt: new Date().toISOString(),
                readAt: null,
            };
        }

        try {
            const record = await createNotificationData(args);
            return mapNotification({
                id: record.notification_id,
                title: record.title,
                message: record.message,
                status: record.status,
                actionType: record.action_type,
                institutionId: record.institution_id,
                actorId: record.actor_user_id,
                actorName: null,
                resourceType: record.resource_type,
                resourceId: record.resource_id,
                resourceLabel: record.resource_label,
                metadata: (record.metadata as Record<string, unknown> | null) ?? null,
                createdAt: record.created_at,
                readAt: record.read_at,
            });
        } catch (error) {
            console.error('Failed to create notification:', {
                recipientUserId: args.recipientUserId,
                actorUserId: args.actorUserId ?? null,
                institutionId: args.institutionId ?? null,
                actionType: args.actionType,
                resourceType: args.resourceType,
                resourceId: args.resourceId ?? null,
                error,
            });
            throw error;
        }
    }

    static async listNotifications(args: {
        dbClient: DbClient;
        recipientUserId: string;
        institutionId?: string;
        status?: NotificationStatusType;
        limit?: number;
    }): Promise<NotificationListType> {
        const notificationTableSupport = await getNotificationTableSupport(args.dbClient);

        if (!notificationTableSupport.hasNotificationsTable) {
            return {
                items: [],
                unreadCount: 0,
            };
        }

        const result = await getNotificationsData(args);

        return {
            items: result.items.map((item) =>
                mapNotification({
                    ...item,
                    metadata: (item.metadata as Record<string, unknown> | null) ?? null,
                }),
            ),
            unreadCount: result.unreadCount,
        };
    }

    static async markNotificationRead(args: {
        dbClient: DbClient;
        notificationId: string;
        recipientUserId: string;
    }): Promise<AppNotificationType> {
        const notificationTableSupport = await getNotificationTableSupport(args.dbClient);

        if (!notificationTableSupport.hasNotificationsTable) {
            throw new HTTPException(404, {
                message: 'Notification not found.',
            });
        }

        const record = await markNotificationReadData(args);

        if (!record) {
            throw new HTTPException(404, {
                message: 'Notification not found.',
            });
        }

        let resolvedInstitutionId = record.institution_id;
        if (!resolvedInstitutionId) {
            const profile = await args.dbClient
                .selectFrom('user_profiles')
                .select(['institution_id'])
                .where('user_id', '=', args.recipientUserId)
                .executeTakeFirst();
            resolvedInstitutionId = profile?.institution_id ?? null;
        }

        if (resolvedInstitutionId) {
            try {
                await LogsService.createLog(args.dbClient, {
                    userId: args.recipientUserId,
                    action: 'notification.marked_read',
                    resourceType: 'notification',
                    resourceId: args.notificationId,
                    activeInstitutionId: resolvedInstitutionId,
                    details: {
                        notificationId: args.notificationId,
                    },
                });
            } catch (logErr) {
                console.error('Failed to log notification.marked_read:', logErr);
            }
        }

        return mapNotification({
            id: record.notification_id,
            title: record.title,
            message: record.message,
            status: record.status,
            actionType: record.action_type,
            institutionId: record.institution_id,
            actorId: record.actor_user_id,
            actorName: null,
            resourceType: record.resource_type,
            resourceId: record.resource_id,
            resourceLabel: record.resource_label,
            metadata: (record.metadata as Record<string, unknown> | null) ?? null,
            createdAt: record.created_at,
            readAt: record.read_at,
        });
    }

    static async markAllNotificationsRead(args: {
        dbClient: DbClient;
        recipientUserId: string;
    }): Promise<number> {
        const notificationTableSupport = await getNotificationTableSupport(args.dbClient);

        if (!notificationTableSupport.hasNotificationsTable) {
            return 0;
        }

        return await markAllNotificationsReadData(args);
    }

    /**
     * Delete notifications that belong to the current recipient.
     */
    static async deleteNotifications(args: {
        dbClient: DbClient;
        recipientUserId: string;
        notificationIds: string[];
    }): Promise<number> {
        const notificationTableSupport = await getNotificationTableSupport(args.dbClient);

        if (!notificationTableSupport.hasNotificationsTable) {
            return 0;
        }

        const result = await deleteNotificationsData(args);
        return result.deleted_count;
    }
}
