---
title: "Phase 1: Database Connection Pool Tuning & In-Memory Auth LRU Cache"
type: phase
parent: "scale-concurrency-surge-optimization"
phase: "1"
status: completed
created: "2026-08-28"
tags: [task, phase, auth, cache, db-pool, railway]
---

# Phase 1: Database Connection Pool Tuning & In-Memory Auth LRU Cache

## Objective

Tune database connection pool limits to safely maximize connection throughput for 2 Railway replicas on Supabase Free Tier, and implement an in-process LRU cache in `authMiddleware` to eliminate 4 synchronous database round-trips on authenticated requests.

---

## Dependencies & Prerequisites

- Verified Railway Hobby setup: 2 Replicas in Singapore with up to 8 vCPU / 8 GB RAM per replica.
- Supabase Free Tier direct connection limit: Max 60 (~45 usable).

---

## Impacted Files & Components

1. **[`packages/db/src/db.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/packages/db/src/db.ts)**
   - Update default `maxConnections` to `20` per replica (2 replicas = 40 total connections).
   - Set `connectionTimeoutMillis` to `5000` (5s fail-fast).
   - Set `idleTimeoutMillis` to `15000`.

2. **[`app/sentinel-api/src/middleware/auth.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/middleware/auth.ts)**
   - Implement an in-memory LRU TTL cache (60s TTL, max 5,000 entries) for `{ dbUser, institutionId, role, activePermissionKeys }` keyed by `userId:tokenDigest`.
   - On cache hit, set context directly without executing `prisma.users.findUnique`, `getUserActivePermissions`, or `ensureAccessControlCatalogsSynced`.
   - Decouple `last_seen_at` writes: throttle in-memory and flush asynchronously via background timer/queue rather than blocking the HTTP request thread.

3. **[`app/sentinel-api/src/middleware/auth.test.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/middleware/auth.test.ts)**
   - Add unit tests verifying that cache hits bypass DB queries and return in sub-millisecond time.

---

## Implementation Tasks

- [x] **Task 1.1 — Database Connection Pool Optimization (`packages/db/src/db.ts`)**
  - Adjust default pool parameters:
    - `DB_POOL_MAX`: default `20`
    - `DB_POOL_IDLE_TIMEOUT_MS`: default `15000`
    - `DB_POOL_CONNECTION_TIMEOUT_MS`: default `5000`
  - Update `packages/db/src/tests/db-pool-config.test.ts` to validate the updated configuration.

- [x] **Task 1.2 — In-Memory LRU Auth Cache Implementation (`app/sentinel-api/src/middleware/auth.ts`)**
  - Create a lightweight LRU cache instance with 60-second TTL.
  - Compute a short hash of the JWT token string for cache key validation.
  - When a valid cached auth context exists, populate Hono context variables (`user`, `institutionId`, `role`, `activePermissionKeys`, `supabaseUser`) instantly without issuing database queries.
  - On cache miss, fetch from DB, populate cache, and proceed.

- [x] **Task 1.3 — Decouple `last_seen_at` User Profile Updates**
  - Track `lastSeenUpdatedMap` in-memory. If updated within the last 5 minutes, skip DB update entirely.
  - When an update is due, dispatch asynchronously (`void prisma.user_profiles.update(...)`) without awaiting on the critical request path.

---

## Verification & Testing

```bash
# 1. Test database pool configuration
pnpm --filter @sentinel/db test
# Result: 9 passed (9 files, 25 tests passed)

# 2. Test auth middleware caching and performance
pnpm --filter sentinel-api test 'src/middleware/auth.test.ts'
# Result: 1 passed (1 file, 5 tests passed)
```

---

## Risks & Rollback

- **Risk:** Cache stale permissions if an admin modifies user roles during an active 60s window.
  - **Mitigation:** 60s TTL ensures fast automatic invalidation. Permission changes take at most 60 seconds to propagate without manual cache clearing.
- **Rollback Strategy:** Revert `auth.ts` and `db.ts` to their previous direct query logic.
