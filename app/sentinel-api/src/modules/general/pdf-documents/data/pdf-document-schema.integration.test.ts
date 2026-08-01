import { describe, expect, it } from 'vitest';
import { testWithDbClient } from '../../../../lib/test-with-db-client';
import { randomUUID } from 'crypto';

describe('PDF Document Schema Integration', () => {
    testWithDbClient(
        'should enforce partial unique index on published global templates',
        async ({ dbClient }) => {
            // 1. Check if first published global template already exists
            const existingFirst = await dbClient
                .selectFrom('pdf_templates')
                .selectAll()
                .where('institution_id', 'is', null)
                .where('document_kind', '=', 'ANALYTICS_OVERALL')
                .where('status', '=', 'PUBLISHED')
                .executeTakeFirst();

            if (!existingFirst) {
                await dbClient
                    .insertInto('pdf_templates')
                    .values({
                        document_kind: 'ANALYTICS_OVERALL',
                        version: 1,
                        status: 'PUBLISHED',
                        header_config: JSON.stringify({ logo_placement: 'LEFT' }),
                        footer_config: JSON.stringify({ page_numbers: true }),
                    })
                    .execute();
            }

            // 2. Insert second published global template of different kind (should succeed)
            const existingSecond = await dbClient
                .selectFrom('pdf_templates')
                .selectAll()
                .where('institution_id', 'is', null)
                .where('document_kind', '=', 'EXAM_ANSWER_KEY')
                .where('status', '=', 'PUBLISHED')
                .executeTakeFirst();

            if (!existingSecond) {
                await dbClient
                    .insertInto('pdf_templates')
                    .values({
                        document_kind: 'EXAM_ANSWER_KEY',
                        version: 1,
                        status: 'PUBLISHED',
                        header_config: JSON.stringify({ logo_placement: 'RIGHT' }),
                        footer_config: JSON.stringify({ page_numbers: true }),
                    })
                    .execute();
            }

            // 3. Insert global draft template of same kind (should succeed)
            await dbClient
                .insertInto('pdf_templates')
                .values({
                    document_kind: 'ANALYTICS_OVERALL',
                    version: 2,
                    status: 'DRAFT',
                    header_config: JSON.stringify({ logo_placement: 'CENTER' }),
                    footer_config: JSON.stringify({ page_numbers: true }),
                })
                .execute();

            // 4. Attempt to insert second published global template of same kind (should fail)
            await expect(
                dbClient
                    .insertInto('pdf_templates')
                    .values({
                        document_kind: 'ANALYTICS_OVERALL',
                        version: 3,
                        status: 'PUBLISHED',
                        header_config: JSON.stringify({ logo_placement: 'LEFT' }),
                        footer_config: JSON.stringify({ page_numbers: true }),
                    })
                    .execute(),
            ).rejects.toThrow();
        },
    );

    testWithDbClient(
        'should enforce partial unique index on published institution overrides',
        async ({ dbClient }) => {
            // Create two institutions with random names to avoid unique name conflicts
            const inst1 = await dbClient
                .insertInto('institutions')
                .values({
                    name: `Test Institution 1 - ${randomUUID()}`,
                    institution_kind: 'STANDALONE',
                })
                .returningAll()
                .executeTakeFirstOrThrow();

            const inst2 = await dbClient
                .insertInto('institutions')
                .values({
                    name: `Test Institution 2 - ${randomUUID()}`,
                    institution_kind: 'STANDALONE',
                })
                .returningAll()
                .executeTakeFirstOrThrow();

            // 1. Insert published override for inst1
            await dbClient
                .insertInto('pdf_templates')
                .values({
                    institution_id: inst1.id,
                    document_kind: 'ANALYTICS_OVERALL',
                    version: 1,
                    status: 'PUBLISHED',
                    header_config: JSON.stringify({}),
                    footer_config: JSON.stringify({}),
                })
                .execute();

            // 2. Insert published override for inst2 (should succeed)
            await dbClient
                .insertInto('pdf_templates')
                .values({
                    institution_id: inst2.id,
                    document_kind: 'ANALYTICS_OVERALL',
                    version: 1,
                    status: 'PUBLISHED',
                    header_config: JSON.stringify({}),
                    footer_config: JSON.stringify({}),
                })
                .execute();

            // 3. Attempt to insert duplicate override for inst1 (should fail)
            await expect(
                dbClient
                    .insertInto('pdf_templates')
                    .values({
                        institution_id: inst1.id,
                        document_kind: 'ANALYTICS_OVERALL',
                        version: 2,
                        status: 'PUBLISHED',
                        header_config: JSON.stringify({}),
                        footer_config: JSON.stringify({}),
                    })
                    .execute(),
            ).rejects.toThrow();
        },
    );

    testWithDbClient('should enforce institution foreign key constraints', async ({ dbClient }) => {
        const nonExistentInstId = '99999999-9999-9999-9999-999999999999';

        await expect(
            dbClient
                .insertInto('pdf_templates')
                .values({
                    institution_id: nonExistentInstId,
                    document_kind: 'ANALYTICS_OVERALL',
                    version: 1,
                    status: 'PUBLISHED',
                    header_config: JSON.stringify({}),
                    footer_config: JSON.stringify({}),
                })
                .execute(),
        ).rejects.toThrow();
    });

    testWithDbClient(
        'should successfully backfill legacy report institution_id and expire unresolved rows',
        async ({ dbClient }) => {
            // Create user & institution with random UUIDs/names
            const inst = await dbClient
                .insertInto('institutions')
                .values({
                    name: `Backfill Institution - ${randomUUID()}`,
                    institution_kind: 'STANDALONE',
                })
                .returningAll()
                .executeTakeFirstOrThrow();

            const userId = randomUUID();
            await dbClient
                .insertInto('auth.users' as any)
                .values({
                    id: userId,
                    email: `backfill-${randomUUID()}@test.local`,
                    role: 'authenticated',
                })
                .execute();

            // Check if profile was auto-created by database trigger
            const existingProfile = await dbClient
                .selectFrom('user_profiles')
                .select('user_id')
                .where('user_id', '=', userId)
                .executeTakeFirst();

            if (existingProfile) {
                await dbClient
                    .updateTable('user_profiles')
                    .set({
                        institution_id: inst.id,
                    })
                    .where('user_id', '=', userId)
                    .execute();
            } else {
                await dbClient
                    .insertInto('user_profiles')
                    .values({
                        user_id: userId,
                        first_name: 'Backfill',
                        last_name: 'User',
                        institution_id: inst.id,
                    })
                    .execute();
            }

            // Insert a legacy report created by this user
            const legacyReport1 = await dbClient
                .insertInto('analytics_reports')
                .values({
                    title: 'Legacy Report 1',
                    type: 'OVERALL',
                    created_by: userId,
                    status: 'READY',
                })
                .returningAll()
                .executeTakeFirstOrThrow();

            // Insert a legacy report with no creator profile (unresolved)
            const legacyReport2 = await dbClient
                .insertInto('analytics_reports')
                .values({
                    title: 'Unresolved Report',
                    type: 'OVERALL',
                    status: 'READY',
                })
                .returningAll()
                .executeTakeFirstOrThrow();

            // Run backfill SQL (same logic as migration)
            await dbClient
                .updateTable('analytics_reports')
                .set((eb) => ({
                    institution_id: eb
                        .selectFrom('user_profiles')
                        .select('institution_id')
                        .where('user_profiles.user_id', '=', eb.ref('analytics_reports.created_by'))
                        .limit(1),
                }))
                .where('created_by', 'is not', null)
                .execute();

            await dbClient
                .updateTable('analytics_reports')
                .set({ status: 'EXPIRED' })
                .where('institution_id', 'is', null)
                .execute();

            // Assertions
            const updatedReport1 = await dbClient
                .selectFrom('analytics_reports')
                .selectAll()
                .where('report_id', '=', legacyReport1.report_id)
                .executeTakeFirstOrThrow();

            expect(updatedReport1.institution_id).toBe(inst.id);
            expect(updatedReport1.status).toBe('READY');

            const updatedReport2 = await dbClient
                .selectFrom('analytics_reports')
                .selectAll()
                .where('report_id', '=', legacyReport2.report_id)
                .executeTakeFirstOrThrow();

            expect(updatedReport2.institution_id).toBeNull();
            expect(updatedReport2.status).toBe('EXPIRED');
        },
    );

    testWithDbClient(
        'should successfully insert and read exam results report exports with relations',
        async ({ dbClient }) => {
            const suffix = randomUUID();

            // 1. Create Institution
            const inst = await dbClient
                .insertInto('institutions')
                .values({
                    name: `Export Inst - ${suffix}`,
                    institution_kind: 'STANDALONE',
                })
                .returningAll()
                .executeTakeFirstOrThrow();

            // 2. Create User (Creator)
            const userId = randomUUID();
            await dbClient
                .insertInto('auth.users' as any)
                .values({
                    id: userId,
                    email: `export-${suffix}@test.local`,
                    role: 'authenticated',
                })
                .execute();

            // 3. Create PDF Template
            const templateId = randomUUID();
            await dbClient
                .insertInto('pdf_templates')
                .values({
                    template_id: templateId,
                    institution_id: inst.id,
                    document_kind: 'EXAM_RESULTS_REPORT',
                    status: 'PUBLISHED',
                    header_config: JSON.stringify({ title_text: 'Test Report' }),
                    footer_config: JSON.stringify({ text: 'Footer Text' }),
                })
                .execute();

            // 4. Create Exam
            const exam = await dbClient
                .insertInto('exams')
                .values({
                    title: `Export Exam - ${suffix}`,
                    institution_id: inst.id,
                    duration_minutes: 60,
                    scheduled_date: new Date('2026-08-01T06:00:00.000Z'),
                    end_date_time: new Date('2026-08-01T07:00:00.000Z'),
                    published_at: new Date('2026-08-01T06:00:00.000Z'),
                })
                .returningAll()
                .executeTakeFirstOrThrow();

            // 5. Create Exam Report Export
            const exportId = randomUUID();
            await dbClient
                .insertInto('exam_report_exports' as any)
                .values({
                    export_id: exportId,
                    exam_id: exam.exam_id,
                    institution_id: inst.id,
                    template_id: templateId,
                    template_snapshot: JSON.stringify({ title_text: 'Test Report' }),
                    status: 'PENDING',
                    retry_count: 0,
                    created_by: userId,
                })
                .execute();

            // 6. Read and assert
            const record = await dbClient
                .selectFrom('exam_report_exports' as any)
                .selectAll()
                .where('export_id', '=', exportId)
                .executeTakeFirstOrThrow();

            expect(record.status).toBe('PENDING');
            expect(record.exam_id).toBe(exam.exam_id);
            expect(record.institution_id).toBe(inst.id);
            expect(record.template_id).toBe(templateId);
            expect(record.created_by).toBe(userId);
        },
    );
});
