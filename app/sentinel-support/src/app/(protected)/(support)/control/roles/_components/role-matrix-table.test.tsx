import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RoleMatrixTable } from './role-matrix-table';

const sortedRoles = [
    {
        id: 1,
        name: 'Support',
        slug: 'support',
        description: 'Support role',
        isSystem: true,
        domainScope: ['support'],
        isActive: true,
        assignableBy: [],
        permissionSyncMode: 'BLUEPRINT' as const,
        permissionIds: ['perm-1'],
        permissionCount: 1,
        assignmentCount: 4,
        createdAt: null,
        updatedAt: null,
    },
    {
        id: 2,
        name: 'Admin',
        slug: 'admin',
        description: 'Admin role',
        isSystem: true,
        domainScope: ['core'],
        isActive: true,
        assignableBy: [],
        permissionSyncMode: 'CUSTOM' as const,
        permissionIds: ['perm-1'],
        permissionCount: 1,
        assignmentCount: 2,
        createdAt: null,
        updatedAt: null,
    },
    {
        id: 3,
        name: 'Reviewer',
        slug: 'reviewer',
        description: 'Custom role',
        isSystem: false,
        domainScope: ['app'],
        isActive: true,
        assignableBy: [],
        permissionSyncMode: 'CUSTOM' as const,
        permissionIds: [],
        permissionCount: 0,
        assignmentCount: 0,
        createdAt: null,
        updatedAt: null,
    },
];

const groupedPermissions = [
    {
        categoryKey: 'SYSTEM',
        categoryLabel: 'System Support',
        modules: [
            {
                moduleKey: 'pdf_templates',
                moduleLabel: 'PDF Templates',
                helperText: 'Manage PDF template access.',
                permissions: [
                    {
                        id: 'perm-pdf-templates-manage',
                        key: 'pdf_templates:manage',
                        moduleKey: 'pdf_templates',
                        actionKey: 'manage',
                        category: 'SYSTEM',
                        scope: 'global',
                        name: 'Manage PDF Templates',
                        description: 'Create, update, and delete PDF templates.',
                        isSystem: true,
                        roleCount: 1,
                        overrideCount: 0,
                        createdAt: null,
                        updatedAt: null,
                    },
                ],
            },
            {
                moduleKey: 'examinations',
                moduleLabel: 'Examinations',
                helperText: 'Manage examination document exports.',
                permissions: [
                    {
                        id: 'perm-exam-results-report',
                        key: 'examinations:export_results_report',
                        moduleKey: 'examinations',
                        actionKey: 'export_results_report',
                        category: 'EXAM',
                        scope: 'institution',
                        name: 'Export Examination Results Report',
                        description: 'Export examination results report PDFs.',
                        isSystem: true,
                        roleCount: 1,
                        overrideCount: 0,
                        createdAt: null,
                        updatedAt: null,
                    },
                ],
            },
        ],
    },
];

describe('RoleMatrixTable', () => {
    it('renders sync-mode badges and only shows reset for customized system roles', () => {
        const onSetRoleToDelete = vi.fn();
        const onSetRoleToReset = vi.fn();

        render(
            <RoleMatrixTable
                sortedRoles={sortedRoles}
                groupedPermissions={groupedPermissions}
                draftPermissionIdsByRoleId={{
                    1: ['perm-pdf-templates-manage'],
                    2: ['perm-pdf-templates-manage'],
                    3: [],
                }}
                savingRoleIds={[]}
                collapsedCategoryKeys={{}}
                collapsedModuleKeys={{}}
                editingRoleId={null}
                editingRoleName=""
                onToggleCategory={vi.fn()}
                onToggleModule={vi.fn()}
                onPermissionToggle={vi.fn()}
                onStartRoleNameEdit={vi.fn()}
                onSubmitRoleNameEdit={vi.fn()}
                onSetEditingRoleId={vi.fn()}
                onSetEditingRoleName={vi.fn()}
                onSetRoleToDelete={onSetRoleToDelete}
                onSetRoleToReset={onSetRoleToReset}
            />,
        );

        expect(screen.getByText('BLUEPRINT')).toBeDefined();
        expect(screen.getByText('CUSTOM')).toBeDefined();
        expect(screen.getByText('Manage PDF Templates')).toBeTruthy();
        expect(screen.getByText('Export Examination Results Report')).toBeTruthy();
        expect(
            screen.getByRole('checkbox', {
                name: 'Manage PDF Templates for Support',
            }),
        ).toBeTruthy();
        expect(
            screen.getByRole('checkbox', {
                name: 'Export Examination Results Report for Support',
            }),
        ).toBeTruthy();
        expect(screen.queryByText('Reset')).toBeTruthy();
        expect(screen.queryByText('Delete')).toBeTruthy();

        fireEvent.click(screen.getByText('Reset'));
        expect(onSetRoleToReset).toHaveBeenCalledWith(sortedRoles[1]);

        fireEvent.click(screen.getByText('Delete'));
        expect(onSetRoleToDelete).toHaveBeenCalledWith(sortedRoles[2]);
    });
});
