import type { AccessControlPermission } from '@sentinel/shared/types';
import {
    parsePermissionCount,
    toNullablePermissionDate,
} from '../data/get-permissions';

export function normalizePermissionKey(key: string): string {
    return key.trim().toLowerCase();
}

export function mapPermissionRow(row: {
    permission_id: string;
    permission_key: string;
    module_key: string;
    action_key: string;
    category: string | null;
    scope: string | null;
    name: string;
    description: string | null;
    is_system: boolean | null;
    created_at: Date | string | null;
    updated_at: Date | string | null;
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
