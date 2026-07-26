import { useState } from 'react';
import {
    useAccessControlPermissionsQuery,
    useAccessControlRolesQuery,
    useDebounce,
    useStableValue,
} from '@sentinel/hooks';
import type { AccessControlRole, AccessControlPermission } from '@sentinel/shared/types';
import {
    groupPermissionsByCategoryAndModule,
    sortRolesForReview,
} from '@/app/(protected)/(support)/control/_lib/control-presenters';

const EMPTY_ROLES: AccessControlRole[] = [];
const EMPTY_PERMISSIONS: AccessControlPermission[] = [];

/**
 * Custom hook to manage searching, query fetching, and sorting of roles and permissions in the role matrix.
 */
export function useRoleMatrixSearch() {
    const [searchValue, setSearchValue] = useState('');
    const debouncedSearchValue = useDebounce(searchValue, 500);

    const { data: roles = EMPTY_ROLES, isLoading, error } = useAccessControlRolesQuery();
    const {
        data: filteredPermissions = EMPTY_PERMISSIONS,
        isLoading: isPermissionsLoading,
        isFetching: isPermissionsFetching,
        error: permissionsError,
    } = useAccessControlPermissionsQuery(debouncedSearchValue);

    const permissions = useStableValue(() => filteredPermissions, [filteredPermissions]);
    const sortedRoles = useStableValue(() => sortRolesForReview(roles), [roles]);
    const groupedPermissions = useStableValue(
        () => groupPermissionsByCategoryAndModule(filteredPermissions),
        [filteredPermissions],
    );

    const isBusy = isLoading || (isPermissionsLoading && filteredPermissions.length === 0);
    const pageError = error || permissionsError;

    return {
        searchValue,
        setSearchValue,
        roles,
        sortedRoles,
        permissions,
        filteredPermissions,
        groupedPermissions,
        isBusy,
        isSearching: isPermissionsFetching,
        pageError,
    };
}
