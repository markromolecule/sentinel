import 'dotenv/config';
import pg from 'pg';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const { Client } = pg;

export type Mode = 'dry-run' | 'apply';

export type AuditRecord = {
    id: string;
    classification:
        | 'ELIGIBLE_NON_AI'
        | 'AI_NULL_PASSAGE'
        | 'AI_EQUAL_PASSAGE'
        | 'AI_DISTINCT_PASSAGE'
        | 'EXAM_SNAPSHOT_AI_EQUAL_PASSAGE';
};

export type AuditReport = {
    timestamp: string;
    summary: {
        dryRun: boolean;
        nonAiEligibleCount: number;
        nonAiUpdatedCount: number;
        aiNullPassageCount: number;
        aiEqualPassageCount: number;
        aiDistinctPassageCount: number;
        examSnapshotAiEqualPassageCount: number;
    };
    records: AuditRecord[];
};

export function parseArgs(argv: string[]): Record<string, string | boolean> {
    const args: Record<string, string | boolean> = {};

    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index];

        if (!arg.startsWith('--')) {
            continue;
        }

        const key = arg.slice(2);
        const next = argv[index + 1];

        if (!next || next.startsWith('--')) {
            args[key] = true;
            continue;
        }

        args[key] = next;
        index += 1;
    }

    return args;
}

export function resolveMode(args: Record<string, string | boolean>): Mode {
    return args.apply === true ? 'apply' : 'dry-run';
}

export function resolveSampleLimit(args: Record<string, string | boolean>): number {
    const rawLimit = typeof args.limit === 'string' ? Number(args.limit) : 5;

    if (!Number.isInteger(rawLimit) || rawLimit < 0) {
        throw new Error('Invalid --limit value. Use a non-negative integer.');
    }

    return rawLimit;
}

export function resolveDatabaseUrl(): string | null {
    return process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? null;
}

/**
 * Runs the read-only audit queries against the database.
 */
export async function runAudit(client: pg.Client): Promise<AuditReport> {
    // 1. ELIGIBLE_NON_AI
    const nonAiEligibleRows = await client.query<{ id: string }>(
        `select question_bank_question_id::text as id 
         from public.question_bank_questions 
         where source_origin <> 'AI_PDF' 
           and passage_content is null 
           and coalesce(btrim(source_evidence), '') <> ''`,
    );

    // 2. AI_NULL_PASSAGE
    const aiNullRows = await client.query<{ id: string }>(
        `select question_bank_question_id::text as id 
         from public.question_bank_questions 
         where source_origin = 'AI_PDF' 
           and passage_content is null 
           and coalesce(btrim(source_evidence), '') <> ''`,
    );

    // 3. AI_EQUAL_PASSAGE
    const aiEqualRows = await client.query<{ id: string }>(
        `select question_bank_question_id::text as id 
         from public.question_bank_questions 
         where source_origin = 'AI_PDF' 
           and passage_content = source_evidence`,
    );

    // 4. AI_DISTINCT_PASSAGE
    const aiDistinctRows = await client.query<{ id: string }>(
        `select question_bank_question_id::text as id 
         from public.question_bank_questions 
         where source_origin = 'AI_PDF' 
           and passage_content is not null 
           and passage_content <> source_evidence`,
    );

    // 5. EXAM_SNAPSHOT_AI_EQUAL_PASSAGE
    const examSnapshotRows = await client.query<{ id: string }>(
        `select eq.question_id::text as id
         from public.exam_questions eq
         join public.question_bank_questions qbq on eq.source_question_bank_question_id = qbq.question_bank_question_id
         where qbq.source_origin = 'AI_PDF'
           and eq.passage_content = qbq.source_evidence`,
    );

    const records: AuditRecord[] = [];
    nonAiEligibleRows.rows.forEach((r) =>
        records.push({ id: r.id, classification: 'ELIGIBLE_NON_AI' }),
    );
    aiNullRows.rows.forEach((r) => records.push({ id: r.id, classification: 'AI_NULL_PASSAGE' }));
    aiEqualRows.rows.forEach((r) => records.push({ id: r.id, classification: 'AI_EQUAL_PASSAGE' }));
    aiDistinctRows.rows.forEach((r) =>
        records.push({ id: r.id, classification: 'AI_DISTINCT_PASSAGE' }),
    );
    examSnapshotRows.rows.forEach((r) =>
        records.push({ id: r.id, classification: 'EXAM_SNAPSHOT_AI_EQUAL_PASSAGE' }),
    );

    return {
        timestamp: new Date().toISOString(),
        summary: {
            dryRun: true,
            nonAiEligibleCount: nonAiEligibleRows.rowCount ?? 0,
            nonAiUpdatedCount: 0,
            aiNullPassageCount: aiNullRows.rowCount ?? 0,
            aiEqualPassageCount: aiEqualRows.rowCount ?? 0,
            aiDistinctPassageCount: aiDistinctRows.rowCount ?? 0,
            examSnapshotAiEqualPassageCount: examSnapshotRows.rowCount ?? 0,
        },
        records,
    };
}

