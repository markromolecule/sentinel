---
title: "Phase 4: Database Connection Pool Scaling & Railway Sizing Configuration"
type: phase
parent: "fix-exam-concurrency-traffic-and-instructor-monitoring"
phase: "04"
status: planned
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

- [ ] **Task 4.1: Update Default Connection Pool Max in `packages/db/src/db.ts`**
  - Change default: `const maxConnections = Number(process.env.DB_POOL_MAX) > 0 ? Number(process.env.DB_POOL_MAX) : 15;`.
  - Ensure `idleTimeoutMillis` (10s) and `connectionTimeoutMillis` (10s) safely recycle idle pool connections.
- [ ] **Task 4.2: Validate Database Client Unit & Migration Tests**
  - Run `pnpm --filter @sentinel/db test`.
- [ ] **Task 4.3: Railway & Supabase Infrastructure Documentation**
  - Provide clear step-by-step instructions for:
    1. Updating Railway `DATABASE_URL` to Supabase Transaction Pooler (port 6543) with `?pgbouncer=true`.
    2. Setting `DB_POOL_MAX=15` in Railway environment variables.
    3. Setting service replicas to `2` in Railway settings for active-active edge load balancing.
- [ ] **Task 4.4: Full End-to-End Regression Validation**
  - Run full test suite: `pnpm test`.

---

## Verification & Testing

```bash
pnpm --filter @sentinel/db test
pnpm test
```

---

## Risks & Rollback

- **Risk:** Prisma transactions might require session mode if interactive transactions (`$transaction([..])`) are executed without Supavisor transaction compatibility.
- **Mitigation:** Kysely queries and standard Prisma queries operate in auto-commit/transaction boundaries compatible with Supavisor transaction pooler on port 6543.
