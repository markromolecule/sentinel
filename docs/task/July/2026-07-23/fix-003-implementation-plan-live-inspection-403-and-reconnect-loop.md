# Live Inspection 403 and Reconnect Redirect Loop — Implementation Plan

**Date:** July 23, 2026  
**Status:** Investigation complete — ready for implementation  
**Related plan:** `docs/task/2026-07-23/fix-002-implementation-plan-resolve-live-inspection-livekit-issue.md`

## Goal

Resolve two production-path failures:

1. The student live-inspection directive returns `403`, leaving the lease in `REQUESTED`, the instructor on **Waiting for student camera**, and LiveKit with zero participants.
2. Reloading or reconnecting an active attempt should route the student to the lobby and count one reconnect after an explicit resume, but the application currently loops between `/attempt` and `/lobby` without incrementing the counter.

The implementation must keep student ownership, tenant authorization, camera-only publication, answer-draft preservation, and maximum reconnect enforcement intact.

## Confirmed Evidence and Root Causes

### Live inspection

The screenshots show:

- Student and instructor are already isolated in separate browser contexts, so shared browser authentication storage is not the cause of this run.
- `POST /examination/flow/live-inspections/directive` repeatedly returns `403 Forbidden`.
- The instructor successfully creates and polls a `REQUESTED` lease.
- LiveKit creates and later closes rooms, but each room has zero participants.

A read-only database check for the shown exam confirmed:

- `exam_configurations.camera_required` is `NULL`.
- The configuration mapper interprets `NULL` as “inherit the effective default,” which resolves to `cameraRequired: true`.
- `assertLiveInspectionStudentAccess()` bypasses the canonical configuration mapper and directly requires the raw column to be `true`.
- The active attempt is `IN_PROGRESS`, incomplete, and owned by the student.
- Its live-inspection lease remains `REQUESTED` with no publisher error because the directive is rejected before token creation.

The exact failure chain is:

```text
raw camera_required = NULL
        ↓
frontend/API configuration mapper resolves inherited default = true
        ↓
student attempt enables MediaPipe and live-inspection bridge
        ↓
live-inspection access service reads raw NULL and evaluates NULL !== true
        ↓
directive returns 403
        ↓
student never requests publisher credentials or connects to LiveKit
        ↓
lease stays REQUESTED; instructor waits; LiveKit has zero participants
```

### Reconnect loop

The loop is caused by two competing navigation authorities:

- `useExamSession()` sees `/attempt` without a fresh unconsumed lobby-entry record and redirects to `/lobby`.
- `resolveStudentExamStage()` sees an active/resumable attempt while the requested stage is `lobby` and redirects immediately back to `/attempt`.
- The lobby cannot remain mounted long enough for `handleEnterExam()` to call the resume endpoint.
- Because the resume endpoint is never reached, `reconnect_attempt_count` remains unchanged; the observed attempt still has count `0`.

The current backend duplicate suppression also uses `last_synced_at`, which is answer-sync state rather than reconnect idempotency state. A recent answer sync can suppress a real reconnect, while sufficiently separated duplicate resume requests can count twice.

## Architectural Decisions

### Use canonical effective configuration everywhere

Live-inspection authorization must resolve configuration through `getExamConfigurationState()` and check `configuration.cameraRequired`. It must not interpret nullable/inherited database columns independently.

This preserves the existing behavior:

- inherited `true` permits live inspection;
- explicit `true` permits live inspection;
- inherited or explicit `false` denies live inspection;
- completed, locked, closed, superseded, wrong-owner, and wrong-session attempts remain denied.

### Establish one attempt-entry authority

The stage guard should own route eligibility. `useExamSession()` should hydrate and synchronize a session after entry is approved, not independently redirect or start/resume an attempt.

For an active attempt:

- `/attempt` without a fresh lobby-entry grant → redirect once to `/lobby`;
- `/lobby` while reconnect is required → remain on `/lobby`;
- the student explicitly selects Resume/Enter;
- the server validates and counts the reconnect;
- the lobby writes a fresh one-use entry grant;
- `/attempt` consumes the grant and renders.

### Count reconnects with an idempotency key

Create a UUID `resumeRequestId` when reconnect intent is recorded. Pass it through the lobby resume request and persist the most recently accepted ID on the attempt.

The server must increment with a compare-and-set condition:

```text
active attempt
AND reconnect limit not reached
AND last_reconnect_request_id is different from resumeRequestId
```

