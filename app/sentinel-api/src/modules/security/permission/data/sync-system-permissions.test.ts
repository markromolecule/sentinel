import { describe, expect, it } from 'vitest';
import { ALL_PERMISSIONS, SYSTEM_ROLE_BLUEPRINTS } from '@sentinel/shared/constants';
import { syncSystemPermissions } from './sync-system-permissions';
import { testWithDbClient } from '../../../../lib/test-with-db-client';

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
            'examinations:override_essay_rubric',
        ];

        const activeKeys = ALL_PERMISSIONS.map((p) => p.id);

        for (const key of expectedKeys) {
            expect(activeKeys).toContain(key);
        }
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
});
