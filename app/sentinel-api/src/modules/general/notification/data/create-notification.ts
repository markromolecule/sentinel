import { type DbClient } from '@sentinel/db';
import type { NotificationActionType, NotificationResourceType } from '@sentinel/shared/schema';
import { resolveNotificationActorUserId } from './resolve-notification-actor-user-id';

export type CreateNotificationDataArgs = {
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

export async function createNotificationData(args: CreateNotificationDataArgs) {
    const {
        dbClient,
        recipientUserId,
        actorUserId,
        institutionId,
        title,
        message,
        actionType,
        resourceType,
        resourceId,
        resourceLabel,
        metadata,
    } = args;

    const isValidUuid = resourceId
        ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resourceId)
        : false;
    const dbResourceId = isValidUuid ? resourceId : null;
    const finalMetadata =
        !isValidUuid && resourceId
            ? { ...(metadata ?? {}), originalResourceId: resourceId }
            : metadata;
    const resolvedActorUserId = await resolveNotificationActorUserId(dbClient, actorUserId);

    return await dbClient
        .insertInto('notifications')
        .values({
            recipient_user_id: recipientUserId,
            actor_user_id: resolvedActorUserId,
            institution_id: institutionId ?? null,
            title,
            message,
            action_type: actionType,
            resource_type: resourceType,
            resource_id: dbResourceId,
            resource_label: resourceLabel ?? null,
            metadata: finalMetadata ?? null,
            updated_at: new Date(),
        })
        .returningAll()
        .executeTakeFirstOrThrow();
}
