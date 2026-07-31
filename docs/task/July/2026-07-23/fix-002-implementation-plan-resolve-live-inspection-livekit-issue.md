# Resolve Live Inspection LiveKit Issue — Implementation Plan

**Source:** `docs/context/July/July 23/resolve-live-inspection-livekit-issue.md`  
**Status:** Ready for implementation  
**Recommended delivery:** One backend/state-machine change set followed by one client resilience/UI change set

## Goal

Make live camera inspection recoverable and deterministic when Realtime delivery is delayed, the student camera track is not immediately ready, an instructor retries a timed-out request, or stop/retry races with publisher or reconciler state changes.

The repair must preserve the existing security boundary: student and instructor sessions still require separate browser storage contexts during same-device testing, and no RLS or ownership check should be weakened to support two roles in one browser profile.

## Current-System Understanding

The LiveKit room provider is not the primary failure point. The API successfully creates a room, but the student often never joins it, so the provider correctly reports zero participants and zero publishers.

There are five contributing behaviors:

1. **Same-profile auth collision is the primary local reproducer.** Student and instructor tabs in one browser profile share Supabase storage. The second login replaces the first JWT, so the student tab loses access to its private Realtime topic and student-only directive endpoints.
2. **Stop can fail even without a version race.** `stopLiveInspection()` permits stopping a `REQUESTED` lease, but `LIVE_INSPECTION_TRANSITION_MAP` does not permit `REQUESTED -> STOPPING`. Stopping while the UI is still waiting can therefore produce a deterministic `409`, in addition to the documented compare-and-set race.
3. **Stop is not fully idempotent across concurrent updates.** It handles a lease that was already terminal or `STOPPING` at the initial read, but it does not recover when the state/version changes after that read. A second terminalization caller can also return stale `STOPPING` data when another caller has already ended the lease.
4. **Retry does not create a new directive.** The viewer's `retry()` calls the normal start path. The API returns the same same-viewer active lease, without changing its version or emitting another `LIVE_INSPECTION_CHANGED` event. A missed request can therefore remain stuck.
5. **The client timing budget is internally inconsistent.** The student fallback reconciliation interval is 10 seconds, while the current uncommitted viewer timeout is 15 seconds. That leaves too little time for a delayed directive fetch, camera-track clone, LiveKit connection, publication, and publisher-ready acknowledgement. A temporarily unavailable MediaPipe track is also terminalized immediately as `NO_LIVE_CAMERA_TRACK`.

## Design Decisions

### 1. Keep authentication and RLS strict

Do not change `live_inspection_student_private_select`, `assertLiveInspectionStudentAccess`, or token ownership rules. Update the runbook to require isolated browser contexts:

- Student: normal browser profile.
- Instructor/admin: Incognito, a separate browser profile, or a different browser.

Student-side diagnostics may report a bounded authorization/status category locally, but must not log JWTs, LiveKit tokens, provider room names, session IDs, or user identity data.

### 2. Make explicit Retry replace the owned active lease

Add an optional `restart: true` field to the existing start request. Its semantics are:

- Normal start remains idempotent and may return the viewer's existing active lease.
- Restart may replace only an active lease owned by the same viewer and attempt.
- Restart must stop and clean the old provider room before acquiring a new lease and room.
- Restart must never displace another viewer's lease.
- Concurrent restart requests must converge on one new active lease; a unique-index race should re-read and return the newly acquired same-viewer lease instead of surfacing a false conflict.

This gives Retry a fresh lease ID, revision, room, insert-trigger signal, and timeout budget without weakening ordinary duplicate-start protection.

### 3. Make Stop idempotent by outcome

Every authorized stop request should end in one of these safe outcomes:

- Return the current terminal lease.
- Move the current active lease to `STOPPING`, clean the provider room, terminalize it, and return the terminal row.
- If the compare-and-set loses a race, re-read the lease and continue from its current state.

Bound the re-read/compare-and-set loop so a pathological writer cannot create an unbounded request. Log lifecycle completion only for the caller that actually performs the terminal transition.

### 4. Use a coherent client timing budget

- Viewer publisher-ready timeout: **30 seconds**.
- Viewer status poll: retain **2 seconds**.
- Student fallback directive reconciliation: **3 seconds**, implemented without overlapping in-flight reconciliations.
- Missing camera track grace period: retry track acquisition for up to **8 seconds** before acknowledging `NO_LIVE_CAMERA_TRACK`.

