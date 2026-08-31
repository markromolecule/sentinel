import { type DbClient } from '@sentinel/db';
import { getPermissionRecord as getPermissionRecordData } from '../data/get-permission-record';

/**
 * Retrieves a raw permission record from the database by its ID. Throws 404 if missing.
 */
export async function getPermissionRecord(dbClient: DbClient, permissionId: string) {
    return getPermissionRecordData(dbClient, permissionId);
}
