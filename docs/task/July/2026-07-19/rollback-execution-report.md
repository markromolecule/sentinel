# Rollback Execution Report: `july-16-feat` To `july-15-feat`

## Completed

- Created archive branch: `archive-july-16-feat-before-rollback`.
- Stashed all dirty tracked and untracked July 16 work:
    - `stash@{0}: On archive-july-16-feat-before-rollback: archive july-16 rollback state`
- Switched workspace back to stable branch:
    - `july-15-feat`
    - tracking `origin/july-15-feat`
- Confirmed `july-15-feat` restored the original pre-squash Prisma migration chain with 54 migrations.
- Ran Prisma generation successfully:
    - `pnpm --dir packages/db run generate`

## Supabase Findings

`prisma migrate status` from `july-15-feat` reports the live Supabase migration ledger does not match the stable branch.

Live Supabase has July 16 migration entries:

- `20260716080000_baseline_schema`: applied successfully.
- `20260716093000_add_institution_authorization_scope_foundation`: two rolled-back attempts and one successful attempt.

Live Supabase does not show `20260717193000_phase_4b_inheritance_source_linkage` as applied.

July 16-only object counts:

- `institution_memberships`: 7 rows.
- `institution_membership_roles`: 7 rows.
- `rbac_membership_permission_overrides`: 0 rows.
- `institution_hierarchy_paths`: 13 rows.

July 16-only audit columns are present on `audit_logs`.

## Backup Artifact

Created a targeted local JSON export of July 16-only Supabase data:

- `/private/tmp/sentinel-rollback-backups-2026-07-19/database-rollback-backups/july-16-supabase-objects-export-2026-07-19.json`

A full Supabase CLI dump was attempted but could not run because Docker is not running locally. The CLI reported that Docker Desktop is required.

Created a broader local JSON backup using Node/Postgres after the Supabase CLI dump failed:

- `/private/tmp/sentinel-rollback-backups-2026-07-19/database-rollback-backups/full-json-backup-2026-07-19/manifest.json`
- Exported 96 tables across `auth` and `public`.
- Exported 8,849 total rows.
- Included metadata snapshots for columns, constraints, indexes, enums, and functions.
- Manifest includes per-table SHA-256 checksums.

## Supabase Cleanup Completed

Executed the targeted Supabase cleanup transaction after the broader JSON backup was created.

Pre-cleanup July 16-only table counts:

- `institution_memberships`: 7 rows.
- `institution_membership_roles`: 7 rows.
- `rbac_membership_permission_overrides`: 0 rows.
- `institution_hierarchy_paths`: 13 rows.

Cleanup actions completed:

- Dropped July 16-only institution authorization triggers/functions.
- Dropped July 16-only `audit_logs` columns.
- Dropped July 16-only tables:
    - `institution_memberships`
    - `institution_membership_roles`
    - `rbac_membership_permission_overrides`
    - `institution_hierarchy_paths`
- Dropped July 16-only enums:
    - `institution_membership_status`
    - `institution_scope_mode`
- Deleted 4 July 16 Prisma migration ledger rows.
- Inserted 54 stable `july-15-feat` migration ledger rows.

Post-cleanup verification:

- `prisma migrate status`: `Database schema is up to date!`
- `pnpm run db:migrate`: `No pending migrations to apply.`
- July 16-only tables: absent.
- July 16-only `audit_logs` columns: 0 remaining.
- July 16/17 migration rows in `_prisma_migrations`: 0.
- Stable migration rows: 54.

## Validation Results

- `pnpm --dir packages/db run generate`: passed.
- `pnpm --dir packages/db test`: failed because the sandbox could not reach the Supabase pooler.
- `pnpm --dir app/sentinel-api test`: failed.
    - Many failures are DB connection failures from the sandbox.
    - Some failures appear unrelated to network, including missing July 16 authorization-scope imports in tests and mocked DB client shape mismatches.

## Safety Stop

Initial destructive cleanup was stopped because it would drop live July 16 tables with non-zero rows and rewrite Prisma migration history without a verified broader backup.

After creating the broader JSON backup, the targeted cleanup was executed successfully.

## Current State

- Current branch: `july-15-feat`.
- Code rollback is complete locally.
- Supabase database cleanup is complete.
- Local `july-16-feat` branch has been deleted.
- Remote `origin/july-16-feat` has been deleted and pruned locally.
- The archive branch and stash remain available for recovery.