Realtime remains the fast path. Polling is the recovery path and must work while the attempt page is mounted, including background-tab throttling and foreground/online recovery.

### 5. Surface bounded failure reasons

The staff status already contains `lastErrorCode`; the viewer should map recognized codes to safe UI reasons. At minimum:

- `NO_LIVE_CAMERA_TRACK` → student camera was not ready.
- `LIVEKIT_CONNECT_FAILED` → student live connection failed.
- `LIVEKIT_PUBLISH_FAILED` → student camera publication failed.
- `LIVEKIT_RUNTIME_LOST` → student live connection was interrupted.

Unknown codes remain `STUDENT_UNAVAILABLE`. Authorization errors in the student hook should be distinguishable in local diagnostics, but the instructor UI must not claim an auth mismatch because the server cannot authoritatively infer a same-browser profile collision from the lease alone.

## Scope and Affected Files

### State machine and API

- `packages/shared/src/schema/exams/live-inspection-schema.ts`
- `packages/shared/src/schema/exams/live-inspection-schema.test.ts`
- `app/sentinel-api/src/modules/examination/live-inspection/live-inspection.repository.ts`
- `app/sentinel-api/src/modules/examination/live-inspection/live-inspection.repository.test.ts`
- `app/sentinel-api/src/modules/examination/live-inspection/live-inspection.dto.ts`
- `app/sentinel-api/src/modules/examination/live-inspection/live-inspection.routes.ts`
- `app/sentinel-api/src/modules/examination/live-inspection/services/stop-live-inspection.service.ts`
- `app/sentinel-api/src/modules/examination/live-inspection/services/stop-live-inspection.service.test.ts` **[NEW]**
- `app/sentinel-api/src/modules/examination/live-inspection/services/start-live-inspection.service.ts`
- `app/sentinel-api/src/modules/examination/live-inspection/services/start-live-inspection.service.test.ts`

### Shared browser clients

- `packages/services/src/api/exams/live-inspection.ts`
- `packages/services/src/api/exams/live-inspection.test.ts`
- `packages/hooks/src/live-inspection/use-student-live-inspection-publisher.ts`
- `packages/hooks/src/live-inspection/use-student-live-inspection-publisher.test.tsx`
- `packages/hooks/src/live-inspection/use-live-inspection-viewer.ts`
- `packages/hooks/src/live-inspection/use-live-inspection-viewer.test.tsx`
- `packages/ui/src/components/live-video-monitor.tsx`
- `packages/ui/src/components/live-video-monitor.test.tsx`

### Operational validation

- `docs/testing/livekit-live-inspection-runbook.md`
- `docs/testing/livekit-browser-network-matrix.md`

The existing thin wrappers in `sentinel-web` and `sentinel-core` should not require behavioral duplication. They should continue consuming the shared hook and UI component.

## Phase 1: Repair the Stop State Machine

**Goal:** Stop succeeds from every active lease state and remains safe under concurrent publisher, webhook, reconciler, and duplicate-stop updates.

- [x] Add `STOPPING` to the allowed transitions from `REQUESTED` in `LIVE_INSPECTION_TRANSITION_MAP`.
- [x] Add shared-schema tests proving `REQUESTED -> STOPPING` is allowed while terminal-to-active and other invalid transitions remain rejected.
- [x] Add a repository/service helper to re-read the current lease after a failed compare-and-set without bypassing viewer ownership checks.
- [x] Refactor `stopLiveInspection()` into a bounded convergence flow:
    1. authorize and read the viewer-owned lease;
    2. return immediately if terminal;
    3. if active and not `STOPPING`, compare-and-set its current state to `STOPPING`;
    4. on a compare-and-set conflict, re-read and retry or continue from `STOPPING`/terminal;
    5. perform idempotent provider cleanup;
    6. terminalize once and re-read if another caller already terminalized;
    7. return the latest terminal status.
- [x] Ensure provider-not-found remains a successful cleanup outcome.
- [x] Emit `ended`/`failed` lifecycle logging only when this call wins the terminal update; do not double-count duplicate stop calls.
- [x] Add `stop-live-inspection.service.test.ts` coverage for `REQUESTED`, `PUBLISHER_CONNECTING`, `PUBLISHER_READY`, `LIVE`, `STOPPING`, and all terminal states.
- [x] Add race tests where the lease changes between the initial read and compare-and-set, and where another caller terminalizes during cleanup.

**Migration required:** No. The database enum and partial unique indexes already support the required states.

## Phase 2: Add Server-Managed Restart Semantics

