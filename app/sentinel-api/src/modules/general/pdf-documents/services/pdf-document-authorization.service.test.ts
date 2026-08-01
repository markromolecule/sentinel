import { describe, expect, it } from 'vitest';
import {
    assertOverallReportTemplateScope,
    canAccessPdfInstitutionScope,
    requirePdfDocumentAccess,
    requireAllPdfDocumentPermissions,
    resolvePdfAccessibleInstitutionIds,
} from './pdf-document-authorization.service';

function createDbClient(
    institutions: Array<{
        id: string;
        institution_kind: string;
        parent_institution_id?: string | null;
    }>,
) {
    return {
        selectFrom: (table: string) => ({
            select: () => ({
                where: (column: string, _op: string, value: string) => {
                    if (table === 'institutions' && column === 'id') {
                        return {
                            executeTakeFirst: async () =>
                                institutions.find((institution) => institution.id === value) ??
                                null,
                        };
                    }

                    if (table === 'institutions' && column === 'parent_institution_id') {
                        return {
                            execute: async () =>
                                institutions
                                    .filter(
                                        (institution) =>
                                            institution.parent_institution_id === value,
                                    )
                                    .map((institution) => ({ id: institution.id })),
                        };
                    }

                    return {
                        executeTakeFirst: async () => null,
                        execute: async () => [],
                    };
                },
            }),
        }),
    } as any;
}

describe('pdf-document-authorization.service', () => {
    it('allows any role with one matching permission', () => {
        expect(() =>
            requirePdfDocumentAccess({
                activePermissionKeys: ['pdf_templates:view'],
                requiredPermissions: ['pdf_templates:view', 'pdf_templates:manage'],
            }),
        ).not.toThrow();
    });

    it('allows non-support roles when they hold the required permission', () => {
        expect(() =>
            requirePdfDocumentAccess({
                activePermissionKeys: ['reports:export'],
                requiredPermissions: 'reports:export',
            }),
        ).not.toThrow();
    });

    it('rejects callers without the required permission', () => {
        expect(() =>
            requirePdfDocumentAccess({
                activePermissionKeys: ['institutions:view'],
                requiredPermissions: 'pdf_templates:manage',
            }),
        ).toThrowError(/Missing required PDF document permission/);
    });

    describe('requireAllPdfDocumentPermissions', () => {
        it('allows callers that have all required permissions', () => {
            expect(() =>
                requireAllPdfDocumentPermissions({
                    activePermissionKeys: ['perm:one', 'perm:two', 'perm:three'],
                    requiredPermissions: ['perm:one', 'perm:two'],
                }),
            ).not.toThrow();
        });

        it('rejects callers that are missing any required permission', () => {
            expect(() =>
                requireAllPdfDocumentPermissions({
                    activePermissionKeys: ['perm:one'],
                    requiredPermissions: ['perm:one', 'perm:two'],
                }),
            ).toThrowError(/Forbidden. Missing required PDF document permissions/);
        });
    });

    it('allows the global overall-report scope', async () => {
        await expect(
            assertOverallReportTemplateScope(createDbClient([]), null),
        ).resolves.toBeUndefined();
    });

    it('allows parent institutions for overall-report scope', async () => {
        await expect(
            assertOverallReportTemplateScope(
                createDbClient([{ id: 'parent-id', institution_kind: 'PARENT' }]),
                'parent-id',
            ),
        ).resolves.toBeUndefined();
    });

    it('rejects child and standalone institutions for overall-report scope', async () => {
        await expect(
            assertOverallReportTemplateScope(
                createDbClient([{ id: 'child-id', institution_kind: 'CHILD' }]),
                'child-id',
            ),
        ).rejects.toMatchObject({ status: 400 });

        await expect(
            assertOverallReportTemplateScope(
                createDbClient([{ id: 'standalone-id', institution_kind: 'STANDALONE' }]),
                'standalone-id',
            ),
        ).rejects.toMatchObject({ status: 400 });
    });

    it('rejects nonexistent institutions for overall-report scope', async () => {
        await expect(
            assertOverallReportTemplateScope(createDbClient([]), 'missing-id'),
        ).rejects.toMatchObject({ status: 400 });
    });

    it('keeps child and standalone support accounts locked to their own institution', async () => {
        const dbClient = createDbClient([
            { id: 'branch-1', institution_kind: 'CHILD', parent_institution_id: 'parent-1' },
            { id: 'standalone-1', institution_kind: 'STANDALONE' },
        ]);

        await expect(resolvePdfAccessibleInstitutionIds(dbClient, 'branch-1')).resolves.toEqual([
            'branch-1',
        ]);
        await expect(canAccessPdfInstitutionScope(dbClient, 'branch-1', 'parent-1')).resolves.toBe(
            false,
        );

        await expect(resolvePdfAccessibleInstitutionIds(dbClient, 'standalone-1')).resolves.toEqual(
            ['standalone-1'],
        );
    });

    it('allows parent-institution support accounts to access their branches', async () => {
        const dbClient = createDbClient([
            { id: 'parent-1', institution_kind: 'PARENT' },
            { id: 'branch-1', institution_kind: 'CHILD', parent_institution_id: 'parent-1' },
            { id: 'branch-2', institution_kind: 'CHILD', parent_institution_id: 'parent-1' },
            { id: 'other-branch', institution_kind: 'CHILD', parent_institution_id: 'other' },
        ]);

        await expect(resolvePdfAccessibleInstitutionIds(dbClient, 'parent-1')).resolves.toEqual([
            'parent-1',
            'branch-1',
            'branch-2',
        ]);
        await expect(canAccessPdfInstitutionScope(dbClient, 'parent-1', 'branch-2')).resolves.toBe(
            true,
        );
        await expect(
            canAccessPdfInstitutionScope(dbClient, 'parent-1', 'other-branch'),
        ).resolves.toBe(false);
    });
});
