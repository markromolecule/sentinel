import { type DbClient } from '@sentinel/db';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolves a notification actor to a live application user id.
 *
 * Notification actor columns reference the application users table. We only
 * persist the actor when the id is a valid UUID and the referenced user still
 * exists; otherwise we fall back to null to keep notification writes from
 * failing on stale or system actor ids.
 */
export async function resolveNotificationActorUserId(
    dbClient: DbClient,
    actorUserId?: string | null,
): Promise<string | null> {
    if (!actorUserId || !UUID_PATTERN.test(actorUserId)) {
        return null;
    }

    const actor = await dbClient
        .selectFrom('auth.users')
        .select('id')
        .where('id', '=', actorUserId)
        .executeTakeFirst();

    return actor?.id ?? null;
}
