# Task 2 — Phase 1: Assignment Crash and Notification Referential Integrity

**Status:** Implemented  
**Parent plan:** `docs/task/2026-08-05/fix-002-implementation-plan-patch-issues-prod.md`  
**Source issues:** Issue 6 and Issue 7 in `docs/context/August/4/patch-issues-prod.md`

## Goal

Make examination assignment reliable in sentinel-web and sentinel-core, and prevent invalid
notification actor IDs from turning a secondary notification side effect into an unexplained client
failure.

## Analysis

Both assignment surfaces use parallel UI implementations over shared hooks/services. The assignment
crash may be caused by a payload/response mismatch or an unguarded nullable value, but it may also be
triggered by notification creation. `createNotificationData()` currently writes `actor_user_id` from
the caller without verifying that it satisfies the database FK, matching the reported `23503` error.

## Options

### Option A: The Pragmatic Path (Speed & Simplicity)

- **Approach:** Guard assignment submit/render paths and coerce missing or invalid notification actors
  to `null`, leaving the current mutation flow intact.
- **Tradeoff:** Fastest recovery, but actor identity mismatches can recur at other call sites.

### Option B: The Strategic Path (Robustness & Scalability)

- **Approach:** Align both app payloads with the shared assignment contract, validate the application
  user at the notification boundary, isolate notification failure from the primary assignment write,
  and add cross-surface regression coverage.
- **Tradeoff:** Requires tracing all actor callers and defining an explicit side-effect reliability
  policy.

### Option C: The Pivot Path (Creative & Out-of-the-Box)

- **Approach:** Introduce an outbox for assignment notifications so assignment commits independently and
  a worker resolves/retries actor identity later.
- **Tradeoff:** Adds a new table, worker/retry operations, and rollout complexity for a currently
  localized FK defect.

## Execution

**Recommendation:** Option B.

1. Capture the production browser stack/request and compare web/Core payloads and response handling.
2. Confirm the FK target in `packages/db/prisma/schema.prisma` and trace every `actorUserId` source.
3. Implement contract validation and safe notification side-effect behavior, then verify assignment
   success independently of notification delivery.

## Checklist

- [ ] Capture the exact failed assignment request, response, browser stack, selected values, and user role for sentinel-web and sentinel-core.
- [x] Compare `new-assignments-builder.tsx`, `add-exam-section-assignment-dialog.tsx`, and assignment mutation calls under both `app/sentinel-web/src/app/(protected)/(instructor)/exams/assign/` and `app/sentinel-core/src/app/(protected)/exams/assign/`.
- [x] Trace shared query/mutation payload and response types in `packages/services/src/api/exam-section-assignments.ts` and `packages/hooks/src/query/`.
- [x] Add submit-time validation for required exam/section/classroom/instructor/room values in the confirmed builder/dialog functions; prevent undefined dereferences and show recoverable field/toast errors.
- [x] Add guarded mutation error rendering and cache invalidation handling in both assignment surfaces so API failures cannot produce a Next.js client exception page.
- [x] Inspect `packages/db/prisma/schema.prisma` and notification migrations to confirm whether `actor_user_id` references the application `users` table and identify the production identity mismatch.
- [x] Trace `actorUserId` through `app/sentinel-api/src/modules/general/notification/services/activity/` and related notification callers; distinguish application users from auth/system IDs.
- [x] Update `app/sentinel-api/src/modules/general/notification/data/create-notification.ts` or its service boundary to validate/resolve actor identity and write `null` for missing/deleted/system actors.
- [x] Define and implement the intended failure policy in `app/sentinel-api/src/modules/general/notification/notification.service.ts`: log the notification failure with safe identifiers and prevent a secondary side effect from masking a successful primary assignment when policy permits.
- [x] Add notification tests for valid actor, missing/deleted actor, null system actor, and FK failure behavior.
- [x] Add assignment service/controller tests covering valid payloads, incomplete payloads, nullable responses, and notification failure without assignment rollback when that is the selected policy.
- [x] Run focused API, services, hooks, sentinel-web, and sentinel-core tests.
- [ ] Execute both assignment flows in a production-like environment.
      **Migration required:** No — first reuse the existing FK and correct identity handling. A migration is permitted only after confirming the FK target itself is wrong; document forward SQL and rollback SQL before proceeding.

## Completion Gate

- [x] Assignment create/update/delete succeeds in both staff surfaces.
- [x] Invalid selections produce recoverable validation feedback, not a client exception page.
- [x] Valid and system notifications never insert an invalid `actor_user_id`.
- [x] Assignment success/failure behavior is explicitly tested when notification persistence fails.
- [ ] Production-like smoke-test results and the FK/identity decision are recorded here.

## Implementation notes

- The assignment dialogs now catch rejected save mutations and surface a recoverable inline error instead of letting the rejection escape the component tree.
- Notification writes now resolve the actor against the application `users` table and fall back to `null` for missing or malformed actor IDs.
- Notification failures are logged with safe identifiers, and the assignment services now treat notification delivery as a secondary concern.
- Verified with focused Vitest runs for the API notification/assignment services and both assignment builder surfaces.
