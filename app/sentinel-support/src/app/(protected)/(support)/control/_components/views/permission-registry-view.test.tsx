import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PermissionRegistryView } from './permission-registry-view';

const mockUseAccessControlPermissionsQuery = vi.fn();

const permissionFixtures = [
    {
        id: 'perm-reports-generate',
        key: 'reports:generate',
        moduleKey: 'reports',
        actionKey: 'generate',
        category: 'DASHBOARD',
        scope: 'institution',
        name: 'Generate Reports',
        description: 'Trigger generation of analytical reports.',
        isSystem: true,
        roleCount: 1,
        overrideCount: 0,
        createdAt: null,
        updatedAt: null,
    },
    {
        id: 'perm-pdf-templates-view',
        key: 'pdf_templates:view',
        moduleKey: 'pdf_templates',
        actionKey: 'view',
        category: 'SYSTEM',
        scope: 'global',
        name: 'View PDF Templates',
        description: 'View default and override PDF templates.',
        isSystem: true,
        roleCount: 1,
        overrideCount: 0,
        createdAt: null,
        updatedAt: null,
    },
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
    {
        id: 'perm-branding-manage',
        key: 'institution_branding:manage',
        moduleKey: 'institution_branding',
        actionKey: 'manage',
        category: 'SYSTEM',
        scope: 'global',
        name: 'Manage Institution Branding',
        description: 'Manage logo and branding configs.',
        isSystem: true,
        roleCount: 1,
        overrideCount: 0,
        createdAt: null,
        updatedAt: null,
    },
    {
        id: 'perm-answer-key-export',
        key: 'examinations:export_answer_key',
        moduleKey: 'examinations',
        actionKey: 'export_answer_key',
        category: 'EXAM',
        scope: 'institution',
        name: 'Export Exam Answer Key',
        description: 'Export correct answer keys for examinations.',
        isSystem: true,
        roleCount: 1,
        overrideCount: 0,
        createdAt: null,
        updatedAt: null,
    },
    {
        id: 'perm-results-report-export',
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
];

vi.mock('@sentinel/hooks', () => ({
    useAccessControlPermissionsQuery: (...args: unknown[]) =>
        mockUseAccessControlPermissionsQuery(...args),
    useCreateAccessControlPermissionMutation: () => ({ isPending: false }),
    useUpdateAccessControlPermissionMutation: () => ({ isPending: false }),
    useDeleteAccessControlPermissionMutation: () => ({ isPending: false }),
    useDebounce: (value: string) => value,
    useStableValue: (factory: () => unknown) => factory(),
}));

vi.mock('@sentinel/ui', () => ({
    AlertDialog: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    AlertDialogAction: ({ children }: { children: ReactNode }) => <button>{children}</button>,
    AlertDialogCancel: ({ children }: { children: ReactNode }) => <button>{children}</button>,
    AlertDialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    AlertDialogDescription: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    AlertDialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    AlertDialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    AlertDialogTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    Button: ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => (
        <button onClick={onClick}>{children}</button>
    ),
    SearchBar: ({
        value,
        onChange,
        placeholder,
    }: {
        value: string;
        onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
        placeholder?: string;
    }) => <input aria-label={placeholder} value={value} onChange={onChange} />,
    Table: ({ children }: { children: ReactNode }) => <table>{children}</table>,
    TableBody: ({ children }: { children: ReactNode }) => <tbody>{children}</tbody>,
    TableHead: ({ children }: { children: ReactNode }) => <th>{children}</th>,
    TableHeader: ({ children }: { children: ReactNode }) => <thead>{children}</thead>,
    TableRow: ({ children }: { children: ReactNode }) => <tr>{children}</tr>,
}));

vi.mock('@/app/(protected)/(support)/control/_components', () => ({
    AccessControlEmptyState: ({ title, description }: { title: string; description: string }) => (
        <div>
            <div>{title}</div>
            <div>{description}</div>
        </div>
    ),
    AccessControlErrorState: ({ message }: { message: string }) => <div>{message}</div>,
    AccessControlLoadingState: ({ label }: { label: string }) => <div>{label}</div>,
    PermissionEditorDialog: () => null,
}));

vi.mock('../permissions/permission-table-components', () => ({
    PermissionCategoryRow: ({ label, onToggle }: { label: string; onToggle: () => void }) => (
        <tr>
            <td>
                <button onClick={onToggle}>{label}</button>
            </td>
        </tr>
    ),
    PermissionModuleRow: ({ label, onToggle }: { label: string; onToggle: () => void }) => (
        <tr>
            <td>
                <button onClick={onToggle}>{label}</button>
            </td>
        </tr>
    ),
    PermissionDataRow: ({ permission }: { permission: { name: string } }) => (
        <tr>
            <td>{permission.name}</td>
        </tr>
    ),
}));

describe('PermissionRegistryView', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        mockUseAccessControlPermissionsQuery.mockImplementation((search = '') => {
            const normalizedSearch = String(search).trim().toLowerCase();
            const data = normalizedSearch
                ? permissionFixtures.filter(
                      (permission) =>
                          permission.key.includes(normalizedSearch) ||
                          permission.name.toLowerCase().includes(normalizedSearch),
                  )
                : permissionFixtures;

            return {
                data,
                isLoading: false,
                error: null,
            };
        });
    });

    it('shows the new report and PDF template permissions in the registry', () => {
        render(<PermissionRegistryView />);

        fireEvent.click(screen.getByRole('button', { name: 'Dashboard & Insights' }));
        fireEvent.click(screen.getByRole('button', { name: 'Reports' }));
        fireEvent.click(screen.getByRole('button', { name: 'Examination Controls' }));
        fireEvent.click(screen.getByRole('button', { name: 'Examinations' }));
        fireEvent.click(screen.getByRole('button', { name: 'System Support' }));
        fireEvent.click(screen.getByRole('button', { name: 'Pdf Templates' }));
        fireEvent.click(screen.getByRole('button', { name: 'Institution Branding' }));

        expect(screen.getByText('Generate Reports')).toBeTruthy();
        expect(screen.getByText('View PDF Templates')).toBeTruthy();
        expect(screen.getByText('Manage PDF Templates')).toBeTruthy();
        expect(screen.getByText('Manage Institution Branding')).toBeTruthy();
        expect(screen.getByText('Export Exam Answer Key')).toBeTruthy();
        expect(screen.getByText('Export Examination Results Report')).toBeTruthy();
    });

    it('lets support search narrow the registry to a new PDF template permission', () => {
        render(<PermissionRegistryView />);

        fireEvent.change(
            screen.getByRole('textbox', { name: /search by key, action, or module/i }),
            {
                target: { value: 'pdf_templates:manage' },
            },
        );

        fireEvent.click(screen.getByRole('button', { name: 'System Support' }));
        fireEvent.click(screen.getByRole('button', { name: 'Pdf Templates' }));

        expect(mockUseAccessControlPermissionsQuery).toHaveBeenLastCalledWith(
            'pdf_templates:manage',
        );
        expect(screen.getByText('Manage PDF Templates')).toBeTruthy();
        expect(screen.queryByText('Generate Reports')).toBeNull();
    });
});
