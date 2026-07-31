import { describe, expect, it } from 'vitest';
import { OpenAPIHono } from '@hono/zod-openapi';
import { testWithDbClient } from '../../../../lib/test-with-db-client';
import { getUserActivePermissions } from '../../../security/permission/data/get-user-active-permissions';
import {
    updateExamEssayRubricRoute,
    updateExamEssayRubricRouteHandler,
} from './update-exam-essay-rubric.controller';
import {
    resetExamEssayRubricRoute,
    resetExamEssayRubricRouteHandler,
} from './reset-exam-essay-rubric.controller';
import type { EssayRubricDefinition } from '@sentinel/shared';

describe('Rubric RBAC Integration Test', () => {
    testWithDbClient(
        'should grant examinations:override_essay_rubric permission, verify update/reset success, and return 403 on revocation',
        async ({ dbClient }) => {
            // 1. Fetch test user and exam
            const user = await dbClient.selectFrom('users').selectAll().limit(1).executeTakeFirst();
            const exam = await dbClient.selectFrom('exams').selectAll().limit(1).executeTakeFirst();

            expect(user).toBeDefined();
            expect(exam).toBeDefined();

            // Make the test user the creator of the exam to satisfy staff visibility check
            await dbClient
                .updateTable('exams')
                .set({ created_by: user!.id })
                .where('exam_id', '=', exam!.exam_id)
                .execute();

            // 2. Fetch or insert the required system permission
            let permission = await dbClient
                .selectFrom('rbac_permissions')
                .selectAll()
                .where('permission_key', '=', 'examinations:override_essay_rubric')
                .executeTakeFirst();

            if (!permission) {
                permission = await dbClient
                    .insertInto('rbac_permissions')
                    .values({
                        permission_key: 'examinations:override_essay_rubric',
                        module_key: 'examinations',
                        action_key: 'override_essay_rubric',
                        name: 'Override Essay Rubric',
                        description: 'Allows overriding essay rubrics',
                        is_system: true,
                    })
                    .returningAll()
                    .executeTakeFirstOrThrow();
            }

            // 3. Create a test role
            const role = await dbClient
                .insertInto('roles')
                .values({
                    role_name: 'Rubric Override Test Role',
                    slug: 'rubric-override-test-role',
                    description: 'Role for testing rubric override permission',
                    domain_scope: [],
                    is_active: true,
                    assignable_by: ['admin'],
                    is_system: false,
                })
                .returningAll()
                .executeTakeFirstOrThrow();

            // 4. Assign role to user
            await dbClient
                .insertInto('user_roles')
                .values({
                    user_id: user!.id,
                    role_id: role.role_id,
                })
                .execute();

            // 5. Initialize the Honos test router
            const app = new OpenAPIHono();
            app.use('*', async (c, next) => {
                c.set('dbClient', dbClient);
                c.set('user', { id: user!.id } as any);
                c.set('supabaseUser', { user_metadata: { role: 'instructor' } } as any);
                c.set('institutionId', exam!.institution_id);
                const activePerms = await getUserActivePermissions(dbClient, user!.id);
                c.set('activePermissionKeys', new Set(activePerms));
                await next();
            });

            app.openapi(updateExamEssayRubricRoute, updateExamEssayRubricRouteHandler);
            app.openapi(resetExamEssayRubricRoute, resetExamEssayRubricRouteHandler);

            const testRubricDef: EssayRubricDefinition = {
                criteria: [
                    {
                        key: 'content',
                        name: 'Content Quality',
                        description: 'Criteria description',
                        weight: 1.0,
                        levels: {
                            '4': 'Level 4 description',
                            '3': 'Level 3 description',
                            '2': 'Level 2 description',
                            '1': 'Level 1 description',
                            '0': 'Level 0 description',
                        },
                    },
                ],
            };

            // Scenario A: Without the role-permission mapping, request should fail with 403
            const resUpdateBlocked = await app.request(`/exams/${exam!.exam_id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(testRubricDef),
            });
            expect(resUpdateBlocked.status).toBe(403);

            const resResetBlocked = await app.request(`/exams/${exam!.exam_id}`, {
                method: 'DELETE',
            });
            expect(resResetBlocked.status).toBe(403);

            // Scenario B: Map permission to role (grant permission)
            await dbClient
                .insertInto('rbac_role_permissions')
                .values({
                    role_id: role.role_id,
                    permission_id: permission.permission_id,
                })
                .execute();

            // Check that active permissions now contain the key
            const permsWithGrant = await getUserActivePermissions(dbClient, user!.id);
            expect(permsWithGrant).toContain('examinations:override_essay_rubric');

            // Request should now succeed (200)
            const resUpdateAllowed = await app.request(`/exams/${exam!.exam_id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(testRubricDef),
            });
            expect(resUpdateAllowed.status).toBe(200);

            const resResetAllowed = await app.request(`/exams/${exam!.exam_id}`, {
                method: 'DELETE',
            });
            expect(resResetAllowed.status).toBe(200);

            // Scenario C: Remove the role-permission mapping (revoke permission)
            await dbClient
                .deleteFrom('rbac_role_permissions')
                .where('role_id', '=', role.role_id)
                .where('permission_id', '=', permission.permission_id)
                .execute();

            // Request should fail again with 403
            const resUpdateRevoked = await app.request(`/exams/${exam!.exam_id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(testRubricDef),
            });
            expect(resUpdateRevoked.status).toBe(403);

            const resResetRevoked = await app.request(`/exams/${exam!.exam_id}`, {
                method: 'DELETE',
            });
            expect(resResetRevoked.status).toBe(403);
        },
    );
});
