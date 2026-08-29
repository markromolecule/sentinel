---
title: "Phase 1: Database Indexing & Query Latency Optimization"
type: phase
parent: "optimize-exam-runtime-and-database-performance"
phase: "01"
status: completed
created: "2026-08-29"
tags: [task, phase, database, indexing, performance, prisma, postgres]
---

# Phase 1: Database Indexing & Query Latency Optimization

## Objective

Add missing composite and foreign key B-tree indexes to `flagged_incidents` and `live_inspection_leases` in `packages/db/prisma/schema.prisma` so that high-concurrency exam monitoring queries, incident aggregations, and live spot-check lookups execute in < 50ms without sequential table scans.

## Dependencies & Prerequisites

- Local PostgreSQL database running.
- Prisma CLI available in `packages/db`.

## Impacted Files & Components

- `packages/db/prisma/schema.prisma` — Add composite index to `flagged_incidents` and indexes to `live_inspection_leases`.
- `packages/db/prisma/migrations/20260829140000_add_monitoring_and_leases_indexes/migration.sql` — New SQL migration.
- `packages/db/src/tests/monitoring-indexes-schema.test.ts` — Database tests verifying index presence and schema integrity.

## Implementation Tasks

- [x] Task 1.1: In `packages/db/prisma/schema.prisma`, add `@@index([attempt_id, timestamp(sort: Desc)], map: "flagged_incidents_attempt_timestamp_idx")` to `model flagged_incidents`.
- [x] Task 1.2: In `packages/db/prisma/schema.prisma`, add `@@index([attempt_id], map: "live_inspection_leases_attempt_idx")` and `@@index([exam_id], map: "live_inspection_leases_exam_idx")` to `model live_inspection_leases`.
- [x] Task 1.3: Generate Prisma client and create SQL migration (`pnpm --dir packages/db run generate` & `pnpm --dir packages/db run build`).
- [x] Task 1.4: Run database tests to verify schema validity (`pnpm --dir packages/db run test`).

## Verification & Testing

- `pnpm --dir packages/db run test` — PASS: 10/10 test files passed, 30/30 tests passed.
- `pnpm --dir app/sentinel-api test src/modules/examination/monitoring src/modules/examination/live-inspection` — PASS: 16/16 test files passed, 74/74 tests passed.

## Risks & Rollback

- **Risk:** Migration locks tables briefly.
- **Rollback:** Dropping indexes via `DROP INDEX IF EXISTS flagged_incidents_attempt_timestamp_idx;` is instantaneous and non-destructive.