**Goal:** Retry creates a fresh inspection request while preserving duplicate-start and cross-viewer protections.

- [x] Extend `startLiveInspectionSchema.body` with `restart: z.boolean().optional().default(false)` and pass it through the route handler.
- [x] Extend `StartLiveInspectionPayload` in `@sentinel/services` and serialize the optional flag.
- [x] Move same-attempt active-lease resolution before capacity rejection so an idempotent same-viewer start at capacity can still return its current lease.
- [x] Preserve current behavior for `restart !== true`: return the same viewer's active lease or return `409` when another viewer owns it.
- [x] For `restart === true` and a same-viewer active lease, invoke the hardened stop/cleanup flow, then acquire a new lease and create a new LiveKit room.
- [x] Re-check global and institution capacity after the old lease is terminal, immediately before acquisition.
- [x] If concurrent restarts race on the partial unique indexes, re-read the active lease and return it when it belongs to the same viewer/attempt; otherwise return the existing safe `409`.
- [x] Ensure a failed new-room creation terminalizes only the new lease and does not resurrect the old lease.
- [x] Add service tests for normal idempotent start, same-viewer restart, restart from each active state, cross-viewer conflict, restart at capacity, provider cleanup failure, provider room-creation failure, and concurrent restart convergence.
- [x] Add route/DTO and service-client contract tests confirming `restart` defaults to false and no credentials appear in the response.

**Migration required:** No. Replaced leases can use the existing `VIEWER_STOPPED` terminal reason; the new lease receives its own ID, version, room, and Realtime insert event.

## Phase 3: Harden Student Directive Reconciliation and Camera Readiness

**Goal:** The student reliably discovers a request and publishes the existing MediaPipe camera track without immediately failing during normal initialization lag.

- [x] Replace the 10-second overlapping interval with a 3-second non-overlapping reconciliation schedule that starts the next timer only after the current directive request settles.
- [x] Keep immediate reconciliation on mount, private Realtime broadcast, `visibilitychange`, and `online`.
- [x] Preserve `requestSequenceRef` cancellation so a terminal/replacement directive invalidates an older in-flight token or publication attempt.
- [x] Add a bounded camera-track wait helper that retries `getLiveVideoTrack()` for up to 8 seconds and aborts on unmount, lease replacement, terminal state, or disabled publisher.
- [x] Acknowledge `NO_LIVE_CAMERA_TRACK` only after the grace window expires; do not call `getUserMedia()` or stop/replace the original MediaPipe track.
- [x] Listen for LiveKit room disconnection/runtime-loss events and reconcile immediately; retain periodic recovery as a fallback.
- [x] Classify directive and publisher API failures into bounded local diagnostic categories. Log only endpoint phase, HTTP category/status, and bounded code.
- [x] Continue swallowing stale/terminal acknowledgement conflicts after recording the bounded diagnostic; never retry with an old token or revision.
- [x] Add tests for missed Realtime delivery, background throttling, foreground recovery, online recovery, delayed camera availability, permanent missing track, replacement while waiting for a track, disconnected room recovery, 403/404 diagnostics, and cleanup of only the cloned track.

**Migration required:** No.

## Phase 4: Align Viewer Timeout, Retry, Cleanup, and UI Feedback

**Goal:** The instructor gets enough time for a legitimate student response, a fresh lease on Retry, and a useful bounded failure message.

- [x] Replace the hardcoded 15-second publisher-ready timeout with a named 30-second constant.
- [x] Expose elapsed waiting time or a bounded progress message from `useLiveInspectionViewer()` so the UI can show that the request is still active.
- [x] Continue polling through delayed `REQUESTED` and `PUBLISHER_CONNECTING` states; connect only after `PUBLISHER_READY`.
- [x] When the 30-second deadline expires, transition locally to `failed/TIMEOUT` and send a best-effort stop so the timed-out lease does not consume capacity until the reconciler expires it.
- [x] Update `retry()` to call start with `restart: true`, reset the deadline, and poll only the returned replacement lease.
- [x] Prevent stale poll callbacks from the old lease from changing the replacement lease's UI state.
- [x] Map terminal `lastErrorCode` values to the new bounded viewer reasons before falling back to `STUDENT_UNAVAILABLE`.
- [x] Update `LiveVideoMonitor` labels for timeout, camera-not-ready, publisher-connect, publisher-publish, and runtime-loss outcomes. Keep provider identifiers and raw error messages hidden.
- [x] Add hook tests proving success after 15 seconds but before 30 seconds, timeout cleanup at 30 seconds, fresh-lease retry, stale-poll cancellation, terminal failure mapping, and no token persistence.
- [x] Add UI tests for the new reason labels, waiting feedback, Retry callback, and accessibility announcements.

