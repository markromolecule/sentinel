import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useRoleMatrix } from './use-role-matrix';
import * as sentinelHooks from '@sentinel/hooks';

vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
    },
}));

vi.mock('@sentinel/hooks', () => ({
    useAccessControlRolesQuery: vi.fn(),
    useAccessControlPermissionsQuery: vi.fn(),
    useCreateAccessControlRoleMutation: vi.fn(),
    useUpdateAccessControlRoleMutation: vi.fn(),
    useDeleteAccessControlRoleMutation: vi.fn(),
    useReplaceAccessControlRolePermissionsMutation: vi.fn(),
    useResetAccessControlRolePermissionsToBlueprintMutation: vi.fn(),
    useDebounce: vi.fn((val) => val),
    useStableValue: vi.fn((fn) => fn()),
}));

const mockRoles = [
    {
        id: 1,
        name: 'Admin',
        slug: 'admin',
        description: 'Admin role',
        isSystem: true,
        domainScope: ['app'],
        isActive: true,
        assignableBy: [],
        permissionIds: ['perm-1'],
        permissionCount: 1,
        assignmentCount: 0,
        permissionSyncMode: 'BLUEPRINT',
        createdAt: null,
        updatedAt: null,
    },
];

const mockPermissions = [
    {
        id: 'perm-1',
        permissionKey: 'module:action',
        name: 'Perm 1',
        description: '',
        category: 'module',
        moduleKey: 'module',
        actionKey: 'action',
        scope: '',
        isSystem: false,
        createdAt: null,
        updatedAt: null,
    },
    {
        id: 'perm-2',
        permissionKey: 'module:write',
        name: 'Perm 2',
        description: '',
        category: 'module',
        moduleKey: 'module',
        actionKey: 'write',
        scope: '',
        isSystem: false,
        createdAt: null,
        updatedAt: null,
    },
];

describe('useRoleMatrix hook', () => {
    let mockMutateAsync: any;
    let mockResetMutateAsync: any;

    beforeEach(() => {
        vi.clearAllMocks();

        mockMutateAsync = vi.fn().mockResolvedValue({
            id: 1,
            name: 'Admin',
            slug: 'admin',
            isSystem: true,
            permissionIds: ['perm-1', 'perm-2'],
            permissionSyncMode: 'CUSTOM',
        });

        mockResetMutateAsync = vi.fn().mockResolvedValue({
            id: 1,
            name: 'Admin',
            slug: 'admin',
            isSystem: true,
            permissionIds: ['perm-1'],
            permissionSyncMode: 'BLUEPRINT',
        });

        vi.mocked(sentinelHooks.useAccessControlRolesQuery).mockReturnValue({
            data: mockRoles,
            isLoading: false,
            error: null,
        } as any);

        vi.mocked(sentinelHooks.useAccessControlPermissionsQuery).mockReturnValue({
            data: mockPermissions,
            isLoading: false,
            error: null,
        } as any);

        vi.mocked(sentinelHooks.useReplaceAccessControlRolePermissionsMutation).mockReturnValue({
            mutateAsync: mockMutateAsync,
            isPending: false,
        } as any);

        vi.mocked(sentinelHooks.useCreateAccessControlRoleMutation).mockReturnValue({} as any);
        vi.mocked(sentinelHooks.useUpdateAccessControlRoleMutation).mockReturnValue({
            mutate: vi.fn(),
        } as any);
        vi.mocked(sentinelHooks.useDeleteAccessControlRoleMutation).mockReturnValue({} as any);
        vi.mocked(
            sentinelHooks.useResetAccessControlRolePermissionsToBlueprintMutation,
        ).mockReturnValue({
            mutateAsync: mockResetMutateAsync,
            isPending: false,
        } as any);
    });

    it('initializes roles, permissions, and draft states correctly', () => {
        const { result } = renderHook(() => useRoleMatrix());

        expect(result.current.roles).toEqual(mockRoles);
        expect(result.current.permissions).toEqual(mockPermissions);
        expect(result.current.draftPermissionIdsByRoleId[1]).toEqual(['perm-1']);
    });

    it('toggles permission and triggers mutation and reconciles draft permission IDs immediately', async () => {
        const { result } = renderHook(() => useRoleMatrix());

        // Toggle perm-2 ON
        act(() => {
            result.current.handlePermissionToggle(1, 'perm-2', true);
        });

        await waitFor(() => {
            expect(mockMutateAsync).toHaveBeenCalledWith({
                roleId: 1,
                permissionIds: ['perm-1', 'perm-2'],
            });
        });
        expect(result.current.draftPermissionIdsByRoleId[1]).toEqual(['perm-1', 'perm-2']);
    });

    it('rolls back draft state if mutation fails', async () => {
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
        mockMutateAsync.mockRejectedValueOnce(new Error('Failed to save'));

        const { result } = renderHook(() => useRoleMatrix());

        // Toggle perm-2 ON
        await act(async () => {
            result.current.handlePermissionToggle(1, 'perm-2', true);
        });

        // Verify draft was reverted to the original backend state ['perm-1']
        expect(result.current.draftPermissionIdsByRoleId[1]).toEqual(['perm-1']);
        consoleError.mockRestore();
    });

    it('triggers reset to blueprint and updates draft permissions correctly', async () => {
        const { result } = renderHook(() => useRoleMatrix());

        await act(async () => {
            await result.current.resetRolePermissions(1);
        });

        expect(mockResetMutateAsync).toHaveBeenCalledWith(1);
        expect(result.current.draftPermissionIdsByRoleId[1]).toEqual(['perm-1']);
    });

    it('preserves newer local changes if a toggle occurs while a prior save is in-flight', async () => {
        let resolveFirstMutation!: (value: unknown) => void;
        const firstMutationPromise = new Promise((resolve) => {
            resolveFirstMutation = resolve;
        });

        mockMutateAsync.mockImplementationOnce(() => firstMutationPromise);

        const { result } = renderHook(() => useRoleMatrix());

        // Toggle perm-2 ON (triggers first save mutation)
        act(() => {
            result.current.handlePermissionToggle(1, 'perm-2', true);
        });

        expect(mockMutateAsync).toHaveBeenCalledTimes(1);

        // While first mutation in-flight, toggle perm-2 OFF
        act(() => {
            result.current.handlePermissionToggle(1, 'perm-2', false);
        });

        // Resolve first mutation which would return ['perm-1', 'perm-2']
        await act(async () => {
            resolveFirstMutation({
                id: 1,
                name: 'Admin',
                slug: 'admin',
                isSystem: true,
                permissionIds: ['perm-1', 'perm-2'],
                permissionSyncMode: 'CUSTOM',
            });
        });

        // The newer draft of ['perm-1'] should be preserved, not overwritten by ['perm-1', 'perm-2']
        expect(result.current.draftPermissionIdsByRoleId[1]).toEqual(['perm-1']);
    });

    it('returns isSearching as true when permissions query is fetching', () => {
        vi.mocked(sentinelHooks.useAccessControlPermissionsQuery).mockReturnValue({
            data: mockPermissions,
            isLoading: false,
            isFetching: true,
            error: null,
        } as any);

        const { result } = renderHook(() => useRoleMatrix());

        expect(result.current.isSearching).toBe(true);
    });
});
