import { type DbClient } from '@sentinel/db';
import { syncSystemPermissions as syncSystemPermissionsData } from '../data/sync-system-permissions';

/**
 * Synchronizes system permissions from code constants into the database.
 */
export async function syncSystemPermissions(dbClient: DbClient): Promise<void> {
    await syncSystemPermissionsData(dbClient);
}
