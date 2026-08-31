import { type DbClient } from '@sentinel/db';
import { HTTPException } from 'hono/http-exception';

/**
 * Enforce Option A validation rules based on caller's identity roles.
 */
export async function validateOptionABoundaries(
    dbClient: DbClient,
    actorUserId: string,
    domainScope: string[],
    isCreatingSystemRole: boolean = false,
) {
    // Find all roles of the actor
    const callerRoles = await dbClient
        .selectFrom('user_roles')
        .innerJoin('roles', 'roles.role_id', 'user_roles.role_id')
        .select('roles.slug')
        .where('user_roles.user_id', '=', actorUserId)
        .execute();

    const slugs = callerRoles.map((r) => r.slug).filter(Boolean) as string[];

    const isSupport = slugs.includes('support') || slugs.includes('superadmin');

    if (!isSupport) {
        // Under Option A, standard admins can only manage roles with 'app' domain scope
        const hasForbiddenScope = domainScope.some((scope) => scope !== 'app');
        if (hasForbiddenScope) {
            throw new HTTPException(403, {
                message:
                    'Administrators are only allowed to manage roles within the app domain scope.',
            });
        }

        if (isCreatingSystemRole) {
            throw new HTTPException(403, {
                message: 'Administrators cannot create or modify system-level roles.',
            });
        }
    }
}
