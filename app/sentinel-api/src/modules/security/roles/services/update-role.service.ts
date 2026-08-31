import { type DbClient } from '@sentinel/db';
import { HTTPException } from 'hono/http-exception';
import type { AccessControlRoleInput } from '@sentinel/shared/types';
import { RolesRepository } from '../roles.repository';
import { getRoleRecord } from './get-role-record.service';
import { validateOptionABoundaries } from './validate-role-boundaries.service';
import { readRoles } from './get-roles.service';
import { ActivityNotificationService } from '../../../general/notification/services/activity-notification.service';
import { normalizeRoleName } from './utils';

/**
 * Updates an existing custom role, checking Option A constraints and preventing modification of system roles.
 */
export async function updateRole(
    dbClient: DbClient,
    roleId: number,
    payload: Partial<AccessControlRoleInput>,
    actorUserId?: string,
    institutionId?: string,
) {
    const roleRecord = await getRoleRecord(dbClient, roleId);

    // Prevent updating system-seeded roles
    if (roleRecord.is_system) {
        throw new HTTPException(400, {
            message: 'System roles cannot be modified.',
        });
    }

    const nextName = payload.name ? normalizeRoleName(payload.name) : roleRecord.role_name;
    const nextSlug = payload.slug ? normalizeRoleName(payload.slug) : roleRecord.slug;

    // Check dynamic slug collisions if slug is updated
    if (nextSlug && nextSlug !== roleRecord.slug) {
        const existing = await RolesRepository.findRoleBySlug(dbClient, nextSlug);
        if (existing) {
            throw new HTTPException(400, {
                message: `A role with slug "${nextSlug}" already exists.`,
            });
        }
    }

    const nextDomainScope = payload.domainScope ?? roleRecord.domain_scope ?? [];

    // Validate Option A limits if caller is specified
    if (actorUserId) {
        await validateOptionABoundaries(dbClient, actorUserId, nextDomainScope);
    }

    await RolesRepository.updateRole(dbClient, roleId, {
        name: nextName,
        slug: nextSlug,
        description:
            payload.description !== undefined
                ? payload.description?.trim() || null
                : roleRecord.description,
        domain_scope: nextDomainScope,
        is_active:
            payload.isActive !== undefined ? payload.isActive : (roleRecord.is_active ?? true),
        assignable_by: payload.assignableBy ?? roleRecord.assignable_by ?? [],
    });

    const roles = await readRoles(dbClient);
    const role = roles.find((item) => item.id === roleId)!;

    if (actorUserId && institutionId) {
        await ActivityNotificationService.notifyGenericInstitutionActivity({
            dbClient,
            actorUserId,
            institutionId,
            operation: 'UPDATED',
            targetType: 'ROLE',
            targetId: String(role.id),
            targetLabel: role.name,
            title: 'Role updated',
            message: `An access-control role was updated: "${role.name}".`,
            sourceModule: 'roles',
            sourceAction: 'update',
            metadata: {
                roleId: role.id,
            },
        });
    }

    return role;
}
