import { useMemo, useState } from 'react';
import {
    useCreateAccessControlRoleMutation,
    useDeleteAccessControlRoleMutation,
} from '@sentinel/hooks';
import type { AccessControlRole } from '@sentinel/shared/types';
import { useRoleMatrixSearch } from './use-role-matrix-search';
import { useRoleMatrixCollapsing } from './use-role-matrix-collapsing';
import { useRoleMatrixNameEdit } from './use-role-matrix-name-edit';
import { useRoleMatrixPermissions } from './use-role-matrix-permissions';

/**
 * Orchestrating hook that coordinates access control role matrix search, collapsing, renaming, and permissions.
 */
export function useRoleMatrix() {
    const {
        roles,
        sortedRoles,
        permissions,
        filteredPermissions,
        groupedPermissions,
        searchValue,
        setSearchValue,
        isBusy,
        isSearching,
        pageError,
    } = useRoleMatrixSearch();

    const { collapsedCategoryKeys, collapsedModuleKeys, toggleCategory, toggleModule } =
        useRoleMatrixCollapsing(groupedPermissions);

    const {
        editingRoleId,
        editingRoleName,
        setEditingRoleId,
        setEditingRoleName,
        savingRoleIds: nameSavingRoleIds,
        startRoleNameEdit,
        submitRoleNameEdit,
        updateRoleMutation,
    } = useRoleMatrixNameEdit();

    const {
        draftPermissionIdsByRoleId,
        savingRoleIds: permissionSavingRoleIds,
        handlePermissionToggle,
        resetRolePermissions,
    } = useRoleMatrixPermissions(sortedRoles);

    // Combine in-flight saving states for name edits and permission updates
    const savingRoleIds = useMemo(() => {
        return Array.from(new Set([...nameSavingRoleIds, ...permissionSavingRoleIds]));
    }, [nameSavingRoleIds, permissionSavingRoleIds]);

    // Role creation & deletion state concerns
    const [editorOpen, setEditorOpen] = useState(false);
    const [selectedRole, setSelectedRole] = useState<AccessControlRole | null>(null);
    const [roleToDelete, setRoleToDelete] = useState<AccessControlRole | null>(null);

    const createRoleMutation = useCreateAccessControlRoleMutation();
    const deleteRoleMutation = useDeleteAccessControlRoleMutation();

    return {
        // Data
        roles,
        sortedRoles,
        permissions,
        filteredPermissions,
        groupedPermissions,

        // State
        isBusy,
        isSearching,
        pageError,
        editorOpen,
        selectedRole,
        roleToDelete,
        searchValue,
        draftPermissionIdsByRoleId,
        savingRoleIds,
        collapsedCategoryKeys,
        collapsedModuleKeys,
        editingRoleId,
        editingRoleName,

        // Mutations
        createRoleMutation,
        updateRoleMutation,
        deleteRoleMutation,

        // Setters
        setEditorOpen,
        setSelectedRole,
        setRoleToDelete,
        setSearchValue,
        setEditingRoleId,
        setEditingRoleName,

        // Actions
        handlePermissionToggle,
        toggleCategory,
        toggleModule,
        startRoleNameEdit,
        submitRoleNameEdit,
        resetRolePermissions,
    };
}
