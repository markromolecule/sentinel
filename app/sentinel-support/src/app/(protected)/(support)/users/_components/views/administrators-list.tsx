import {
    useAuth,
    useDeleteUserMutation,
    useDeleteUsersMutation,
    useStableValue,
    PermissionGuard,
} from '@sentinel/hooks';
import { useCallback, useState, useMemo } from 'react';
import {
    DataTable,
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    Button,
} from '@sentinel/ui';
import { User } from '@sentinel/shared/types';
import { Trash2 } from 'lucide-react';
import { columns } from '@/app/(protected)/(support)/users/_components/tables/columns';
import { EditSuperAdminDialog } from '@/app/(protected)/(support)/users/_components/dialogs/edit-admin-dialog';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { AdministratorsEmptyState } from './administrators-empty-state';
import {
    getAdministratorRoleConfig,
    type AdministratorRole,
} from '@/app/(protected)/(support)/users/_lib/administrator-role-config';

interface AdministratorsListProps {
    administrators: User[];
    role: AdministratorRole;
    isLoading?: boolean;
    searchTerm?: string;
    onSearchChange?: (value: string) => void;
}

export function AdministratorsList({
    administrators,
    role,
    isLoading = false,
    searchTerm,
    onSearchChange,
}: AdministratorsListProps) {
    const config = getAdministratorRoleConfig(role);
    const { user: authUser } = useAuth();
    const [editingAdmin, setEditingAdmin] = useState<User | null>(null);
    const [adminToDelete, setAdminToDelete] = useState<User | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [rowSelection, setRowSelection] = useState({});
    const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);

    const deleteUsersMutation = useDeleteUsersMutation({
        onSuccess: () => {
            setIsBulkDeleteDialogOpen(false);
            setRowSelection({});
        },
    });

    const selectedIds = useMemo(() => {
        return Object.keys(rowSelection)
            .filter((index) => rowSelection[index as keyof typeof rowSelection])
            .map((index) => administrators[parseInt(index)]?.id)
            .filter((id) => id !== authUser?.id)
            .filter(Boolean);
    }, [rowSelection, administrators, authUser?.id]);

    const handleBulkDelete = () => {
        if (selectedIds.length > 0) {
            deleteUsersMutation.mutate(selectedIds);
        }
    };

    const deleteMutation = useDeleteUserMutation({
        onSuccess: () => {
            toast.success(config.deleteSuccessMessage);
            setIsDeleteDialogOpen(false);
            setAdminToDelete(null);
        },
        onError: (error) => toast.error(error.message),
    });

    const handleDelete = useCallback((admin: User) => {
        setAdminToDelete(admin);
        setIsDeleteDialogOpen(true);
    }, []);

    const confirmDelete = () => {
        if (adminToDelete) {
            deleteMutation.mutate(adminToDelete.id);
        }
    };

    const facets = useStableValue(
        () => [
            {
                columnKey: 'role',
                title: 'Role',
                options: [
                    { label: 'Superadmin', value: 'superadmin' },
                    { label: 'Support', value: 'support' },
                ],
            },
            {
                columnKey: 'status',
                title: 'Status',
                options: [
                    { label: 'Online', value: 'active' },
                    { label: 'Offline', value: 'offline' },
                ],
            },
        ],
        [],
    );

    // Map AdminUser to User for the edit dialog
    const userToEdit = useStableValue(() => {
        if (!editingAdmin) return null;
        return {
            ...editingAdmin,
            institutionId: editingAdmin.institutionId ?? null,
            departmentId: editingAdmin.departmentId ?? null,
        } as User;
    }, [editingAdmin]);

    const administratorColumns = useStableValue(
        () => columns(setEditingAdmin, handleDelete, authUser?.id),
        [handleDelete, setEditingAdmin, authUser?.id],
    );

    const deleteConfig = adminToDelete
        ? getAdministratorRoleConfig(adminToDelete.role as AdministratorRole)
        : config;

    return (
        <div className="space-y-4">
            <DataTable
                columns={administratorColumns}
                data={administrators}
                searchValue={searchTerm}
                onSearchChange={onSearchChange}
                searchKey="email"
                searchPlaceholder={config.searchPlaceholder}
                facets={facets}
                isLoading={isLoading}
                emptyContent={<AdministratorsEmptyState role={role} />}
                rowSelection={rowSelection}
                onRowSelectionChange={setRowSelection}
                toolbarActions={
                    selectedIds.length > 0 ? (
                        <PermissionGuard permission="users:delete">
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setIsBulkDeleteDialogOpen(true)}
                                className="h-8"
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete {selectedIds.length}
                            </Button>
                        </PermissionGuard>
                    ) : null
                }
            />

            <EditSuperAdminDialog
                role={(userToEdit?.role as AdministratorRole) || role}
                user={userToEdit}
                open={!!editingAdmin}
                onOpenChange={(open) => !open && setEditingAdmin(null)}
            />

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action will permanently delete the{' '}
                            {deleteConfig.deleteDescriptionLabel} for
                            <strong>
                                {' '}
                                {adminToDelete?.firstName} {adminToDelete?.lastName}
                            </strong>{' '}
                            and remove all associated metadata. This cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleteMutation.isPending}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                confirmDelete();
                            }}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={deleteMutation.isPending}
                        >
                            {deleteMutation.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                'Delete Account'
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action will permanently delete the selected {selectedIds.length}{' '}
                            administrator account(s) and remove all associated metadata. This cannot
                            be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleteUsersMutation.isPending}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                handleBulkDelete();
                            }}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={deleteUsersMutation.isPending}
                        >
                            {deleteUsersMutation.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                'Delete Accounts'
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
