# LiveKit Work Package 02: Persistence, Contracts, and Authorization

## 1. The Context

Live video needs stronger controls than the existing general monitoring read path: one authoritative lease, explicit state transitions, tenant-aware viewer rules, student ownership checks, and private signaling authorization. These controls must exist and be testable before any LiveKit room or browser token can be created.

## 2. The Triad

### Option A: The Pragmatic Path (Speed & Simplicity)

- **Approach:** Keep active sessions in API memory and reuse `examinations:view` plus the existing monitoring visibility predicate.
- **Tradeoff:** Multiple API instances, browser crashes, and unrelated staff access would make leases, cleanup, and privacy nondeterministic.

### Option B: The Strategic Path (Robustness & Scalability)

- **Approach:** Add durable lease/webhook tables, atomic partial indexes, a tested state machine, a dedicated permission, strict relationship checks, and private Realtime RLS/trigger signaling.
- **Tradeoff:** Requires a coordinated Prisma/SQL migration before backend orchestration can begin.

### Option C: The Pivot Path (Creative & Out-of-the-Box)

- **Approach:** Use Redis TTL keys as the only lease store and public Supabase Broadcast for wake-up.
- **Tradeoff:** Redis loss would erase authorization state and public signaling would widen the attack and recovery surface.

## 3. The Execution

**Recommendation:** Option B — the Strategic Path.

**Justification:** PostgreSQL already owns attempts, users, institutions, and audit-critical state. Atomic indexes and compare-and-set transitions prevent duplicate rooms, while a private database-triggered broadcast makes signaling fast without allowing browsers to authorize or emit inspection requests.

### Entry Gate

- [x] Verify every work-package-01 exit criterion and commit are recorded before creating the migration.
- [x] Confirm `LIVE_INSPECTION_ENABLED=false` in all shared environments.

## Pre-Planning Checklist

- [x] Inspected `exam_attempts`, `exams`, `students`, `users`, `institutions`, `rbac_permissions`, permission blueprints, monitoring access predicates, and current Supabase browser clients.
- [x] Selected a database table rather than Redis-only leases.
- [x] Determined that a Prisma migration is required.

## Scope and Affected Files

- `packages/db/prisma/schema.prisma`
- `packages/db/prisma/migrations/[timestamp]_add_live_inspection_leases/migration.sql` **[NEW]**
- `packages/db/prisma/migrations/[timestamp]_add_live_inspection_leases/rollback.sql` **[NEW]**
- `packages/db/src/generated/types.ts`
- `packages/db/src/tests/live-inspection-schema.test.ts` **[NEW]**
- `packages/shared/src/schema/exams/live-inspection-schema.ts` **[NEW]**
- `packages/shared/src/schema/exams/live-inspection-schema.test.ts` **[NEW]**
- `packages/shared/src/schema/index.ts`
- `packages/shared/src/constants/permissions.ts`
- `app/sentinel-api/src/modules/security/permission/data/sync-system-permissions.test.ts`
- `app/sentinel-api/src/modules/examination/live-inspection/live-inspection.repository.ts` **[NEW]**
- `app/sentinel-api/src/modules/examination/live-inspection/live-inspection-state.service.ts` **[NEW]**
- `app/sentinel-api/src/modules/examination/live-inspection/live-inspection-access.service.ts` **[NEW]**
- co-located `*.test.ts` files for each new service

## Phase 1: Define Shared Lease and API Vocabulary

**Goal:** Establish one bounded state/error contract before database and API implementations diverge.