**Migration required:** No.

## Phase 5: Integration and Operational Validation

**Goal:** Verify the entire signal-to-media path with isolated identities and confirm the fix does not rely on weakening authentication.

- [x] Update `docs/testing/livekit-live-inspection-runbook.md` with an explicit warning that two tabs in the same browser profile are invalid for student/instructor testing.
- [x] Add exact same-device setups: Chrome normal + Chrome Incognito, two Chrome profiles, and Chrome + Firefox/Edge.
- [x] Record expected API and LiveKit evidence for each stage:
    - start returns a new `REQUESTED` lease;
    - student directive returns that lease/revision;
    - publisher connection changes it to `PUBLISHER_CONNECTING`;
    - publisher-ready changes it to `PUBLISHER_READY`;
    - LiveKit shows one publisher, then two participants after the viewer joins;
    - Stop ends the lease and removes the room without a `409`.
- [x] Verify Retry after a deliberately dropped Realtime event returns a different lease ID and the student discovers it through either Realtime or the 3-second fallback.
- [x] Verify delayed MediaPipe readiness within 8 seconds succeeds and a permanently missing track produces the camera-not-ready instructor message.
- [x] Verify normal stop, duplicate stop, stop during `REQUESTED`, stop during publisher connection, timeout cleanup, route unmount, and provider-room-not-found cleanup.
- [x] Run the browser/network matrix with the student tab foregrounded and backgrounded; record time to directive, publisher-ready, first frame, and cleanup.
- [x] Confirm no auth token, LiveKit token, room name, SDP/ICE data, video frame, face landmark, email, or student number appears in browser/server diagnostics.

**Migration required:** No.

## Automated Verification Commands

Run focused tests while implementing each phase, then the full affected workspaces:

```bash
pnpm --dir packages/shared test
pnpm --dir app/sentinel-api test
pnpm --dir packages/services test
pnpm --dir packages/hooks test
pnpm --dir packages/ui test
pnpm --dir app/sentinel-web test
pnpm --dir app/sentinel-core test
pnpm --dir packages/shared build
pnpm --dir packages/services build
pnpm --dir packages/hooks build
pnpm --dir packages/ui build
pnpm --dir app/sentinel-api build
pnpm --dir app/sentinel-web build
pnpm --dir app/sentinel-core build
```

## Done Criteria

- [x] Student and instructor testing in isolated browser contexts reaches one publisher and two total LiveKit participants.
- [x] Stop from `REQUESTED` returns `200` with a terminal state.
- [x] Duplicate and racing Stop calls return the latest terminal state rather than `409`.
- [x] Normal duplicate Start remains idempotent.
- [x] Explicit Retry creates or converges on a fresh lease and emits a fresh student directive.
- [x] Another viewer's active lease cannot be replaced.
- [x] A student can recover from a missed Realtime event within the fallback polling budget.
- [x] Viewer wait time is long enough for background-tab recovery, and a timed-out lease is cleaned up.
- [x] Temporary camera-track unavailability does not fail immediately; permanent unavailability is surfaced with a bounded reason.
- [x] Student MediaPipe capture continues uninterrupted; only the cloned LiveKit track is published and stopped.
- [x] No authentication, RLS, tenant, camera-only, no-audio, or token non-persistence guarantee is weakened.
- [x] All affected tests and builds pass.

## Risks and Rollback

- **Race risk:** Restart spans database and provider operations rather than a single transaction. Mitigate with idempotent cleanup, partial unique indexes, post-conflict re-reads, and convergence tests.
- **Polling load:** Moving from 10 seconds to 3 seconds increases directive traffic while an attempt page is mounted. Keep requests non-overlapping, measure request volume, and fall back to 5 seconds if capacity testing shows material pressure.
- **Late publisher:** A publisher may become ready at the timeout boundary. The server-owned Stop/Restart flow remains authoritative; sequence guards must prevent the stale publication from winning.
- **Diagnostic privacy:** Never log raw errors wholesale when they may contain request or provider details. Emit only bounded phase/status/code fields.
- **Rollback:** Revert the client timing/restart UI changes first, then the additive `restart` request field and backend orchestration. Keep the Stop state-machine correction because it fixes a standalone deterministic `409`. The global live-inspection feature flag and institution allowlist remain the operational kill switches.
