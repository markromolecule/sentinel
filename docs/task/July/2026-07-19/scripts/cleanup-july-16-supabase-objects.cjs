const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const { Client } = require('pg');

const envPath = path.resolve(__dirname, '../../../../packages/db/.env');
const envContents = fs.readFileSync(envPath, 'utf8');

for (const line of envContents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
        continue;
    }

    const equalsIndex = trimmed.indexOf('=');
    if (equalsIndex === -1) {
        continue;
    }

    const key = trimmed.slice(0, equalsIndex);
    let value = trimmed.slice(equalsIndex + 1);
    if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
    ) {
        value = value.slice(1, -1);
    }

    process.env[key] = process.env[key] || value;
}

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error('DIRECT_URL or DATABASE_URL is required in packages/db/.env');
}

const migrationsDir = path.resolve(__dirname, '../../../../packages/db/prisma/migrations');

function stableMigrations() {
    return fs
        .readdirSync(migrationsDir)
        .filter((name) => fs.existsSync(path.join(migrationsDir, name, 'migration.sql')))
        .sort()
        .map((name) => {
            const sql = fs.readFileSync(path.join(migrationsDir, name, 'migration.sql'));
            return {
                name,
                checksum: crypto.createHash('sha256').update(sql).digest('hex'),
            };
        });
}

async function tableExists(client, tableName) {
    const result = await client.query('SELECT to_regclass($1) AS reg', [`public.${tableName}`]);
    return Boolean(result.rows[0].reg);
}

async function countRows(client, tableName) {
    if (!(await tableExists(client, tableName))) {
        return null;
    }

    const result = await client.query(`SELECT count(*)::int AS count FROM public.${tableName}`);
    return result.rows[0].count;
}

async function main() {
    const migrations = stableMigrations();
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false },
    });

    await client.connect();

    const report = {
        startedAt: new Date().toISOString(),
        preCleanupCounts: {},
        deletedMigrationRows: 0,
        insertedStableMigrations: 0,
        postCleanupChecks: {},
    };

    try {
        for (const table of [
            'institution_memberships',
            'institution_membership_roles',
            'rbac_membership_permission_overrides',
            'institution_hierarchy_paths',
        ]) {
            report.preCleanupCounts[table] = await countRows(client, table);
        }

        await client.query('BEGIN');

        await client.query(
            'DROP TRIGGER IF EXISTS institutions_assert_no_cycle_trigger ON public.institutions',
        );
        await client.query(
            'DROP TRIGGER IF EXISTS institutions_refresh_hierarchy_after_change_trigger ON public.institutions',
        );
        await client.query('DROP FUNCTION IF EXISTS public.refresh_institution_hierarchy_state()');
        await client.query('DROP FUNCTION IF EXISTS public.apply_institution_hierarchy_state()');
        await client.query('DROP FUNCTION IF EXISTS public.rebuild_institution_hierarchy_paths()');
        await client.query(
            'DROP FUNCTION IF EXISTS public.assert_institution_hierarchy_no_cycle()',
        );

        await client.query(
            'ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_membership_id_fkey',
        );
        await client.query(`
            ALTER TABLE public.audit_logs
                DROP COLUMN IF EXISTS membership_id,
                DROP COLUMN IF EXISTS home_institution_id,
                DROP COLUMN IF EXISTS effective_institution_id,
                DROP COLUMN IF EXISTS target_institution_id,
                DROP COLUMN IF EXISTS scope_mode,
                DROP COLUMN IF EXISTS permission_key,
                DROP COLUMN IF EXISTS decision,
                DROP COLUMN IF EXISTS reason_code,
                DROP COLUMN IF EXISTS correlation_id
        `);

        await client.query('DROP TABLE IF EXISTS public.institution_membership_roles');
        await client.query('DROP TABLE IF EXISTS public.rbac_membership_permission_overrides');
        await client.query('DROP TABLE IF EXISTS public.institution_hierarchy_paths');
        await client.query('DROP TABLE IF EXISTS public.institution_memberships');
        await client.query('DROP TYPE IF EXISTS public.institution_membership_status');
        await client.query('DROP TYPE IF EXISTS public.institution_scope_mode');

        const deleted = await client.query(`
            DELETE FROM public._prisma_migrations
            WHERE migration_name LIKE '20260716%'
               OR migration_name LIKE '20260717%'
        `);
        report.deletedMigrationRows = deleted.rowCount;

        for (const migration of migrations) {
            const inserted = await client.query(
                `
                    INSERT INTO public._prisma_migrations (
                        id,
                        checksum,
                        finished_at,
                        migration_name,
                        logs,
                        rolled_back_at,
                        started_at,
                        applied_steps_count
                    )
                    SELECT $1, $2, NOW(), $3::varchar, NULL, NULL, NOW(), 1
                    WHERE NOT EXISTS (
                        SELECT 1
                        FROM public._prisma_migrations
                        WHERE migration_name = $3::varchar
                    )
                `,
                [randomUUID(), migration.checksum, migration.name],
            );
            report.insertedStableMigrations += inserted.rowCount;
        }

        await client.query('COMMIT');

        for (const table of [
            'institution_memberships',
            'institution_membership_roles',
            'rbac_membership_permission_overrides',
            'institution_hierarchy_paths',
        ]) {
            report.postCleanupChecks[table] = {
                exists: await tableExists(client, table),
            };
        }

        const julyMigrationRows = await client.query(`
            SELECT migration_name, finished_at, rolled_back_at
            FROM public._prisma_migrations
            WHERE migration_name LIKE '20260716%'
               OR migration_name LIKE '20260717%'
            ORDER BY migration_name
        `);
        report.postCleanupChecks.julyMigrationRows = julyMigrationRows.rows;

        const stableMigrationRows = await client.query(`
            SELECT count(*)::int AS count
            FROM public._prisma_migrations
            WHERE migration_name < '20260716'
        `);
        report.postCleanupChecks.stableMigrationCount = stableMigrationRows.rows[0].count;
        report.finishedAt = new Date().toISOString();

        console.log(JSON.stringify(report, null, 2));
    } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        throw error;
    } finally {
        await client.end();
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