- [x] Create `liveInspectionStateSchema` with `REQUESTED`, `PUBLISHER_CONNECTING`, `PUBLISHER_READY`, `LIVE`, `STOPPING`, `ENDED`, `FAILED`, and `EXPIRED` in `packages/shared/src/schema/exams/live-inspection-schema.ts`.
- [x] Define terminal reason, bounded failure code, safe directive, staff status, start response, connection response, ready/failure acknowledgement, and stop response schemas in the same file; token-bearing schemas must be used only for immediate authenticated responses and must exclude secrets from serializable status models.
- [x] Add documented helpers `isLiveInspectionTerminalState()` and `canTransitionLiveInspectionState()` with an explicit transition map; no wildcard transition is allowed.
- [x] Export the schemas/types through `packages/shared/src/schema/index.ts` and the existing `packages/shared/src/index.ts` barrel.
- [x] Add `live-inspection-schema.test.ts` covering every allowed/denied transition, malformed IDs, unknown states/reasons, safe response redaction, and terminal-state detection.

**Migration required:** No — shared contract work precedes the migration.

## Phase 2: Add Durable Lease and Webhook-Deduplication Storage

**Goal:** Make duplicate acquisition, expiry, and webhook replay database-enforced.

- [x] Add Prisma enums for lease state and terminal reason plus `live_inspection_leases` in `packages/db/prisma/schema.prisma` with UUID `lease_id`, `exam_id`, `attempt_id`, `student_user_id`, `viewer_user_id`, `institution_id`, opaque unique `provider_room_name`, integer `version`, lifecycle timestamps, `expires_at`, bounded `end_reason`, and bounded `last_error_code`.
- [x] Add `livekit_webhook_events` with provider event ID primary key, optional lease ID, bounded event type, received/processed timestamps, and bounded processing result; do not store raw webhook bodies.
- [x] Add the necessary Prisma relations to `exams`, `exam_attempts`, `students/users`, and `institutions`, using cascade behavior only where deletion of the parent must remove operational lease history.
- [x] In the SQL migration, add partial unique indexes enforcing one non-terminal lease per `attempt_id` and one non-terminal lease per `viewer_user_id`, plus indexes on `(state, expires_at)`, `institution_id`, and `provider_room_name`.
- [x] Add SQL check constraints for positive `version`, `expires_at > requested_at`, terminal timestamps/reasons, and maximum bounded error-code length where Prisma cannot express them.
- [x] Regenerate `packages/db/src/generated/types.ts` through the repository's Prisma/Kysely generation workflow.
- [x] Add `packages/db/src/tests/live-inspection-schema.test.ts` proving model/enums/relations/index migration markers exist and the generated DB types expose both tables.

**Migration required:** Yes — new enums, tables, relations, constraints, and indexes. Rollback must first terminate rooms and disable the feature, then drop the Realtime trigger/policy, webhook table, lease table, and enums in dependency order.

## Phase 3: Authorize Private Wake-Up Signaling

**Goal:** Allow only the authenticated owner of an attempt to receive a private state-change hint and prevent all browser broadcasts.

- [x] In the same SQL migration, add a `live_inspection_lease_changed` trigger function that calls `realtime.send()` with private delivery, topic `exam-attempt:<attemptId>:live-inspection`, event `LIVE_INSPECTION_CHANGED`, and payload limited to `leaseId`, `revision`, and `state`.
- [x] Add only a `SELECT` RLS policy on `realtime.messages` for authenticated students whose `auth.uid()` matches `students.user_id` for the UUID attempt encoded by `realtime.topic()`; restrict the policy to the `broadcast` extension.
- [x] Do not add an authenticated `INSERT` policy: browsers must be unable to send start/stop hints on this topic.
- [x] Make topic parsing reject non-matching prefixes/suffixes before casting a UUID so malformed subscription topics cannot raise policy errors.
- [x] Extend `live-inspection-schema.test.ts` or add `packages/db/src/tests/live-inspection-realtime-policy.test.ts` **[NEW]** to assert private payload fields, policy ownership predicates, absence of browser INSERT access, and trigger removal in rollback SQL.

**Migration required:** Yes — trigger/function and `realtime.messages` policy are part of the same coordinated migration.

## Phase 4: Add Dedicated RBAC and Relationship-Aware Access

**Goal:** Separate live-video permission from general monitoring visibility and prove tenant/assignment boundaries.

