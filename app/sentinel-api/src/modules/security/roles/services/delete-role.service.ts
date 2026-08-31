import { type DbClient } from '@sentinel/db';
import { HTTPException } from 'hono/http-exception';
import { RolesRepository } from '../roles.repository';
import { getRoleRecord } from './get-role-record.service';
import { validateOptionABoundaries } from './validate-role-boundaries.service';
import { ActivityNotificationService } from '../../../general/notification/services/activity-notification.service';

/**
 * Deletes an existing custom role, preventing deletion of system roles and enforcing Option A limits.
 */
export async function deleteRole(
    dbClient: DbClient,
    roleId: number,
    actorUserId?: string,
    institutionId?: string,
) {
    const roleRecord = await getRoleRecord(dbClient, roleId);

    // Prevent deleting system-seeded roles
    if (roleRecord.is_system) {
        throw new HTTPException(400, { message: 'System roles cannot be deleted.' });
    }

    // Validate Option A limits if caller is specified
    if (actorUserId) {
        await validateOptionABoundaries(
            dbClient,
            actorUserId,
            roleRecord.domain_scope ?? [],
            true, // system-level role modification block
        );
    }

    await RolesRepository.deleteRole(dbClient, roleId);

    if (actorUserId && institutionId) {
        await ActivityNotificationService.notifyGenericInstitutionActivity({
            dbClient,
            actorUserId,
            institutionId,
            operation: 'DELETED',
            targetType: 'ROLE',
            targetId: String(roleId),
            targetLabel: roleRecord.role_name,
            title: 'Role deleted',
            message: `An access-control role was deleted: "${roleRecord.role_name}".`,
            sourceModule: 'roles',
            sourceAction: 'delete',
            metadata: {
                roleId,
            },
        });
    }
}