A duplicate request with the same ID returns the current resumed session without another increment. `last_synced_at` returns to answer/progress synchronization only.

### Preserve the current LiveKit hardening work

The in-progress Stop/Restart, polling, camera-track grace, and retry changes from the related `fix-002` plan remain valid. The inherited-configuration 403 must be fixed before their real browser behavior can be verified.

## Scope and Affected Files

### Live-inspection authorization and diagnostics

- `app/sentinel-api/src/modules/examination/live-inspection/live-inspection-access.service.ts`
- `app/sentinel-api/src/modules/examination/live-inspection/live-inspection-access.service.test.ts`
- `app/sentinel-api/src/modules/examination/live-inspection/services/get-student-live-inspection-directive.service.ts`
- `app/sentinel-api/src/modules/examination/live-inspection/services/create-publisher-connection.service.ts`
- `app/sentinel-api/src/modules/examination/live-inspection/services/acknowledge-publisher-ready.service.ts`
- `app/sentinel-api/src/modules/examination/live-inspection/live-inspection.routes.test.ts`
- `packages/hooks/src/live-inspection/use-student-live-inspection-publisher.ts`
- `packages/hooks/src/live-inspection/use-student-live-inspection-publisher.test.tsx`

### Reconnect state and API contract

- `packages/db/prisma/schema.prisma`
- `packages/db/prisma/migrations/<timestamp>_add_exam_attempt_reconnect_idempotency/migration.sql` **[NEW]**
- `app/sentinel-api/src/modules/examination/flow/flow.dto.ts`
- `app/sentinel-api/src/modules/examination/flow/controllers/start-session.controller.ts`
- `app/sentinel-api/src/modules/examination/flow/services/start-session.service.ts`
- `app/sentinel-api/src/modules/examination/flow/data/session.repository.ts`
- co-located flow/session tests
- `packages/services/src/api/exams/types.ts`
- `packages/services/src/api/exams/flow.ts`
- `packages/services/src/api/exams/flow.test.ts`

### Reconnect route orchestration

- `app/sentinel-web/src/app/(protected)/student/exam/[id]/_lib/exam-session-storage/types.ts`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/_lib/exam-session-storage/lobby-storage.ts`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/_lib/exam-session-storage/lobby-storage.test.ts`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/_lib/student-exam-flow/index.ts`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/_lib/student-exam-flow/index.test.ts`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-student-exam-stage-guard.ts`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-student-exam-stage-guard.test.tsx` **[NEW]**
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-session.ts`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-session.test.tsx`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-interruption.ts`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-interruption.test.tsx`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/_hooks/use-lobby-actions.ts`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/_hooks/use-lobby-actions.test.tsx`
- attempt/lobby page integration tests

## Phase 1: Fix the False Student-Access 403

**Goal:** A student-owned active attempt uses the same effective camera configuration as the exam UI and session snapshot.

- [x] Replace the direct `exam_configurations.camera_required` query in `assertLiveInspectionStudentAccess()` with `getExamConfigurationState(dbClient, attempt.exam_id)`.
- [x] Permit the request only when `configuration.cameraRequired === true`.
- [x] Keep attempt ownership and terminal/lifecycle checks before issuing any directive or token.
- [x] Ensure missing configuration rows use the same institution/global defaults as the rest of the exam flow.
- [x] Do not change Supabase RLS, JWT validation, session ownership, or LiveKit token grants.
- [x] Add access-service tests for:
    - raw `camera_required = NULL` with effective default `true`;
    - explicit `camera_required = true`;
    - raw `NULL` with effective default `false`;
    - explicit `false`;
    - incomplete `IN_PROGRESS` attempt;
    - completed, locked, closed, superseded, wrong-owner, and missing attempts.
- [x] Add a route/service integration test covering start lease → student directive → publisher connection → publisher ready when camera-required is inherited.
- [x] Confirm the directive response contains only the bounded lease directive and no provider credentials.

**Migration required:** No.

## Phase 2: Stop Repeated Forbidden Polling and Prove the Media Path

**Goal:** Failures are diagnosable, while a valid inherited configuration reaches LiveKit publication.

- [x] Classify directive failures in the student publisher hook by HTTP status:
    - `401` → authentication unavailable;
    - `403` → live-inspection access denied;
    - `404` → no active directive, which is a normal idle condition;
    - network/5xx → transient recovery.
