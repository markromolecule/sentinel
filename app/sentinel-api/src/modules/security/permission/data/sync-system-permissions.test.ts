import { describe, expect, it } from 'vitest';
import { ALL_PERMISSIONS, SYSTEM_ROLE_BLUEPRINTS } from '@sentinel/shared/constants';
import { syncSystemPermissions } from './sync-system-permissions';
import { testWithDbClient } from '../../../../lib/test-with-db-client';
import { syncSystemRoles } from '../../roles/data/sync-system-roles';
import { syncSystemRolePermissions } from '../../roles/data/sync-system-role-permissions';

describe('syncSystemPermissions', () => {
    it('should have all expected permission keys in the sync catalogue', () => {
        const expectedKeys = [
            'rooms:view',
            'rooms:manage',
            'semesters:view',
            'semesters:manage',
            'departments:view',
            'departments:manage',
            'institutions:view',
            'institutions:manage',
            'institutions:cross-tenant-view',
            'permissions:view',
            'permissions:manage',
            'assessments:view',
            'assessments:manage',
            'examinations:create',
            'examinations:update',
            'examinations:delete',
            'examinations:assign',
            'examinations:monitor_live_video',
            'ai:generate_questions',
            'reports:generate',
            'pdf_templates:view',
            'pdf_templates:manage',
            'institution_branding:manage',
            'examinations:export_answer_key',
            'examinations:export_results_report',
            'examinations:override_essay_rubric',
        ];

        const activeKeys = ALL_PERMISSIONS.map((p) => p.id);

        for (const key of expectedKeys) {
            expect(activeKeys).toContain(key);
        }
    });

    it('should define export results report permission and assign it to support, superadmin, admin, and instructor blueprints but not student', () => {
        const activeKeys = ALL_PERMISSIONS.map((p) => p.id);
        expect(activeKeys).toContain('examinations:export_results_report');

        expect(SYSTEM_ROLE_BLUEPRINTS.support.permissionKeys).toContain(
            'examinations:export_results_report',
        );
        expect(SYSTEM_ROLE_BLUEPRINTS.superadmin.permissionKeys).toContain(
            'examinations:export_results_report',
        );
        expect(SYSTEM_ROLE_BLUEPRINTS.admin.permissionKeys).toContain(
            'examinations:export_results_report',
        );
        expect(SYSTEM_ROLE_BLUEPRINTS.instructor.permissionKeys).toContain(
            'examinations:export_results_report',
        );
        expect(SYSTEM_ROLE_BLUEPRINTS.student.permissionKeys).not.toContain(
            'examinations:export_results_report',
        );
    });

    it('should grant the generate questions permission to the support blueprint', () => {
        expect(SYSTEM_ROLE_BLUEPRINTS.support.permissionKeys).toContain('ai:generate_questions');
    });

    it('should grant the new PDF and branding permissions to the support blueprint', () => {
        expect(SYSTEM_ROLE_BLUEPRINTS.support.permissionKeys).toContain('reports:generate');
        expect(SYSTEM_ROLE_BLUEPRINTS.support.permissionKeys).toContain('pdf_templates:view');
        expect(SYSTEM_ROLE_BLUEPRINTS.support.permissionKeys).toContain('pdf_templates:manage');
        expect(SYSTEM_ROLE_BLUEPRINTS.support.permissionKeys).toContain(
            'institution_branding:manage',
        );
        expect(SYSTEM_ROLE_BLUEPRINTS.support.permissionKeys).toContain(
            'examinations:export_answer_key',
        );
    });

    it('should define feedback:view and grant it to the support blueprint', () => {
        const activeKeys = ALL_PERMISSIONS.map((p) => p.id);
        expect(activeKeys).toContain('feedback:view');
        expect(SYSTEM_ROLE_BLUEPRINTS.support.permissionKeys).toContain('feedback:view');
    });

    it('should define classrooms:archive permission and assign it to key roles', () => {
        const activeKeys = ALL_PERMISSIONS.map((p) => p.id);
        expect(activeKeys).toContain('classrooms:archive');

        expect(SYSTEM_ROLE_BLUEPRINTS.support.permissionKeys).toContain('classrooms:archive');
        expect(SYSTEM_ROLE_BLUEPRINTS.superadmin.permissionKeys).toContain('classrooms:archive');
        expect(SYSTEM_ROLE_BLUEPRINTS.admin.permissionKeys).toContain('classrooms:archive');
        expect(SYSTEM_ROLE_BLUEPRINTS.instructor.permissionKeys).not.toContain(
            'classrooms:archive',
        );
    });

    it('should define preview student enrollment permission and assign it to managed roles', () => {
        const activeKeys = ALL_PERMISSIONS.map((p) => p.id);
        expect(activeKeys).toContain('classrooms:preview_student_enrollment');

        expect(SYSTEM_ROLE_BLUEPRINTS.support.permissionKeys).toContain(
            'classrooms:preview_student_enrollment',
        );
        expect(SYSTEM_ROLE_BLUEPRINTS.superadmin.permissionKeys).toContain(
            'classrooms:preview_student_enrollment',
        );
        expect(SYSTEM_ROLE_BLUEPRINTS.admin.permissionKeys).toContain(
            'classrooms:preview_student_enrollment',
        );
        expect(SYSTEM_ROLE_BLUEPRINTS.instructor.permissionKeys).toContain(
            'classrooms:preview_student_enrollment',
        );
        expect(SYSTEM_ROLE_BLUEPRINTS.student.permissionKeys).not.toContain(
            'classrooms:preview_student_enrollment',
        );
    });

    it('should define enroll students permission and assign it to managed roles', () => {
        const activeKeys = ALL_PERMISSIONS.map((p) => p.id);
        expect(activeKeys).toContain('classrooms:enroll_students');

        expect(SYSTEM_ROLE_BLUEPRINTS.support.permissionKeys).toContain(
            'classrooms:enroll_students',
        );
        expect(SYSTEM_ROLE_BLUEPRINTS.superadmin.permissionKeys).toContain(
            'classrooms:enroll_students',
        );
        expect(SYSTEM_ROLE_BLUEPRINTS.admin.permissionKeys).toContain('classrooms:enroll_students');
        expect(SYSTEM_ROLE_BLUEPRINTS.instructor.permissionKeys).toContain(
            'classrooms:enroll_students',
        );
        expect(SYSTEM_ROLE_BLUEPRINTS.student.permissionKeys).not.toContain(
            'classrooms:enroll_students',
        );
    });

    it('should define unenroll students permission and assign it to managed roles', () => {
        const activeKeys = ALL_PERMISSIONS.map((p) => p.id);
        expect(activeKeys).toContain('classrooms:unenroll_students');

        expect(SYSTEM_ROLE_BLUEPRINTS.support.permissionKeys).toContain(
            'classrooms:unenroll_students',
        );
        expect(SYSTEM_ROLE_BLUEPRINTS.superadmin.permissionKeys).toContain(
            'classrooms:unenroll_students',
        );
        expect(SYSTEM_ROLE_BLUEPRINTS.admin.permissionKeys).toContain(
            'classrooms:unenroll_students',
        );
        expect(SYSTEM_ROLE_BLUEPRINTS.instructor.permissionKeys).toContain(
            'classrooms:unenroll_students',
        );
        expect(SYSTEM_ROLE_BLUEPRINTS.student.permissionKeys).not.toContain(
            'classrooms:unenroll_students',
        );
    });

    it('should define exam CRUD and assignment permissions for managed roles', () => {
        const activeKeys = ALL_PERMISSIONS.map((p) => p.id);

        expect(activeKeys).toEqual(
            expect.arrayContaining([
                'examinations:create',
                'examinations:update',
                'examinations:delete',
                'examinations:assign',
            ]),
        );

        expect(SYSTEM_ROLE_BLUEPRINTS.support.permissionKeys).toEqual(
            expect.arrayContaining([
                'examinations:create',
                'examinations:update',
                'examinations:delete',
                'examinations:assign',
            ]),
        );
        expect(SYSTEM_ROLE_BLUEPRINTS.superadmin.permissionKeys).toEqual(
            expect.arrayContaining([
                'examinations:create',
                'examinations:update',
                'examinations:delete',
                'examinations:assign',
            ]),
        );
        expect(SYSTEM_ROLE_BLUEPRINTS.admin.permissionKeys).toEqual(
            expect.arrayContaining([
                'examinations:create',
                'examinations:update',
                'examinations:delete',
                'examinations:assign',
            ]),
        );
        expect(SYSTEM_ROLE_BLUEPRINTS.instructor.permissionKeys).toEqual(
            expect.arrayContaining([
                'examinations:create',
                'examinations:update',
                'examinations:delete',
                'examinations:assign',
            ]),
        );
    });

    it('should define live-video monitoring permission only for authorized staff blueprints', () => {
        const activeKeys = ALL_PERMISSIONS.map((p) => p.id);

        expect(activeKeys).toContain('examinations:monitor_live_video');
        expect(SYSTEM_ROLE_BLUEPRINTS.superadmin.permissionKeys).toContain(
            'examinations:monitor_live_video',
        );
        expect(SYSTEM_ROLE_BLUEPRINTS.admin.permissionKeys).toContain(
            'examinations:monitor_live_video',
        );
        expect(SYSTEM_ROLE_BLUEPRINTS.instructor.permissionKeys).toContain(
            'examinations:monitor_live_video',
        );
        expect(SYSTEM_ROLE_BLUEPRINTS.support.permissionKeys).not.toContain(
            'examinations:monitor_live_video',
        );
        expect(SYSTEM_ROLE_BLUEPRINTS.student.permissionKeys).not.toContain(
            'examinations:monitor_live_video',
        );
    });

    it('should define override essay rubric permission and assign it to instructor, admin, superadmin, and support blueprints', () => {
        const activeKeys = ALL_PERMISSIONS.map((p) => p.id);
        expect(activeKeys).toContain('examinations:override_essay_rubric');

        expect(SYSTEM_ROLE_BLUEPRINTS.superadmin.permissionKeys).toContain(
            'examinations:override_essay_rubric',
        );
        expect(SYSTEM_ROLE_BLUEPRINTS.admin.permissionKeys).toContain(
            'examinations:override_essay_rubric',
        );
        expect(SYSTEM_ROLE_BLUEPRINTS.instructor.permissionKeys).toContain(
            'examinations:override_essay_rubric',
        );
        expect(SYSTEM_ROLE_BLUEPRINTS.support.permissionKeys).toContain(
            'examinations:override_essay_rubric',
        );
        expect(SYSTEM_ROLE_BLUEPRINTS.student.permissionKeys).not.toContain(
            'examinations:override_essay_rubric',
        );
    });

    testWithDbClient('should sync permissions into the database', async ({ dbClient }) => {
        // Run sync
        await syncSystemPermissions(dbClient);

        // Fetch all synced system permissions from the db
        const dbPermissions = await dbClient
            .selectFrom('rbac_permissions')
            .selectAll()
            .where('is_system', '=', true)
            .execute();

        const dbKeys = dbPermissions.map((p) => p.permission_key);
        const expectedKeys = ALL_PERMISSIONS.map((p) => p.id.toLowerCase().trim());

        for (const key of expectedKeys) {
            expect(dbKeys).toContain(key);
        }
    });

    testWithDbClient(
        'should prove default-role membership, custom-role grant/revoke behavior, and Role Matrix catalog visibility for examinations:export_answer_key',
        async ({ dbClient }) => {
            // 1. Role Matrix catalog visibility
            await dbClient
                .updateTable('roles')
                .set({ permission_sync_mode: 'BLUEPRINT' })
                .execute();

            await syncSystemPermissions(dbClient);
            await syncSystemRoles(dbClient);
            await syncSystemRolePermissions(dbClient);

            const dbPermissions = await dbClient
                .selectFrom('rbac_permissions')
                .selectAll()
                .where('permission_key', '=', 'examinations:export_answer_key')
                .execute();

            expect(dbPermissions.length).toBe(1);
            const exportAnswerKeyPerm = dbPermissions[0];
            expect(exportAnswerKeyPerm.module_key).toBe('examinations');
            expect(exportAnswerKeyPerm.action_key).toBe('export_answer_key');
            expect(exportAnswerKeyPerm.scope).toBe('institution');

            // 2. Default-role membership
            const rolesWithPerm = await dbClient
                .selectFrom('roles as r')
                .innerJoin('rbac_role_permissions as rrp', 'rrp.role_id', 'r.role_id')
                .select('r.role_name')
                .where('rrp.permission_id', '=', exportAnswerKeyPerm.permission_id)
                .execute();

            const roleNamesWithPerm = rolesWithPerm.map((r) => r.role_name);
            expect(roleNamesWithPerm).toContain('support');
            expect(roleNamesWithPerm).toContain('superadmin');
            expect(roleNamesWithPerm).toContain('admin');
            expect(roleNamesWithPerm).toContain('instructor');
            expect(roleNamesWithPerm).not.toContain('student');

            // 3. Custom-role grant/revoke behavior
            const customRoleInsert = await dbClient
                .insertInto('roles')
                .values({
                    role_name: 'test-custom-role-export-key',
                    description: 'A test custom role for export key',
                    is_system: false,
                    permission_sync_mode: 'CUSTOM',
                })
                .returningAll()
                .executeTakeFirstOrThrow();

            // Grant permission
            await dbClient
                .insertInto('rbac_role_permissions')
                .values({
                    role_id: customRoleInsert.role_id,
                    permission_id: exportAnswerKeyPerm.permission_id,
                })
                .execute();

            let hasMapping = await dbClient
                .selectFrom('rbac_role_permissions')
                .selectAll()
                .where('role_id', '=', customRoleInsert.role_id)
                .where('permission_id', '=', exportAnswerKeyPerm.permission_id)
                .executeTakeFirst();
            expect(hasMapping).toBeTruthy();

            // Revoke permission
            await dbClient
                .deleteFrom('rbac_role_permissions')
                .where('role_id', '=', customRoleInsert.role_id)
                .where('permission_id', '=', exportAnswerKeyPerm.permission_id)
                .execute();

            hasMapping = await dbClient
                .selectFrom('rbac_role_permissions')
                .selectAll()
                .where('role_id', '=', customRoleInsert.role_id)
                .where('permission_id', '=', exportAnswerKeyPerm.permission_id)
                .executeTakeFirst();
            expect(hasMapping).toBeUndefined();

            // Cleanup
            await dbClient
                .deleteFrom('roles')
                .where('role_id', '=', customRoleInsert.role_id)
                .execute();
        },
    );
});
