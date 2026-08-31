import { type DbClient } from '@sentinel/db';
import { HTTPException } from 'hono/http-exception';
import { getPermissionRecord } from './get-permission-record.service';
import { ActivityNotificationService } from '../../../general/notification/services/activity-notification.service';

/**
 * Deletes a custom access-control permission. System permissions cannot be deleted.
 */
export async function deletePermission(
    dbClient: DbClient,
    permissionId: string,
    actorUserId?: string,
    institutionId?: string,
): Promise<void> {
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
