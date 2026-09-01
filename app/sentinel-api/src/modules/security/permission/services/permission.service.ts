import { syncSystemPermissions } from './sync-system-permissions.service';
import { getPermissionRecord } from './get-permission-record.service';
import { getPermissions, readPermissions } from './get-permissions.service';
import { createPermission } from './create-permission.service';
import { updatePermission } from './update-permission.service';
import { deletePermission } from './delete-permission.service';

export {
    syncSystemPermissions,
    getPermissionRecord,
    getPermissions,
    readPermissions,
    createPermission,
    updatePermission,
    deletePermission,
};

/**
 * Service layer for Access Control Permissions.
 * Serves as the main entry point, delegating queries and mutations to specialized modular services.
 */
export class PermissionService {
    /**
     * Synchronizes system permissions from code constants into the database.
     */
    static syncSystemPermissions = syncSystemPermissions;

    /**
     * Retrieves a raw permission record from database by its ID. Throws 404 if missing.
     */
    static getPermissionRecord = getPermissionRecord;

    /**
     * Retrieves all permissions from the database, executing system permissions sync beforehand.
     */
    static getPermissions = getPermissions;

    /**
     * Reads all permissions from the database without executing system permissions sync.
     */
    static readPermissions = readPermissions;

    /**
     * Creates a new custom access-control permission.
     */
    static createPermission = createPermission;

    /**
     * Updates an existing custom access-control permission.
     */
    static updatePermission = updatePermission;

    /**
     * Deletes an existing custom access-control permission.
     */
    static deletePermission = deletePermission;
}
