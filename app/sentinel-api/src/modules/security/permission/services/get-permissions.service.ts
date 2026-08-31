import { type DbClient } from '@sentinel/db';
import type { AccessControlPermission } from '@sentinel/shared/types';
import { getPermissionsData } from '../data/get-permissions';
import { syncSystemPermissions } from './sync-system-permissions.service';
import { mapPermissionRow } from './utils';

/**
 * Reads all permissions from the database and maps them to AccessControlPermission domain objects.
 */
export async function readPermissions(
    dbClient: DbClient,
    search?: string,
): Promise<AccessControlPermission[]> {
    const permissions = await getPermissionsData(dbClient, search);
    return permissions.map(mapPermissionRow);
}

/**
 * Retrieves all permissions after ensuring system permissions are synchronized.
 */
export async function getPermissions(
    dbClient: DbClient,
    search?: string,
): Promise<AccessControlPermission[]> {
    await syncSystemPermissions(dbClient);
    return readPermissions(dbClient, search);
}