- [x] Add `MONITOR_LIVE_VIDEO` with key `examinations:monitor_live_video` to `packages/shared/src/constants/permissions.ts`, including module/action/category/scope/name/description metadata.
- [x] Add the permission by default to `superadmin`, `admin`, and `instructor` system blueprints; exclude `support` and `student`. This permission alone must never bypass tenant or relationship checks.
- [x] Update `sync-system-permissions.test.ts` to prove catalog synchronization and exact role-blueprint inclusion/exclusion.
- [x] Create exported `assertLiveInspectionViewerAccess()` in `live-inspection-access.service.ts`: require the dedicated permission; deny support/student; constrain admin/superadmin to the active institution; and require instructors to be creator, accepted proctor, `exam_section_assignments.instructor_id`, or `classroom_instructor_assignments.instructor_user_id`. Do not grant access from `is_public` or `exam_shares` alone.
- [x] Create exported `assertLiveInspectionStudentAccess()` to resolve `sessionId` through `SessionRepository.getOwnedSessionAttempt()`, require the authenticated student owner, `camera_required=true`, incomplete attempt status, and lifecycle state outside `LOCKED`, `CLOSED`, and `SUPERSEDED`.
- [x] Add `live-inspection-access.service.test.ts` covering every allowed relationship, public/share-only denial, cross-tenant denial, permission denial, student mismatch, camera-optional denial, completed/locked/closed/superseded denial, and missing records without existence leakage.

**Migration required:** No additional migration — permission records are synchronized from the shared catalog; lease/RLS migration is already defined above.

## Phase 5: Implement Atomic Repository and State Transitions

**Goal:** Provide provider-independent lease operations that cannot race into duplicate active sessions.

- [x] Create documented repository functions in `live-inspection.repository.ts` for atomic acquire, get-for-viewer, get-for-student, compare-and-set transition, count active globally/by institution, find expired leases, record webhook event once, mark webhook processed, and idempotent terminalization.
- [x] Ensure acquire translates partial-index violations into `INSPECTION_ALREADY_ACTIVE` or `VIEWER_ALREADY_ACTIVE` without returning another viewer's identity.
- [x] Create `live-inspection-state.service.ts` to apply only the shared transition map, increment `version`, set state-specific timestamps, and make repeated terminal calls no-ops with the original terminal result.
- [x] Add repository transaction tests against the repository test database for simultaneous acquisition and webhook deduplication; add state-service tests for stale versions, late acknowledgements, expiry, and duplicate stop.

**Migration required:** Yes — repository behavior depends on the migration from phases 2-3.

## Exit Gate

- [x] Migration applies to a clean database and the rollback script is reviewed before any provider endpoint is mounted.
- [x] Partial indexes reject duplicate attempt/viewer leases under concurrent tests.
- [x] Students can receive only their private topic and cannot send broadcasts.
- [x] RBAC and relationship tests deny support, students, cross-tenant viewers, and share/public-only access.
- [x] State-machine and repository tests pass with no LiveKit SDK calls.
- [x] Commit this package before beginning work package 03.

**Database validation note:** On 2026-07-20, the first Supabase deploy attempt caught an ownership issue on `realtime.messages`; Supabase already owns and enables RLS for that table, so the migration was corrected to create only the required SELECT policy. The empty partial LiveKit objects from the failed attempt were rolled back with the reviewed rollback script, Prisma marked the failed attempt rolled back, and `pnpm --dir packages/db exec prisma migrate deploy` then applied successfully. Synthetic concurrent inserts confirmed `live_inspection_leases_active_attempt_key` and `live_inspection_leases_active_viewer_key` reject duplicates, and the synthetic rows were removed.

## Compatibility, Configuration, and Rollback Notes

- **Breaking API changes:** None; no route is added in this package.
- **Database migration:** Required and reversible only after the feature is disabled and active rooms are terminated.
- **Environment variables:** Uses work-package-01 configuration; none added here.
- **Rollback:** Reverse work packages 06-03 first, remove clients/hooks, disable the feature, then drop RLS policy/trigger/function, webhook table, lease table, relation fields, and enums.
