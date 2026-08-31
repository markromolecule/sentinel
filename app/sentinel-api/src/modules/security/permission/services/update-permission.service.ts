import { type DbClient } from '@sentinel/db';
import { HTTPException } from 'hono/http-exception';
import type { AccessControlPermission, AccessControlPermissionInput } from '@sentinel/shared/types';
import { getPermissionRecord } from './get-permission-record.service';
import { getPermissions } from './get-permissions.service';
import { normalizePermissionKey } from './utils';
import { LogsService } from '../../../general/logs/logs.service';
import { ActivityNotificationService } from '../../../general/notification/services/activity-notification.service';

/**
 * Updates an existing custom access-control permission.
 */
export async function updatePermission(
    dbClient: DbClient,
    permissionId: string,
    payload: Partial<AccessControlPermissionInput>,
    actorUserId?: string,
    institutionId?: string,
): Promise<AccessControlPermission> {
    const permission = await getPermissionRecord(dbClient, permissionId);
    const nextKey = payload.key
        ? normalizePermissionKey(payload.key)
        : permission.permission_key;
    const nextModuleKey = payload.moduleKey?.trim().toLowerCase() || permission.module_key;
    const nextActionKey = payload.actionKey?.trim().toLowerCase() || permission.action_key;

    if (permission.is_system) {
        if (nextKey !== permission.permission_key) {
            throw new HTTPException(400, {
                message: 'System permission keys cannot be changed.',
            });
        }

        if (
            nextModuleKey !== permission.module_key ||
            nextActionKey !== permission.action_key
        ) {
            throw new HTTPException(400, {
                message: 'System permission module/action values cannot be changed.',
            });
        }
    }

    await dbClient
        .updateTable('rbac_permissions')
        .set({
            permission_key: nextKey,
            module_key: nextModuleKey,
            action_key: nextActionKey,
            category:
                payload.category !== undefined
                    ? payload.category?.trim() || null
                    : permission.category,
            scope:
                payload.scope !== undefined ? payload.scope?.trim() || null : permission.scope,
            name: payload.name?.trim() || permission.name,
            description:
                payload.description !== undefined
                    ? payload.description?.trim() || null
                    : permission.description,
            updated_at: new Date(),
        })
        .where('permission_id', '=', permissionId)
        .execute();

    const permissions = await getPermissions(dbClient);
    const updatedPermission = permissions.find((item) => item.id === permissionId) ?? {
        id: permissionId,
        key: nextKey,
        moduleKey: nextModuleKey,
        actionKey: nextActionKey,
        category:
            payload.category !== undefined
                ? payload.category?.trim() || null
                : permission.category,
        scope:
            payload.scope !== undefined ? payload.scope?.trim() || null : permission.scope,
        name: payload.name?.trim() || permission.name,
        description:
            payload.description !== undefined
                ? payload.description?.trim() || null
                : permission.description,
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

    const resolvedPermissionId = updatedPermission.id;
    const resolvedPermissionKey = updatedPermission.key;

    if (resolvedInstitutionId) {
        try {
            await LogsService.createLog(dbClient, {
                userId: actorUserId || '00000000-0000-0000-0000-000000000000',
                action: 'security.permission_updated',
                resourceType: 'permission',
                resourceId: resolvedPermissionId,
                activeInstitutionId: resolvedInstitutionId,
                details: {
                    permissionId: resolvedPermissionId,
                    permissionKey: resolvedPermissionKey,
                    updatedFields: Object.keys(payload),
                },
            });
        } catch (logErr) {
            console.error('Failed to log security.permission_updated:', logErr);
        }
    }

    if (actorUserId && institutionId) {
        await ActivityNotificationService.notifyGenericInstitutionActivity({
            dbClient,
            actorUserId,
            institutionId,
            operation: 'UPDATED',
            targetType: 'PERMISSION',
            targetId: resolvedPermissionId,
            targetLabel: resolvedPermissionKey,
            title: 'Permission updated',
            message: `An access-control permission was updated: "${resolvedPermissionKey}".`,
            sourceModule: 'permissions',
            sourceAction: 'update',
            metadata: {
                permissionId: resolvedPermissionId,
            },
        });
    }

    return updatedPermission;
}
