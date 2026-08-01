import { type DbClient } from '@sentinel/db';
import { HTTPException } from 'hono/http-exception';
import { hasActivePermission } from '../../../../lib/permissions';

type RequirePdfDocumentAccessArgs = {
    activePermissionKeys?: string[];
    requiredPermissions: string | string[];
    missingPermissionMessage?: string;
};

/**
 * Enforces at least one required active permission for PDF document routes.
 * Access is role-agnostic — any authenticated user holding a required permission is granted access.
 */
export function requirePdfDocumentAccess({
    activePermissionKeys = [],
    requiredPermissions,
    missingPermissionMessage = 'Forbidden. Missing required PDF document permission.',
}: RequirePdfDocumentAccessArgs): void {
    if (!hasActivePermission(activePermissionKeys, requiredPermissions)) {
        throw new HTTPException(403, { message: missingPermissionMessage });
    }
}

type RequireAllPdfDocumentPermissionsArgs = {
    activePermissionKeys?: string[];
    requiredPermissions: string[];
    missingPermissionMessage?: string;
};

/**
 * Enforces that all required active permissions are held for a PDF document route.
 * Throws an HTTPException(403) if any of the required permissions are missing.
 *
 * @param args - Object containing active permissions and required permissions
 * @throws HTTPException 403 if any required permission is missing
 */
export function requireAllPdfDocumentPermissions({
    activePermissionKeys = [],
    requiredPermissions,
    missingPermissionMessage = 'Forbidden. Missing required PDF document permissions.',
}: RequireAllPdfDocumentPermissionsArgs): void {
    const hasAll = requiredPermissions.every((permission) =>
        activePermissionKeys.includes(permission),
    );
    if (!hasAll) {
        throw new HTTPException(403, { message: missingPermissionMessage });
    }
}

/**
 * Validates that overall report templates use either the global scope or a parent institution.
 */
export async function assertOverallReportTemplateScope(
    dbClient: DbClient,
    institutionId?: string | null,
): Promise<void> {
    if (!institutionId) {
        return;
    }

    const institution = await dbClient
        .selectFrom('institutions')
        .select(['id', 'institution_kind'])
        .where('id', '=', institutionId)
        .executeTakeFirst();

    if (!institution) {
        throw new HTTPException(400, {
            message: `Institution ${institutionId} does not exist.`,
        });
    }

    if (institution.institution_kind !== 'PARENT') {
        throw new HTTPException(400, {
            message: 'Overall report templates support only parent institutions.',
        });
    }
}

export async function resolvePdfAccessibleInstitutionIds(
    dbClient: DbClient,
    requesterInstitutionId?: string | null,
): Promise<string[] | null> {
    if (!requesterInstitutionId) {
        return null;
    }

    const requesterInstitution = await dbClient
        .selectFrom('institutions')
        .select(['id', 'institution_kind'])
        .where('id', '=', requesterInstitutionId)
        .executeTakeFirst();

    if (!requesterInstitution) {
        return [requesterInstitutionId];
    }

    if (requesterInstitution.institution_kind !== 'PARENT') {
        return [requesterInstitutionId];
    }

    const branches = await dbClient
        .selectFrom('institutions')
        .select('id')
        .where('parent_institution_id', '=', requesterInstitutionId)
        .execute();

    return [requesterInstitutionId, ...branches.map((branch) => branch.id)];
}

export async function canAccessPdfInstitutionScope(
    dbClient: DbClient,
    requesterInstitutionId: string | null | undefined,
    targetInstitutionId: string | null | undefined,
): Promise<boolean> {
    if (!targetInstitutionId) {
        return !requesterInstitutionId;
    }

    const accessibleInstitutionIds = await resolvePdfAccessibleInstitutionIds(
        dbClient,
        requesterInstitutionId,
    );

    if (!accessibleInstitutionIds) {
        return true;
    }

    return accessibleInstitutionIds.includes(targetInstitutionId);
}
