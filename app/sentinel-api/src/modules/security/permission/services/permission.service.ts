import { type DbClient } from '@sentinel/db';
import { HTTPException } from 'hono/http-exception';
import type { AccessControlPermission, AccessControlPermissionInput } from '@sentinel/shared/types';
import { getPermissionRecord } from '../data/get-permission-record';
import {
    getPermissionsData,
    parsePermissionCount,
    toNullablePermissionDate,
} from '../data/get-permissions';
import { syncSystemPermissions } from '../data/sync-system-permissions';
import { ActivityNotificationService } from '../../../general/notification/services/activity-notification.service';
import { LogsService } from '../../../general/logs/logs.service';

function normalizePermissionKey(key: string) {
    return key.trim().toLowerCase();
}

function mapPermissionRow(row: {
    permission_id: string;
    permission_key: string;
    module_key: string;
    action_key: string;
    category: string | null;
    scope: string | null;
    name: string;
    description: string | null;
    is_system: boolean | null;
    created_at: Date | null;
    updated_at: Date | null;
    roleCount: string | number | bigint | null;
    overrideCount: string | number | bigint | null;
}): AccessControlPermission {
    return {
        id: row.permission_id,
        key: row.permission_key,
        moduleKey: row.module_key,
        actionKey: row.action_key,
        category: row.category,
        scope: row.scope,
        name: row.name,
        description: row.description,
        isSystem: Boolean(row.is_system),
        createdAt: toNullablePermissionDate(row.created_at),
        updatedAt: toNullablePermissionDate(row.updated_at),
        roleCount: parsePermissionCount(row.roleCount),
        overrideCount: parsePermissionCount(row.overrideCount),
    };
}

export class PermissionService {
    static async syncSystemPermissions(dbClient: DbClient) {
        await syncSystemPermissions(dbClient);
    }

    static async getPermissionRecord(dbClient: DbClient, permissionId: string) {
        return getPermissionRecord(dbClient, permissionId);
    }

    static async getPermissions(
        dbClient: DbClient,
        search?: string,
    ): Promise<AccessControlPermission[]> {
        await this.syncSystemPermissions(dbClient);
        const permissions = await getPermissionsData(dbClient, search);
        return permissions.map(mapPermissionRow);
    }

    static async createPermission(
        dbClient: DbClient,
        payload: AccessControlPermissionInput,
        actorUserId?: string,
        institutionId?: string,
    ) {
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

        const permissions = await this.getPermissions(dbClient);
        const permission = permissions.find(
            (permission) => permission.id === created.permission_id,
        ) ?? {
            id: created.permission_id,
            key: permissionKey,
            moduleKey: payload.moduleKey.trim().toLowerCase(),
            actionKey: payload.actionKey.trim().toLowerCase(),
            category: payload.category?.trim() || null,
            scope: payload.scope?.trim() || 'global',
            name: payload.name.trim(),
            description: payload.description?.trim() || null,
            is_system: false,
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

    static async updatePermission(
        dbClient: DbClient,
        permissionId: string,
        payload: Partial<AccessControlPermissionInput>,
        actorUserId?: string,
        institutionId?: string,
    ) {
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

        const permissions = await this.getPermissions(dbClient);
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
            is_system: false,
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

        const resolvedPermissionId =
            (updatedPermission as any).id ?? (updatedPermission as any).permission_id;
        const resolvedPermissionKey =
            (updatedPermission as any).key ?? (updatedPermission as any).permission_key;

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

    static async deletePermission(
        dbClient: DbClient,
        permissionId: string,
        actorUserId?: string,
        institutionId?: string,
    ) {
        const permission = await getPermissionRecord(dbClient, permissionId);

        if (permission.is_system) {
            throw new HTTPException(400, { message: 'System permissions cannot be deleted.' });
        }

        await dbClient
            .deleteFrom('rbac_permissions')
            .where('permission_id', '=', permissionId)
            .execute();

        if (actorUserId && institutionId) {
            await ActivityNotificationService.notifyGenericInstitutionActivity({
                dbClient,
                actorUserId,
                institutionId,
                operation: 'DELETED',
                targetType: 'PERMISSION',
                targetId: permissionId,
                targetLabel: permission.permission_key,
                title: 'Permission deleted',
                message: `An access-control permission was deleted: "${permission.permission_key}".`,
                sourceModule: 'permissions',
                sourceAction: 'delete',
                metadata: {
                    permissionId,
                },
            });
        }
    }
}
