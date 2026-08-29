import { describe, expect, expectTypeOf, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import type { Selectable } from 'kysely';
import type { DB, roles, class_roles, rbac_role_permissions, user_roles } from '../generated/types';

describe('Roles Migration & Schema', () => {
    it('generates correct types with dynamic role fields and permission_sync_mode', () => {
        const record: Selectable<roles> = {
            role_id: 1,
            role_name: 'support',
            description: 'Support Role',
            is_system: true,
            created_at: new Date(),
            updated_at: new Date(),
            slug: 'support',
            domain_scope: ['support'],
            is_active: true,
            assignable_by: ['support'],
            permission_sync_mode: 'BLUEPRINT',
        };

        expect(record.role_id).toBe(1);
        expect(record.slug).toBe('support');
        expect(record.domain_scope).toContain('support');
        expect(record.is_active).toBe(true);
        expect(record.permission_sync_mode).toBe('BLUEPRINT');
        expectTypeOf<DB['roles']>().toEqualTypeOf<roles>();
    });

    it('verifies role identifiers are typed as integers across role tables', () => {
        const classRole: Partial<Selectable<class_roles>> = { role_id: 10 };
        const rbacRole: Partial<Selectable<rbac_role_permissions>> = { role_id: 10 };
        const userRole: Partial<Selectable<user_roles>> = { role_id: 10 };

        expectTypeOf(classRole.role_id).toEqualTypeOf<number | undefined>();
        expectTypeOf(rbacRole.role_id).toEqualTypeOf<number | undefined>();
        expectTypeOf(userRole.role_id).toEqualTypeOf<number | undefined>();
    });

    it('verifies dynamic roles migration SQL exists and contains column definitions', () => {
        const migrationPath = path.resolve(
            __dirname,
            '../../prisma/migrations/20260601112500_add_dynamic_roles_fields/migration.sql',
        );
        expect(fs.existsSync(migrationPath)).toBe(true);

        const content = fs.readFileSync(migrationPath, 'utf8');
        expect(content).toContain('ALTER TABLE "public"."roles" ADD COLUMN "slug" VARCHAR(50);');
        expect(content).toContain('ALTER TABLE "public"."roles" ADD COLUMN "domain_scope" TEXT[]');
        expect(content).toContain('ALTER TABLE "public"."roles" ADD COLUMN "is_active" BOOLEAN');
        expect(content).toContain('CREATE UNIQUE INDEX "roles_slug_key"');
    });

    it('verifies expand role id capacity migration SQL exists and contains integer widening', () => {
        const migrationPath = path.resolve(
            __dirname,
            '../../prisma/migrations/20260624153000_expand_role_id_capacity/migration.sql',
        );
        expect(fs.existsSync(migrationPath)).toBe(true);

        const content = fs.readFileSync(migrationPath, 'utf8');
        expect(content).toContain('ALTER TABLE "public"."roles"\nALTER COLUMN "role_id" TYPE INTEGER;');
        expect(content).toContain('ALTER SEQUENCE "public"."roles_role_id_seq" AS INTEGER;');
    });

    it('verifies permission sync mode migration SQL exists and sets default and backfill', () => {
        const migrationPath = path.resolve(
            __dirname,
            '../../prisma/migrations/20260706132000_add_role_permission_sync_mode_and_nullable_defaults/migration.sql',
        );
        expect(fs.existsSync(migrationPath)).toBe(true);

        const content = fs.readFileSync(migrationPath, 'utf8');
        expect(content).toContain(
            'ALTER TABLE "public"."roles" ADD COLUMN "permission_sync_mode" VARCHAR(20) NOT NULL DEFAULT \'BLUEPRINT\';',
        );
        expect(content).toContain("UPDATE \"public\".\"roles\" SET \"permission_sync_mode\" = 'CUSTOM'");
        expect(content).toContain("UPDATE \"public\".\"roles\" SET \"permission_sync_mode\" = 'BLUEPRINT'");
    });
});
