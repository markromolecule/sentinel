---
title: "Phase 1: Database Indexing, Composite Constraints, and Realtime Publication"
type: phase
parent: "opt-001-lobby-production-performance"
phase: "1"
status: completed
created: "2026-08-18"
tags: [task, phase, database, realtime]
---

# Phase 1: Database Indexing, Composite Constraints, and Realtime Publication

## Objective

Add composite indexing on `exam_lobby_admissions` to prevent full table scans during high-traffic queue lookups, and register the table in the `supabase_realtime` publication to enable client WebSocket push subscriptions.

## Dependencies & Prerequisites

- Prisma client and PostgreSQL schema in `packages/db`.

## Impacted Files & Components

- [schema.prisma](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/packages/db/prisma/schema.prisma) (`model exam_lobby_admissions`)
- New Migration: `packages/db/prisma/migrations/20260818160000_enable_lobby_admissions_realtime_and_indexes/migration.sql`

## Implementation Tasks

- [x] Task 1.1 — Update `packages/db/prisma/schema.prisma` to include composite index `@@index([exam_id, status, checked_in_at(sort: Asc)], map: "exam_lobby_admissions_exam_status_idx")`.
- [x] Task 1.2 — Create migration adding the index and executing `ALTER PUBLICATION supabase_realtime ADD TABLE "public"."exam_lobby_admissions";`.
- [x] Task 1.3 — Ensure RLS policies or select permissions on `exam_lobby_admissions` permit realtime event delivery for authenticated student and instructor roles.

## Verification & Testing

- `pnpm --filter @sentinel/db generate`: Succeeded cleanly. Generated Prisma Client and Kysely types.
- Validated migration SQL syntax including idempotent PL/pgSQL blocks for `exam_lobby_admissions_select_policy` and `supabase_realtime` publication table registration.

## Risks & Rollback

- *Risk:* `ALTER PUBLICATION` failure if `supabase_realtime` publication does not exist in local test DB.
- *Mitigation:* Wrap publication registration in conditional PL/pgSQL block checking `WHERE pubname = 'supabase_realtime'`.
- *Rollback:* Drop index and remove table from publication.
