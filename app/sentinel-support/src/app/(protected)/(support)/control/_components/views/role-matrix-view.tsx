'use client';

import { useState } from 'react';
import type { AccessControlRole } from '@sentinel/shared/types';
import { Badge, SearchBar, FacetedFilter, cn } from '@sentinel/ui';
import {
    AccessControlEmptyState,
    AccessControlErrorState,
    AccessControlLoadingState,
} from '@/app/(protected)/(support)/control/_components';
import { useRoleMatrix } from '../../roles/_hooks/use-role-matrix';
import { RoleMatrixTable } from '../../roles/_components/role-matrix-table';
import { DeleteRoleDialog } from '../../roles/_components/dialog/delete-role-dialog';
import { ResetRolePermissionsDialog } from '../../roles/_components/dialog/reset-role-permissions-dialog';

/**
 * RoleMatrixView renders the Dynamic RBAC Role Matrix.
 * Displays permissions mapping against active roles.
 * Includes domain scoping filters to narrow down target columns dynamically.
 */
export function RoleMatrixView() {
    const {
        // Data
        sortedRoles,
        permissions,
        filteredPermissions,
        groupedPermissions,

        // State
        isBusy,
        isSearching,
        pageError,
        roleToDelete,
        searchValue,
        draftPermissionIdsByRoleId,
        savingRoleIds,
        collapsedCategoryKeys,
        collapsedModuleKeys,
        editingRoleId,
        editingRoleName,

        // Mutations
        deleteRoleMutation,

        // Setters
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
    } = useRoleMatrix();

    const [selectedDomains, setSelectedDomains] = useState<Set<string>>(new Set());
    const [roleToReset, setRoleToReset] = useState<AccessControlRole | null>(null);

    if (isBusy) return <AccessControlLoadingState label="Constructing matrix..." />;
    if (pageError) return <AccessControlErrorState message={pageError.message} />;

    if (sortedRoles.length === 0) {
        return (
            <AccessControlEmptyState
                title="No Roles"
                description="The role catalog is currently empty. Define system roles to begin mapping permissions."
            />
        );
    }

    if (permissions.length === 0) {
        return (
            <AccessControlEmptyState
                title="Empty Catalog"
                description="No permissions found in the registry. You must define permissions before mapping them to roles."
            />
        );
    }

    // Calculate domain counts for the facets
    const domainCounts = new Map<string, number>();
    domainCounts.set(
        'support',
        sortedRoles.filter((role) => role.domainScope?.includes('support')).length,
    );
    domainCounts.set(
        'core',
        sortedRoles.filter((role) => role.domainScope?.includes('core')).length,
    );
    domainCounts.set('app', sortedRoles.filter((role) => role.domainScope?.includes('app')).length);

    // Filter sortedRoles dynamically based on the selected domains
    const filteredRoles = sortedRoles.filter((role) => {
        if (selectedDomains.size === 0) return true;
        return role.domainScope?.some((domain) => selectedDomains.has(domain));
    });

    return (
        <div className="space-y-6">
            {/* Header Controls & Filters */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-center">
                    <SearchBar
                        value={searchValue}
                        onChange={(event) => setSearchValue(event.target.value)}
                        placeholder="Search permissions..."
                        containerClassName="w-full sm:max-w-md"
                        className="border-muted/50 bg-background/50 focus-visible:ring-primary/20 h-11 rounded-none"
                    />
                    <FacetedFilter
                        title="Domains"
                        options={[
                            { label: 'Support Operations', value: 'support' },
                            { label: 'Core System', value: 'core' },
                            { label: 'End-User App', value: 'app' },
                        ]}
                        selectedValues={selectedDomains}
                        onSelect={(value) => {
                            const next = new Set(selectedDomains);
                            if (next.has(value)) {
                                next.delete(value);
                            } else {
                                next.add(value);
                            }
                            setSelectedDomains(next);
                        }}
                        onClear={() => setSelectedDomains(new Set())}
                        counts={domainCounts}
                    />
                    <div className="text-muted-foreground/80 flex items-center gap-4 text-[12px] font-bold">
                        <div className="flex items-center gap-1.5">
                            <div className="bg-primary size-1.5 rounded-full" />
                            <span>{filteredPermissions.length} Results</span>
                        </div>
                        <div className="bg-muted-foreground/30 size-1 rounded-full" />
                        <Badge
                            variant="secondary"
                            className="bg-primary/5 text-primary border-primary/10 h-6 px-2 text-[11px] font-bold"
                        >
                            Auto-Save
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Matrix View Content */}
            {filteredRoles.length === 0 ? (
                <div className="border-muted/50 bg-muted/5 rounded-none border border-dashed py-20 text-center">
                    <AccessControlEmptyState
                        title="No Active Roles in Domain"
                        description="There are currently no active roles configured within the selected domain scope(s)."
                    />
                </div>
            ) : (
                <div
                    className={cn(
                        'transition-opacity duration-200',
                        isSearching && 'pointer-events-none opacity-50',
                    )}
                >
                    <RoleMatrixTable
                        sortedRoles={filteredRoles}
                        groupedPermissions={groupedPermissions}
                        draftPermissionIdsByRoleId={draftPermissionIdsByRoleId}
                        savingRoleIds={savingRoleIds}
                        collapsedCategoryKeys={collapsedCategoryKeys}
                        collapsedModuleKeys={collapsedModuleKeys}
                        editingRoleId={editingRoleId}
                        editingRoleName={editingRoleName}
                        onToggleCategory={toggleCategory}
                        onToggleModule={toggleModule}
                        onPermissionToggle={handlePermissionToggle}
                        onStartRoleNameEdit={startRoleNameEdit}
                        onSubmitRoleNameEdit={submitRoleNameEdit}
                        onSetEditingRoleId={setEditingRoleId}
                        onSetEditingRoleName={setEditingRoleName}
                        onSetRoleToDelete={setRoleToDelete}
                        onSetRoleToReset={setRoleToReset}
                    />
                </div>
            )}

            <DeleteRoleDialog
                role={roleToDelete}
                onClose={() => setRoleToDelete(null)}
                onDelete={(roleId) => {
                    deleteRoleMutation.mutate(roleId, {
                        onSuccess: () => {
                            setRoleToDelete(null);
                        },
                    });
                }}
                isPending={deleteRoleMutation.isPending}
            />

            <ResetRolePermissionsDialog
                role={roleToReset}
                onClose={() => setRoleToReset(null)}
                onReset={async (roleId) => {
                    const updatedRole = await resetRolePermissions(roleId);
                    if (updatedRole) {
                        setRoleToReset(null);
                    }
                }}
                isPending={savingRoleIds.includes(roleToReset?.id ?? 0)}
            />
        </div>
    );
}