- [x] Do not treat `404` as an error or spam browser diagnostics when no inspection is active.
- [x] Back off or suspend repeated `401/403` polling until auth state, visibility, session ID, attempt ID, or enabled state changes.
- [x] Keep bounded 3-second reconciliation for normal `404`/transient missed-event recovery, with no overlapping requests.
- [x] Never log response bodies, JWTs, session IDs, lease IDs, LiveKit tokens, or room names.
- [x] Complete the related `fix-002` Stop/Restart and camera-track readiness tests before browser validation.
- [x] Run an isolated two-context test and verify:
    1. directive returns `200`;
    2. publisher connection returns `200`;
    3. LiveKit shows one publisher participant;
    4. viewer connection raises the room to two participants;
    5. instructor video becomes playable;
    6. Stop closes the room and terminalizes the lease.

**Migration required:** No.

## Phase 3: Replace Competing Redirect Guards with One Entry Gate

**Goal:** Reload and reconnection settle on the lobby instead of bouncing back to the attempt.

- [x] Extend the pure stage resolver input with a bounded entry context such as:
    - `hasFreshLobbyEntry`;
    - `hasReconnectIntent`;
    - `storedSessionId`;
    - `lobbyEntrySessionId`.
- [x] Change active-attempt resolution:
    - requested `attempt` + no fresh valid entry → target `lobby`;
    - requested `lobby` + active/resumable attempt → remain `lobby`;
    - requested `attempt` + fresh session-matched entry → remain `attempt`;
    - terminal lifecycle and max-reconnect blocks retain higher precedence.
- [x] Make `useStudentExamStageGuard()` read the entry/reconnect records and become the only hook that issues stage redirects.
- [x] Remove route-redirection and reconnect-intent creation from `useExamSession()`; retain session hydration, draft restoration, timer state, and progress synchronization.
- [x] Prevent `useExamSession()` from automatically calling `startExamSession()` on the attempt page. Initial start and resume must happen only from the stable lobby action.
- [x] Bind the one-use lobby entry to both `examId` and the returned `sessionId`; reject stale or mismatched entry grants.
- [x] Consume the grant once when the attempt route is accepted, with a StrictMode-safe in-memory guard.
- [x] Keep lobby rendering stable while an active attempt is resumable so the student can see reconnect usage and explicitly continue.
- [x] Add a navigation integration test that exercises the actual sequence:

```text
/attempt reload
→ /lobby exactly once
→ remain /lobby
→ user clicks Resume
→ server resume succeeds
→ /attempt exactly once
```

**Migration required:** No.

## Phase 4: Make Reconnect Counting Idempotent and Independent of Answer Sync

**Goal:** One logical reload/reconnect consumes exactly one reconnect attempt.

- [x] Add nullable `last_reconnect_request_id UUID` to `exam_attempts`.
- [x] Add `resumeRequestId` to `StoredReconnectIntentRecord`, generate it once per interruption, and preserve it across reload/lobby rendering.
- [x] Add optional `resumeRequestId` to the start-session DTO and shared service payload.
- [x] Require `resumeRequestId` when resuming an existing active attempt; do not require it for the first attempt creation.
- [x] Replace the `last_synced_at < 3 seconds` duplicate heuristic with an atomic conditional update on `last_reconnect_request_id`.
- [x] Within one database transaction:
    1. read/lock the current active attempt;
    2. validate lifecycle and maximum reconnect policy;
    3. if the same `resumeRequestId` was already accepted, return the current session without incrementing;
    4. otherwise increment `reconnect_attempt_count`, store the request ID, and return the updated count.
- [x] Leave `last_synced_at` exclusively for answer/progress synchronization.
- [x] Return `reconnectAttemptCount` and `maxReconnectAttempts` in both first-start and resume responses.
- [x] Clear reconnect intent only after a successful resume response and after the fresh lobby entry is safely written.
- [x] Preserve reconnect intent and answer drafts when the resume request fails or the network drops.
- [x] Add repository/API tests for first start, first reconnect, duplicate request ID, two distinct reconnects, concurrent duplicate requests, recent answer sync before reconnect, maximum reconnect rejection, lifecycle block, and override-based resume.

**Migration required:** Yes — one nullable UUID column on `exam_attempts`. Rollback drops `last_reconnect_request_id` after reverting the new resume request contract.

## Phase 5: Interruption Semantics and Regression Coverage

**Goal:** Reload, close/reopen, and offline recovery consistently use the lobby without counting intentional completion/navigation.

