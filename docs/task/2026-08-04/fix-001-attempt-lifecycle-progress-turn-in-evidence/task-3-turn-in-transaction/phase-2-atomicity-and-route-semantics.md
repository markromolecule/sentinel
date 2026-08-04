# Task 3 — Phase 2: Atomicity and Route Semantics

**Status:** Complete  
**Depends on:** `phase-1-supported-transaction-bridge.md`  
**Parent plan:** `../../fix-001-implementation-plan-attempt-lifecycle-progress-turn-in-evidence.md`

## Goal

Prove rollback, idempotent retry, and lifecycle-conflict responses against the supported transaction
boundary.

## Implementation Checklist

- [x] Preserve lifecycle guard precedence in
      `app/sentinel-api/src/modules/examination/flow/services/complete-session.service.ts` so closed
      attempts return a lifecycle conflict before completion persistence begins.
- [x] Preserve score/preparation checksum behavior in
      `app/sentinel-api/src/modules/examination/flow/services/complete-session/complete-session.scoring.ts`
      and `complete-session.persistence.ts`.
- [x] Ensure controller error mapping in
      `app/sentinel-api/src/modules/examination/flow/controllers/complete-session.controller.ts`
      does not expose driver internals.

## Tests and Verification

- [x] Extend `app/sentinel-api/src/modules/examination/flow/flow.test.ts` for valid committed score
      response and same-result retry.
- [x] Add a database-backed transaction test using
      `app/sentinel-api/src/lib/test-with-db-client.ts` that forces lifecycle-event insertion failure
      and proves the `exam_attempts` completion update rolls back.
- [x] Add a database-backed retry test proving one completed result and one `SUBMITTED` event.
- [x] Extend
      `app/sentinel-api/src/modules/examination/flow/controllers/complete-session.controller.test.ts`
      for valid `200`, lifecycle `409`, stale preparation `409`, and sanitized persistence `500`.
- [x] Run focused API tests, then `pnpm --dir app/sentinel-api test` when database access is
      available.

## Migration Decision

**Migration required:** No — tests use existing attempt and lifecycle-event tables.

## Completion Gate

- [x] Record focused and DB-backed command results here during implementation.
- [x] Confirm attempt completion and `SUBMITTED` event are one atomic unit.
- [x] Confirm retries cannot duplicate lifecycle events.
- [x] Mark this phase complete only after tests pass.

## Verification

- `pnpm --dir app/sentinel-api exec vitest run 'src/modules/examination/flow/controllers/complete-session.controller.test.ts' --config vitest.config.ts`
- `pnpm --dir app/sentinel-api exec vitest run 'src/modules/examination/flow/services/complete-session/complete-session.persistence.atomicity.test.ts' --config vitest.config.ts`
- `pnpm --dir app/sentinel-api exec vitest run 'src/modules/examination/flow/flow.test.ts' --config vitest.config.ts`
