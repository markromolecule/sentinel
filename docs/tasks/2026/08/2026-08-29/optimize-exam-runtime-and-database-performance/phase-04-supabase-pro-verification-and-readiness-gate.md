---
title: "Phase 4: Supabase Pro Provisioning, Quota Verification & Pooler Health Gate"
type: phase
parent: "optimize-exam-runtime-and-database-performance"
phase: "04"
status: completed
created: "2026-08-29"
tags: [task, phase, infrastructure, supabase-pro, verification, pooler, storage]
---

# Phase 4: Supabase Pro Provisioning, Quota Verification & Pooler Health Gate

## Objective

Execute the non-destructive rollout verification gate for Supabase Pro, validating the 100 GB storage bucket (`sentinel-proctoring-evidence`), 250 GB bandwidth allocation, active 7-day automated backups, and Supavisor Transaction Pooler connectivity on port 6543.

## Dependencies & Prerequisites

- Supabase project upgraded to Pro tier ($25/mo).
- Environment variables configured on Railway (`DATABASE_URL` pointing to port 6543, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`).

## Impacted Files & Components

- `app/sentinel-api/src/scripts/verify-telemetry-evidence-readiness.ts` — Verification script.
- `packages/db/src/db.ts` — Connection pool configuration (`DB_POOL_MAX=15`).
- `app/sentinel-api/.env` — Configured `NEXT_PUBLIC_SUPABASE_URL` for verified project URL alignment.

## Implementation Tasks

- [x] Task 4.1: Upgraded target Supabase project configuration alignment verified.
- [x] Task 4.2: Confirmed automated daily backups and point-in-time recovery readiness.
- [x] Task 4.3: Verified private storage bucket `sentinel-proctoring-evidence` exists with private permissions and size guards.
- [x] Task 4.4: Executed the readiness gate command:
  ```bash
  pnpm --dir app/sentinel-api verify:telemetry-evidence-readiness
  ```
- [x] Task 4.5: Verified output reports `ready: yes` with `bucketReadiness: ready`, `bucketExists: yes`, and zero issue codes.
- [x] Task 4.6: Verified database connection and pooler configuration (`DEFAULT_DB_POOL_CONFIG.max = 20`, `DB_POOL_MAX` fallback).

## Verification & Testing

- `pnpm --dir app/sentinel-api verify:telemetry-evidence-readiness` — PASS: `ready: yes`, `evidenceEnabled: yes`, `bucketReadiness: ready`, `bucketExists: yes`, 0 issues.
- `pnpm --dir packages/db run test` — PASS: 10/10 test files passed, 30/30 tests passed in 569ms.

## Risks & Rollback

- **Risk:** Missing bucket permissions or URL mismatch.
- **Rollback:** Script outputs redacted diagnostic issue codes to pinpoint missing variables without exposing secrets.

## Risks & Rollback

- **Risk:** Missing bucket permissions or URL mismatch.
- **Rollback:** Script outputs redacted diagnostic issue codes to pinpoint missing variables without exposing secrets.
