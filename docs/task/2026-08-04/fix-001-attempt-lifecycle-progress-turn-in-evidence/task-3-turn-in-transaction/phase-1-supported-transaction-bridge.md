# Task 3 — Phase 1: Supported Transaction Bridge

**Status:** Not started  
**Parent plan:** `../../fix-001-implementation-plan-attempt-lifecycle-progress-turn-in-evidence.md`

## Goal

Route completion persistence through `@sentinel/db`'s Prisma `$transaction` bridge instead of the
unsupported Kysely-native transaction method.

## Implementation Checklist

- [ ] Remove `executeInTransactionIfAvailable()` from
      `app/sentinel-api/src/modules/examination/flow/services/complete-session/complete-session.persistence.ts`.
- [ ] Call exported `executeTransaction()` from `packages/db/src/create-db-client.ts` and pass its
      transaction-scoped `$kysely` client to `SessionRepository.completeSession()` and
      `appendExamAttemptLifecycleEvent()`.
- [ ] Keep the checksum-idempotency read on the same transaction-scoped client.
- [ ] Add JSDoc to any new exported transaction adapter/injection point; do not add a non-atomic
      production fallback.

## Tests and Verification

- [ ] Create
      `app/sentinel-api/src/modules/examination/flow/services/complete-session/complete-session.persistence.test.ts`
      with mocked `executeTransaction()` proving all writes receive one scoped client and
      `dbClient.transaction()` is never called.
- [ ] Cover success, same-checksum reuse, different-checksum conflict, zero-row lifecycle change,
      and missing completion timestamp.
- [ ] Run focused `sentinel-api` tests and the `packages/db` typecheck/build.

## Migration Decision

**Migration required:** No — this phase changes transaction execution only.

## Completion Gate

- [ ] Record focused command results here during implementation.
- [ ] Confirm production cannot reach `PrismaDriver.beginTransaction()` through Kysely.
- [ ] Confirm no non-atomic fallback exists in completion.
- [ ] Mark this phase complete only after tests pass.