/**
 * Updates eligible manual/non-AI rows to backfill passage content.
 */
export async function applyBackfill(client: pg.Client): Promise<number> {
    const result = await client.query(
        `update public.question_bank_questions
         set passage_content = source_evidence,
             passage_type = 'plain'
         where source_origin <> 'AI_PDF'
           and passage_content is null
           and coalesce(btrim(source_evidence), '') <> ''`,
    );
    return result.rowCount ?? 0;
}

export async function writeOutputFile(outputPath: string, report: AuditReport): Promise<void> {
    await fs.writeFile(outputPath, JSON.stringify(report, null, 2), 'utf-8');
}

async function main() {
    const args = parseArgs(process.argv.slice(2));

    if (args.help === true) {
        console.log(
            'Usage: pnpm --dir app/sentinel-api exec tsx scripts/backfill-passage-content.ts [--apply] [--limit N] [--output <path>]',
        );
        console.log('Default mode is dry-run. Use --apply to update eligible non-AI rows.');
        return;
    }

    const mode = resolveMode(args);
    const sampleLimit = resolveSampleLimit(args);
    const databaseUrl = resolveDatabaseUrl();
    const outputPath = typeof args.output === 'string' ? args.output : null;

    if (!databaseUrl) {
        throw new Error('Missing DIRECT_URL or DATABASE_URL in the environment.');
    }

    const client = new Client({ connectionString: databaseUrl });

    try {
        await client.connect();
        console.log(`Connected to database. Mode: ${mode}. Sample limit: ${sampleLimit}.`);

        // Run full audit first (always read-only)
        const report = await runAudit(client);
        report.summary.dryRun = mode === 'dry-run';

        const totalAiSkipped =
            report.summary.aiNullPassageCount +
            report.summary.aiEqualPassageCount +
            report.summary.aiDistinctPassageCount;
        console.log(`\nAudit results:`);
        console.log(`- Non-AI rows eligible for backfill: ${report.summary.nonAiEligibleCount}`);
        console.log(`- AI rows with null passage (skipped): ${report.summary.aiNullPassageCount}`);
        console.log(
            `- AI rows where passage equals evidence (skipped): ${report.summary.aiEqualPassageCount}`,
        );
        console.log(
            `- AI rows with distinct passage (skipped): ${report.summary.aiDistinctPassageCount}`,
        );
        console.log(`- Total AI rows skipped: ${totalAiSkipped}`);
        console.log(
            `- Exam snapshots where passage equals AI evidence: ${report.summary.examSnapshotAiEqualPassageCount}`,
        );

        // Print samples
        console.log(`\nSamples (Limit: ${sampleLimit}):`);
        const sampleRecords = report.records.slice(0, sampleLimit);
        for (const sample of sampleRecords) {
            console.log(`- ID: ${sample.id}, Classification: ${sample.classification}`);
        }

        if (mode === 'apply') {
            await client.query('begin');
            console.log('\nApplying backfill updates to eligible non-AI rows...');
            const updated = await applyBackfill(client);
            report.summary.nonAiUpdatedCount = updated;
            await client.query('commit');
            console.log(`Successfully updated ${updated} non-AI rows.`);
        } else {
            console.log('\nDry-run complete. No rows were modified.');
        }

        if (outputPath) {
            await writeOutputFile(outputPath, report);
            console.log(`Saved audit report to ${outputPath}`);
        }
    } catch (error) {
        if (mode === 'apply') {
            await client.query('rollback').catch(() => {});
        }
        console.error('Backfill execution failed:', error);
        process.exitCode = 1;
    } finally {
        await client.end();
    }
}

// Guard main from running when imported in tests
const isMain =
    typeof process !== 'undefined' &&
    process.argv[1] &&
    (process.argv[1] === fileURLToPath(import.meta.url) ||
        process.argv[1].endsWith('backfill-passage-content.ts'));

if (isMain) {
    main();
}
