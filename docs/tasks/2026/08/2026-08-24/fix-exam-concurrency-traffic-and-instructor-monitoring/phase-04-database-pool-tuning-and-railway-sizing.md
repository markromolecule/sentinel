---
title: "Phase 4: Database Connection Pool Scaling & Railway Sizing Configuration"
type: phase
parent: "fix-exam-concurrency-traffic-and-instructor-monitoring"
phase: "04"
status: completed
created: "2026-08-24"
tags: [task, phase, database, connection-pooling, railway, supabase, load-balancing]
---

# Phase 4: Database Connection Pool Scaling & Railway Sizing Configuration

## Objective

Tune the PostgreSQL connection pool in `packages/db` (`DB_POOL_MAX = 15`), configure `sentinel-api` for horizontal load balancing across 2 Railway replicas, and document the Supabase Supavisor Transaction Pooler (port `6543`) connection string setup to guarantee zero connection exhaustion for 150+ concurrent students.

---

## Dependencies & Prerequisites

- Phase 1, Phase 2, and Phase 3 completed.

---

## Impacted Files & Components

- [`packages/db/src/db.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/packages/db/src/db.ts) — Update default `maxConnections` from `5` to `15`, ensuring scalable connection limits per container replica.
- [`packages/db/src/create-db-client.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/packages/db/src/create-db-client.ts) — Validate pool creation settings.
- Environment & Platform Configuration — Document Railway 2 Replicas setup and Supabase Transaction Pooler URI (`port 6543` with `?pgbouncer=true`).

---

## Implementation Tasks

- [x] **Task 4.1: Update Default Connection Pool Max in `packages/db/src/db.ts`**
  - Changed default: `const maxConnections = Number(process.env.DB_POOL_MAX) > 0 ? Number(process.env.DB_POOL_MAX) : 15;`.
  - Configured `idleTimeoutMillis` (10s) and `connectionTimeoutMillis` (10s) to safely recycle idle pool connections.
- [x] **Task 4.2: Validate Database Client Unit & Migration Tests**
  - Created [`packages/db/src/tests/db-pool-config.test.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/packages/db/src/tests/db-pool-config.test.ts).
  - Executed `pnpm --filter @sentinel/db test` (9/9 test files passed, 24/24 tests passed).
- [x] **Task 4.3: Railway & Supabase Infrastructure Documentation**
  - **Supabase Transaction Pooler Connection String:**
    ```bash
    DATABASE_URL="postgres://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require"
    ```
  - **Railway Environment Variables (`sentinel-api` service):**
    ```bash
    DB_POOL_MAX=15
    DB_POOL_IDLE_TIMEOUT_MS=10000
    DB_POOL_CONNECTION_TIMEOUT_MS=10000
    ```
  - **Railway Replicas Configuration:**
    - In Railway Dashboard -> `sentinel-api` service -> **Settings** -> **Deployments & Scaling** -> Set **Replicas** to `2`.
    - Total connections across 2 replicas = `2 * 15 = 30` active pool connections (well below Supabase Transaction Pooler limit of hundreds of concurrent clients).
- [x] **Task 4.4: Full End-to-End Regression Validation**
  - Executed `@sentinel/hooks` tests (63/63 test files passed, 184/184 tests passed).
  - Executed `sentinel-web` monitoring & lobby tests (100% passed).
  - Executed `sentinel-api` examination monitoring & live-inspection tests (16/16 test files passed, 74/74 tests passed).
  - Verified packages build (`@sentinel/hooks`, `@sentinel/db`).

---

## Verification & Testing

- `pnpm --filter @sentinel/db test` (PASS: 9 test files, 24 tests passed)
- `pnpm --filter @sentinel/db build` (PASS: zero compilation errors)
- `pnpm --filter @sentinel/hooks test` (PASS: 63 test files, 184 tests passed)
- `pnpm --filter sentinel-api test src/modules/examination/monitoring src/modules/examination/live-inspection` (PASS: 16 test files, 74 tests passed)

---

## Risks & Rollback

- **Risk:** Prisma transactions might require session mode if interactive transactions (`$transaction([..])`) are executed without Supavisor transaction compatibility.
- **Mitigation:** Kysely queries and standard Prisma queries operate in auto-commit/transaction boundaries compatible with Supavisor transaction pooler on port 6543.
