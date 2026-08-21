---
title: "Phase 3: Add Database Indexes and Perform End-to-End Verification"
type: phase
parent: "docs/tasks/2026/08/2026-08-21/task-perf-subject-page-query-and-column-visibility/README.md"
phase: "03"
status: completed
created: "2026-08-21"
tags: [task, phase, database, prisma, indexing, verification, regression]
---

# Phase 3: Add Database Indexes and Perform End-to-End Verification

## Objective

Enhance PostgreSQL index coverage in `packages/db` for instructor enrollment queries (`class_roles` and `enrollment_requests`) following ESR rules, generate types, and execute full verification across API, web, and hooks packages.

## Dependencies & Prerequisites

- Phase 1 & Phase 2 completed.

## Impacted Files & Components

- `packages/db/prisma/schema.prisma`: Added `@@index([user_id, role_id])` on `class_roles` and `@@index([user_id, status, created_at(sort: Desc)])`, `@@index([class_group_id, user_id])` on `enrollment_requests`.
- `packages/db/src/generated/types.ts`: Generated latest Kysely types.
- `packages/db/generated/client`: Generated latest Prisma client.

## Implementation Tasks

- [x] Task 3.1 — Update `packages/db/prisma/schema.prisma` to include composite indexes on `class_roles` and `enrollment_requests`.
- [x] Task 3.2 — Regenerate Prisma and Kysely types (`pnpm --filter @sentinel/db generate && pnpm --filter @sentinel/db build`).
- [x] Task 3.3 — Execute test suites across all packages:
  - `pnpm --filter sentinel-api test src/modules/identity/enrollments` (15 test files, 31 tests passed)
  - `pnpm --filter @sentinel/hooks test src/query/subjects` (all subject query tests passed)
  - `pnpm --filter sentinel-web test src/app/(protected)/(instructor)/subjects/_components/tables/subjects-table.test.tsx` (passed)
- [x] Task 3.4 — Verify column visibility and pagination on `http://localhost:3000/subjects`:
  - `approved_at` and `approved_by` columns are hidden by default.
  - `Approved At` and `Approved By` options in "View" column dropdown remain toggleable.
  - Database queries apply SQL `LIMIT` and `OFFSET` directly in Kysely.

## Verification & Testing

- `packages/db` generate & build:
  - `✔ Generated Prisma Client (v7.5.0) to ./generated/client in 540ms`
  - `✔ Generated Kysely types (3.1.0) to ./src/generated in 576ms`
  - `ESM ⚡️ Build success in 36ms`, `CJS ⚡️ Build success in 36ms`
- `sentinel-api` enrollment tests:
  - `15 passed (15), 31 tests passed`
- `sentinel-web` subjects table tests:
  - `1 passed (1), 1 test passed`
- `@sentinel/hooks` subject query tests:
  - `4 passed (4), 6 tests passed`

## Risks & Rollback

- **Risk**: Index creation overhead during migrations.
- **Mitigation**: Indexes are targeted on frequently queried foreign keys with high read selectivity.
- **Rollback**: Revert `schema.prisma` index definitions and re-run generator.
