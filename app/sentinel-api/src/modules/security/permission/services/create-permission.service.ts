import { type DbClient } from '@sentinel/db';
import type { AccessControlPermission, AccessControlPermissionInput } from '@sentinel/shared/types';
import { getPermissions } from './get-permissions.service';
import { normalizePermissionKey } from './utils';
import { LogsService } from '../../../general/logs/logs.service';
import { ActivityNotificationService } from '../../../general/notification/services/activity-notification.service';

/**
 * Creates a new custom access-control permission.
 */
export async function createPermission(
    dbClient: DbClient,
    payload: AccessControlPermissionInput,
    actorUserId?: string,
    institutionId?: string,
): Promise<AccessControlPermission> {
    const permissionKey = normalizePermissionKey(payload.key);
    const created = await dbClient
        .insertInto('rbac_permissions')
        .values({
            permission_key: permissionKey,
            module_key: payload.moduleKey.trim().toLowerCase(),
            action_key: payload.actionKey.trim().toLowerCase(),
            category: payload.category?.trim() || null,
            scope: payload.scope?.trim() || 'global',
            name: payload.name.trim(),
            description: payload.description?.trim() || null,
            is_system: false,
        })
        .returning('permission_id')
        .executeTakeFirstOrThrow();

    const permissions = await getPermissions(dbClient);
    const permission = permissions.find(
        (item) => item.id === created.permission_id,
    ) ?? {
        id: created.permission_id,
        key: permissionKey,
        moduleKey: payload.moduleKey.trim().toLowerCase(),
        actionKey: payload.actionKey.trim().toLowerCase(),
        category: payload.category?.trim() || null,
        scope: payload.scope?.trim() || 'global',
        name: payload.name.trim(),
        description: payload.description?.trim() || null,
        isSystem: false,
        createdAt: null,
        updatedAt: null,
        roleCount: 0,
        overrideCount: 0,
    };

    let resolvedInstitutionId = institutionId;
    if (!resolvedInstitutionId && actorUserId) {
        const profile = await dbClient
            .selectFrom('user_profiles')
            .select(['institution_id'])
            .where('user_id', '=', actorUserId)
            .executeTakeFirst();
        resolvedInstitutionId = profile?.institution_id ?? undefined;
    }

    if (resolvedInstitutionId) {
        try {
            await LogsService.createLog(dbClient, {
                userId: actorUserId || '00000000-0000-0000-0000-000000000000',
                action: 'security.permission_created',
                resourceType: 'permission',
                resourceId: permission.id,
                activeInstitutionId: resolvedInstitutionId,
                details: {
                    permissionId: permission.id,
                    permissionKey: permission.key,
                    moduleKey: permission.moduleKey,
                    actionKey: permission.actionKey,
                },
            });
        } catch (logErr) {
            console.error('Failed to log security.permission_created:', logErr);
        }
    }

    if (actorUserId && institutionId) {
        await ActivityNotificationService.notifyGenericInstitutionActivity({
            dbClient,
            actorUserId,
            institutionId,
            operation: 'CREATED',
            targetType: 'PERMISSION',
            targetId: permission.id,
            targetLabel: permission.key,
            title: 'Permission created',
            message: `An access-control permission was created: "${permission.key}".`,
            sourceModule: 'permissions',
            sourceAction: 'create',
            metadata: {
                permissionId: permission.id,
            },
        });
    }

    return permission;
}
