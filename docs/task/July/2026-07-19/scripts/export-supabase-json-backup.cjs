const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
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

const outputRoot = path.resolve(
    __dirname,
    '../database-rollback-backups/full-json-backup-2026-07-19',
);

function quoteIdent(value) {
    return `"${String(value).replaceAll('"', '""')}"`;
}

function sha256File(filePath) {
    return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

async function main() {
    fs.mkdirSync(outputRoot, { recursive: true });

    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false },
    });

    await client.connect();

    try {
        const startedAt = new Date().toISOString();
        const manifest = {
            startedAt,
            finishedAt: null,
            schemas: ['auth', 'public'],
            tables: [],
            metadata: {},
        };

        const metadataQueries = {
            columns: `
                SELECT table_schema, table_name, column_name, ordinal_position, data_type,
                       udt_schema, udt_name, is_nullable, column_default
                FROM information_schema.columns
                WHERE table_schema IN ('auth', 'public')
                ORDER BY table_schema, table_name, ordinal_position
            `,
            constraints: `
                SELECT tc.table_schema, tc.table_name, tc.constraint_name, tc.constraint_type,
                       kcu.column_name, ccu.table_schema AS foreign_table_schema,
                       ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column_name
                FROM information_schema.table_constraints tc
                LEFT JOIN information_schema.key_column_usage kcu
                    ON tc.constraint_name = kcu.constraint_name
                   AND tc.table_schema = kcu.table_schema
                LEFT JOIN information_schema.constraint_column_usage ccu
                    ON ccu.constraint_name = tc.constraint_name
                   AND ccu.table_schema = tc.table_schema
                WHERE tc.table_schema IN ('auth', 'public')
                ORDER BY tc.table_schema, tc.table_name, tc.constraint_name, kcu.ordinal_position
            `,
            indexes: `
                SELECT schemaname, tablename, indexname, indexdef
                FROM pg_indexes
                WHERE schemaname IN ('auth', 'public')
                ORDER BY schemaname, tablename, indexname
            `,
            enums: `
                SELECT n.nspname AS enum_schema, t.typname AS enum_name, e.enumlabel AS enum_value,
                       e.enumsortorder
                FROM pg_type t
                JOIN pg_enum e ON t.oid = e.enumtypid
                JOIN pg_namespace n ON n.oid = t.typnamespace
                WHERE n.nspname IN ('auth', 'public')
                ORDER BY n.nspname, t.typname, e.enumsortorder
            `,
            functions: `
                SELECT n.nspname AS function_schema, p.proname AS function_name,
                       pg_get_function_arguments(p.oid) AS arguments,
                       pg_get_functiondef(p.oid) AS definition
                FROM pg_proc p
                JOIN pg_namespace n ON n.oid = p.pronamespace
                WHERE n.nspname IN ('auth', 'public')
                ORDER BY n.nspname, p.proname, pg_get_function_arguments(p.oid)
            `,
        };

        for (const [name, sql] of Object.entries(metadataQueries)) {
            manifest.metadata[name] = (await client.query(sql)).rows;
        }

        const tables = (
            await client.query(`
                SELECT table_schema, table_name
                FROM information_schema.tables
                WHERE table_schema IN ('auth', 'public')
                  AND table_type = 'BASE TABLE'
                ORDER BY table_schema, table_name
            `)
        ).rows;

        for (const table of tables) {
            const schema = table.table_schema;
            const name = table.table_name;
            const dir = path.join(outputRoot, schema);
            fs.mkdirSync(dir, { recursive: true });

            const filePath = path.join(dir, `${name}.ndjson`);
            const stream = fs.createWriteStream(filePath, { encoding: 'utf8' });
            const result = await client.query(
                `SELECT row_to_json(t) AS row FROM ${quoteIdent(schema)}.${quoteIdent(name)} AS t`,
            );

            for (const row of result.rows) {
                stream.write(`${JSON.stringify(row.row)}\n`);
            }

            await new Promise((resolve, reject) => {
                stream.end(resolve);
                stream.on('error', reject);
            });

            manifest.tables.push({
                schema,
                table: name,
                rows: result.rowCount,
                file: path.relative(outputRoot, filePath),
                sha256: sha256File(filePath),
            });
        }

        manifest.finishedAt = new Date().toISOString();
        const manifestPath = path.join(outputRoot, 'manifest.json');
        fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

        console.log(JSON.stringify({ outputRoot, manifestPath, tables: manifest.tables.length }));
    } finally {
        await client.end();
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