- [x] Keep `beforeunload`, `pagehide`, and `offline` as best-effort reconnect-intent signals.
- [x] Suppress reconnect intent when navigation is already committed to Turn In, result, feedback, history, or an authorized lifecycle redirect.
- [x] On `online`, redirect an active attempt to the lobby only when a valid reconnect intent exists.
- [x] Preserve local answers and elapsed time before any interruption signal; never clear the local draft during lobby redirection.
- [x] Restore and reconcile local/server answers before making the resumed attempt interactive.
- [x] Add browser-hook tests for reload, close/reopen, offline/online, direct attempt URL, expired intent, stale entry, mismatched session entry, StrictMode effects, Turn In, locked attempt, and max reconnect reached.
- [x] Add an integration regression test proving the route history contains no repeating `/lobby → /attempt → /lobby` sequence.
- [x] Confirm monitoring providers and LiveKit publisher cleanup run on attempt unmount and restart only after the resumed attempt is admitted.

**Migration required:** No additional migration beyond Phase 4.

## Verification Commands

```bash
pnpm --dir packages/db build
pnpm --dir packages/shared test
pnpm --dir packages/shared build
pnpm --dir packages/services test
pnpm --dir packages/services build
pnpm --dir app/sentinel-api test
pnpm --dir app/sentinel-api build
pnpm --dir packages/hooks test
pnpm --dir packages/hooks build
pnpm --dir app/sentinel-web test
pnpm --dir app/sentinel-web build
pnpm --dir packages/ui test
pnpm --dir app/sentinel-core test
```

Run focused tests first for the live-inspection access service, flow/session repository, stage resolver, stage guard, exam session, interruption hook, lobby action, and publisher hook.

## Manual Acceptance Matrix

| Scenario                                | Expected outcome                                                |
| :-------------------------------------- | :-------------------------------------------------------------- |
| Inherited camera-required configuration | Student directive returns `200`; publication begins             |
| Explicit camera-required configuration  | Same successful media path                                      |
| Effective camera disabled               | No live-inspection publisher is enabled; access remains denied  |
| Normal live inspection                  | LiveKit reaches one publisher and two total participants        |
| Reload during active attempt            | One redirect to lobby; no automatic bounce                      |
| Resume after reload                     | Reconnect count increments once, then attempt opens             |
| Double-click/duplicate resume request   | Same session response; reconnect count increments once          |
| Answer sync immediately before reload   | Real reconnect still increments                                 |
| Offline then online                     | Lobby shown when connectivity returns; answers preserved        |
| Turn In/result navigation               | No reconnect intent or reconnect increment                      |
| Maximum reconnect reached               | Lobby/instruction shows bounded denial; attempt does not reopen |
| Locked/closed/superseded attempt        | Lifecycle block wins; no resume or LiveKit publication          |

## Done Criteria

- [ ] The observed inherited `camera_required = NULL` case no longer returns a false `403`.
- [ ] A valid student directive advances the lease beyond `REQUESTED`.
- [ ] LiveKit shows the student publisher and instructor viewer participants.
- [ ] The monitoring UI reaches playable live video instead of remaining on Waiting for student camera.
- [ ] Reloading an active attempt lands and remains in the lobby.
- [ ] Resume increments `reconnect_attempt_count` exactly once and returns to the attempt.
- [ ] No redirect loop appears in the Next.js request log.
- [ ] Duplicate resume calls are idempotent without using `last_synced_at`.
- [ ] Local answer and elapsed-time drafts survive reload/offline recovery.
- [ ] Authentication, ownership, RLS, tenant isolation, reconnect limits, and lifecycle blocks remain enforced.
- [ ] All focused and affected workspace tests/builds pass.

## Risks and Rollback

- **Configuration drift:** Other features may also read nullable raw configuration columns. Keep this change scoped to live inspection, then audit separately for similar direct reads.
- **Redirect regressions:** Route behavior is distributed across a pure resolver and several hooks. Require a route-sequence integration test, not only isolated hook tests.
- **Reconnect migration:** Deploy the nullable column before clients begin sending `resumeRequestId`; keep the DTO optional during rollout, but require it server-side only for active-attempt resume.
- **Polling load:** Access-denied polling must back off so a configuration/auth defect does not create continuous 3-second forbidden traffic.
- **Rollback:** Disable live inspection through the existing feature flag if media validation fails. For reconnect rollback, restore the prior request contract before dropping `last_reconnect_request_id`; preserve answer drafts and existing reconnect counts.
