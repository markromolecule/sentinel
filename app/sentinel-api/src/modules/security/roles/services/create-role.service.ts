import { type DbClient } from '@sentinel/db';
import { HTTPException } from 'hono/http-exception';
import type { AccessControlRoleInput } from '@sentinel/shared/types';
import { RolesRepository } from '../roles.repository';
import { validateOptionABoundaries } from './validate-role-boundaries.service';
import { readRoles } from './get-roles.service';
import { ActivityNotificationService } from '../../../general/notification/services/activity-notification.service';
import { normalizeRoleName } from './utils';

/**
 * Creates a new custom role with standard dynamic properties, ensuring Option A constraints.
 */
export async function createRole(
    dbClient: DbClient,
    payload: AccessControlRoleInput,
    actorUserId?: string,
    institutionId?: string,
) {
    const roleName = normalizeRoleName(payload.name);
    const derivedSlug = payload.slug
        ? normalizeRoleName(payload.slug)
        : normalizeRoleName(payload.name);

    // Check dynamic slug collisions
    const existing = await RolesRepository.findRoleBySlug(dbClient, derivedSlug);
    if (existing) {
        throw new HTTPException(400, {
            message: `A role with slug "${derivedSlug}" already exists.`,
        });
    }

    // Validate Option A limits if caller is specified
    if (actorUserId) {
        await validateOptionABoundaries(dbClient, actorUserId, payload.domainScope);
    }

    const created = await RolesRepository.createRole(dbClient, {
        name: roleName,
        slug: derivedSlug,
        description: payload.description?.trim() || null,
        domain_scope: payload.domainScope,
        is_active: payload.isActive ?? true,
        assignable_by: payload.assignableBy ?? [],
        is_system: false,
    });

    const roles = await readRoles(dbClient);
    const role = roles.find((r) => r.id === created.role_id)!;

    if (actorUserId && institutionId) {
        await ActivityNotificationService.notifyGenericInstitutionActivity({
            dbClient,
            actorUserId,
            institutionId,
            operation: 'CREATED',
            targetType: 'ROLE',
            targetId: String(role.id),
            targetLabel: role.name,
            title: 'Role created',
            message: `An access-control role was created: "${role.name}".`,
            sourceModule: 'roles',
            sourceAction: 'create',
            metadata: {
                roleId: role.id,
            },
        });
    }

    return role;
}
