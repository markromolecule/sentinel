import type { ApiClientType } from '../api-client';
import type {
    AccessControlAssignment,
    AccessControlAssignmentInput,
    AccessControlOverview,
    AccessControlPermission,
    AccessControlPermissionInput,
    AccessControlRole,
    AccessControlRoleInput,
    ExaminationGlobalSettings,
    ExaminationGlobalSettingsRecord,
} from '@sentinel/shared/types';

interface ApiResponse<T> {
    message: string;
    data: T;
}

export async function getAccessControlOverview(
    apiClient: ApiClientType,
): Promise<AccessControlOverview> {
    const response: ApiResponse<AccessControlOverview> = await apiClient(
        '/access-control/overview',
    );
    return response.data;
}

export async function getAccessControlRoles(
    apiClient: ApiClientType,
    search?: string,
): Promise<AccessControlRole[]> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);

    const response: ApiResponse<AccessControlRole[]> = await apiClient(
        `/access-control/roles${params.size > 0 ? `?${params.toString()}` : ''}`,
    );
    return response.data;
}

export async function createAccessControlRole(
    apiClient: ApiClientType,
    payload: AccessControlRoleInput,
): Promise<AccessControlRole> {
    const response: ApiResponse<AccessControlRole> = await apiClient('/access-control/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    return response.data;
}

export async function updateAccessControlRole(
    apiClient: ApiClientType,
    roleId: number,
    payload: Partial<AccessControlRoleInput>,
): Promise<AccessControlRole> {
    const response: ApiResponse<AccessControlRole> = await apiClient(
        `/access-control/roles/${roleId}`,
        {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        },
    );

    return response.data;
}

export async function deleteAccessControlRole(
    apiClient: ApiClientType,
    roleId: number,
): Promise<void> {
    await apiClient(`/access-control/roles/${roleId}`, {
        method: 'DELETE',
    });
}

export async function getAccessControlPermissions(
    apiClient: ApiClientType,
    search?: string,
): Promise<AccessControlPermission[]> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);

    const response: ApiResponse<AccessControlPermission[]> = await apiClient(
        `/access-control/permissions${params.size > 0 ? `?${params.toString()}` : ''}`,
    );
    return response.data;
}

export async function createAccessControlPermission(
    apiClient: ApiClientType,
    payload: AccessControlPermissionInput,
): Promise<AccessControlPermission> {
    const response: ApiResponse<AccessControlPermission> = await apiClient(
        '/access-control/permissions',
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        },
    );

    return response.data;
}

export async function updateAccessControlPermission(
    apiClient: ApiClientType,
    permissionId: string,
    payload: Partial<AccessControlPermissionInput>,
): Promise<AccessControlPermission> {
    const response: ApiResponse<AccessControlPermission> = await apiClient(
        `/access-control/permissions/${permissionId}`,
        {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        },
    );

    return response.data;
}

export async function deleteAccessControlPermission(
    apiClient: ApiClientType,
    permissionId: string,
): Promise<void> {
    await apiClient(`/access-control/permissions/${permissionId}`, {
        method: 'DELETE',
    });
}

export async function replaceAccessControlRolePermissions(
    apiClient: ApiClientType,
    roleId: number,
    permissionIds: string[],
): Promise<AccessControlRole> {
    const response: ApiResponse<AccessControlRole> = await apiClient(
        `/access-control/roles/${roleId}/permissions`,
        {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ permissionIds }),
        },
    );

    return response.data;
}

export async function resetAccessControlRolePermissionsToBlueprint(
    apiClient: ApiClientType,
    roleId: number,
): Promise<AccessControlRole> {
    const response: ApiResponse<AccessControlRole> = await apiClient(
        `/access-control/roles/${roleId}/permissions/reset-blueprint`,
        {
            method: 'POST',
        },
    );

    return response.data;
}

export async function getAccessControlAssignments(
    apiClient: ApiClientType,
    search?: string,
): Promise<AccessControlAssignment[]> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);

    const response: ApiResponse<AccessControlAssignment[]> = await apiClient(
        `/access-control/assignments${params.size > 0 ? `?${params.toString()}` : ''}`,
    );
    return response.data;
}

export async function createAccessControlAssignment(
    apiClient: ApiClientType,
    payload: AccessControlAssignmentInput,
): Promise<AccessControlAssignment> {
    const response: ApiResponse<AccessControlAssignment> = await apiClient(
        '/access-control/assignments',
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        },
    );

    return response.data;
}

export async function deleteAccessControlAssignment(
    apiClient: ApiClientType,
    payload: AccessControlAssignmentInput,
): Promise<void> {
    await apiClient(`/access-control/assignments/${payload.userId}/${payload.roleId}`, {
        method: 'DELETE',
    });
}

export async function getAccessControlExaminationSettings(
    apiClient: ApiClientType,
): Promise<ExaminationGlobalSettingsRecord> {
    const response: ApiResponse<ExaminationGlobalSettingsRecord> = await apiClient(
        '/access-control/examination-settings',
    );
    return response.data;
}

export async function updateAccessControlExaminationSettings(
    apiClient: ApiClientType,
    payload: ExaminationGlobalSettings,
): Promise<ExaminationGlobalSettingsRecord> {
    const response: ApiResponse<ExaminationGlobalSettingsRecord> = await apiClient(
        '/access-control/examination-settings',
        {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        },
    );

    return response.data;
}

import type { ResolvedEssayRubric, UpdateExamEssayRubricResponse } from './exams/essay-rubric';

/**
 * Fetches the active baseline essay rubric managed by support.
 *
 * @param apiClient - The authenticated API client instance.
 * @returns A promise resolving to the resolved essay rubric details.
 */
export async function getBaselineEssayRubric(
    apiClient: ApiClientType,
): Promise<ResolvedEssayRubric> {
    const response: ApiResponse<ResolvedEssayRubric> = await apiClient(
        '/access-control/essay-rubric',
    );
    return response.data;
}

/**
 * Updates the active baseline essay rubric managed by support.
 *
 * @param apiClient - The authenticated API client instance.
 * @param payload - The new criteria definition payload.
 * @returns A promise resolving to the updated baseline rubric version details.
 */
export async function updateBaselineEssayRubric(
    apiClient: ApiClientType,
    payload: {
        criteria: Array<{
            key: string;
            name: string;
            weight: number;
            description: string;
            levels: Record<number, string>;
        }>;
    },
): Promise<UpdateExamEssayRubricResponse> {
    const response: ApiResponse<UpdateExamEssayRubricResponse> = await apiClient(
        '/access-control/essay-rubric',
        {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        },
    );
    return response.data;
}
