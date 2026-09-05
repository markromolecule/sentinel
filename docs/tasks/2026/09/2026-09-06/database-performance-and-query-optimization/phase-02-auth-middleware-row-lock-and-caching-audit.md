---
parent: "database-performance-and-query-optimization"
title: "Phase 2: In-Memory last_seen_at Throttling & Auth Cache Verification"
type: task
status: ready
created: "2026-09-06"
tags: [task, phase, auth, row-locks, lru-cache, optimization]
---

# Phase 2: In-Memory last_seen_at Throttling & Auth Cache Verification

## Goal

Audit `app/sentinel-api/src/middleware/auth.ts` and related authentication paths to verify that `last_seen_at` updates and user RBAC lookups are strictly cached and throttled, eliminating the 115-second row-lock spikes on `user_profiles`.

## Affected Files

- `app/sentinel-api/src/middleware/auth.ts` — Authentication middleware and LRU caching
- `app/sentinel-api/src/middleware/auth.test.ts` — Unit tests verifying cache hit and throttling behavior

## Implementation Tasks

- [x] **Task 2.1:** Inspect `authMiddleware` execution flow to verify:
  - Cache lookup by token digest returns `{ user, institutionId, role, activePermissionKeys }` in `< 0.1ms`.
  - Added in-flight promise coalescing (`authInFlightPromises`) to completely eliminate cache stampedes / thundering herds during multi-user login surges.
  - `lastSeenUpdatedMap` checks if user was updated within the last 5 minutes before queueing any `UPDATE user_profiles`.
  - Any `UPDATE user_profiles` is dispatched non-blockingly (without `await` in the request path).
- [x] **Task 2.2:** Add test cases in `auth.test.ts` verifying that 50 concurrent requests for the same user only trigger 1 database read and at most 1 background write.

## Verification

- Run `pnpm --dir app/sentinel-api exec vitest run 'src/middleware/auth.test.ts'` to verify green test execution (6/6 tests passed).
