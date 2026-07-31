# LiveKit Work Package 04: Student Publisher and Signaling

## 1. The Context

The student attempt already owns a camera stream used by MediaPipe, while LiveKit must stay disconnected until an authoritative lease targets that attempt. Student integration must react quickly to private signals, recover from missed events, publish no audio, and disconnect without stopping or replacing the original MediaPipe camera track.

## 2. The Triad

### Option A: The Pragmatic Path (Speed & Simplicity)

- **Approach:** Poll the API every two seconds and call `setCameraEnabled(true)` when requested.
- **Tradeoff:** Adds constant API load and may acquire a second camera source or let LiveKit cleanup interrupt MediaPipe.

### Option B: The Strategic Path (Robustness & Scalability)

- **Approach:** Use private Broadcast as a wake-up hint, slow authoritative reconciliation, a shared publisher controller, and an isolated clone of the existing camera track.
- **Tradeoff:** Requires careful stale-event, track ownership, and reconnect testing.

### Option C: The Pivot Path (Creative & Out-of-the-Box)

- **Approach:** Keep the student joined publish-muted throughout the exam and unmute on demand.
- **Tradeoff:** Still consumes participant minutes and violates the zero-idle-connection objective.

## 3. The Execution

**Recommendation:** Option B — the Strategic Path.

**Justification:** A private hint gives low latency without becoming authorization, while the API reconciliation path guarantees recovery. Cloning the existing track isolates LiveKit lifecycle actions from MediaPipe and avoids a second permission/capture request.

### Entry Gate

- [x] Confirm work-package-03 staff/student API, webhook, reconciler, and client tests pass and are committed.
- [x] Confirm the feature remains disabled outside local test accounts.

## Pre-Planning Checklist

- [x] Inspected `StudentExamMediaPipeProvider`, `useMediapipeCameraRuntime()`, `useStudentExamAttempt()`, the attempt route/view, Supabase clients, and existing Realtime cleanup patterns.
- [x] Identified the shared publisher hook/utilities plus student bridge, provider accessor, privacy/checkup copy, and co-located tests.
- [x] Confirmed this browser integration requires no Prisma migration.

## Scope and Affected Files

- `packages/hooks/src/live-inspection/use-student-live-inspection-publisher.ts` **[NEW]**
- `packages/hooks/src/live-inspection/use-student-live-inspection-publisher.test.tsx` **[NEW]**
- `packages/hooks/src/live-inspection/live-inspection-room.utils.ts` **[NEW]**
- `packages/hooks/src/live-inspection/live-inspection-room.utils.test.ts` **[NEW]**
- `packages/hooks/src/index.ts`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/_components/student-live-inspection-bridge.tsx` **[NEW]**
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/_components/student-live-inspection-bridge.test.tsx` **[NEW]**
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/_components/student-exam-mediapipe-provider.tsx`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/index.ts`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/page.tsx`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/privacy/page.tsx`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/privacy/page.test.tsx`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/checkup/page.tsx`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/checkup/page.test.tsx`

## Phase 1: Expose a Stable, Non-Transferable Camera Source

**Goal:** Let the publisher consume the existing camera track without owning the original stream.

- [x] Extend `StudentExamMediaPipeContextValue` in `student-exam-mediapipe-provider.tsx` with a documented `getLiveVideoTrack()` accessor that returns the current live original video track or `null` without exposing a mutable stream setter.
- [x] Preserve current `stopStream()` ownership and ensure the provider remains the only component allowed to stop the original track.
- [x] Add provider tests proving the accessor returns the current live track, returns `null` after `ended`, and does not call `getUserMedia()`.
- [x] Add `cloneCameraTrackForLiveInspection()` and `stopClonedInspectionTrack()` in `live-inspection-room.utils.ts`, with tests proving only the clone is stopped during cleanup.

**Migration required:** No — browser media ownership only.

## Phase 2: Implement Private Wake-Up and Authoritative Reconciliation

**Goal:** React to the targeted attempt quickly while rejecting forged, stale, reordered, or missed signals.

- [x] Implement `useStudentLiveInspectionPublisher()` with inputs for authenticated Supabase client, `sessionId`, `enabled`, camera-track accessor, and bounded callbacks; add JSDoc to the export.
- [x] Subscribe to `exam-attempt:<attemptId>:live-inspection` with `{ config: { private: true } }`, receive only `LIVE_INSPECTION_CHANGED`, and call the authoritative active-directive API rather than acting on signal state alone.
- [x] Resolve the canonical `attemptId` from the initialized session response/API contract; never form a topic from a route student ID.
- [x] Add a `10s` reconciliation interval only while the active attempt page is mounted; pause it when the document is hidden if no non-terminal lease exists, and run immediate reconciliation on visibility/reconnect.
- [x] Track current `leaseId` and `revision` in refs so late requests and older broadcasts cannot revive a terminal/replaced lease.
- [x] Remove the Supabase channel, clear timers, abort fetches, and disconnect any LiveKit room on unmount or terminal attempt state.
- [x] Add hook tests for private-channel configuration, authoritative refetch, missed-event recovery, stale revision rejection, reconnect, hidden-page behavior, and complete cleanup.

**Migration required:** No — uses the work-package-02 RLS policy/trigger.

## Phase 3: Publish Camera Only and Preserve MediaPipe

**Goal:** Connect and publish only after server authorization, then cleanly detach without disturbing local analysis.

- [x] On an eligible directive, fetch publisher credentials imperatively, create a `Room` with `dynacast:true`, `stopLocalTrackOnUnpublish:false`, and no audio capture, then connect with `autoSubscribe:false`.
- [x] Clone the existing video track and publish it with source `Camera`; never call `setMicrophoneEnabled`, `enableCameraAndMicrophone`, `createLocalTracks`, or `getUserMedia` in this path.
- [x] Send publisher-ready only after LiveKit confirms the camera publication; send one bounded publisher-failure code on absent/ended track, connect failure, publish failure, or permission/runtime loss.
- [x] On stop/expiry/attempt submission/lock/close/supersede/track end, unpublish and stop only the cloned track, disconnect the room, and preserve the original provider stream.
- [x] Treat LiveKit reconnect events as transient within the server lease deadline; do not independently extend the lease or mint a new token from the browser.
- [x] Add hook tests with mocked LiveKit classes proving exact room/connect/publish options, no audio calls, ready timing, failure mapping, token non-persistence, reconnect behavior, clone-only cleanup, and original-track continuity.

**Migration required:** No — LiveKit client behavior only.

## Phase 4: Mount a Focused Attempt Bridge and Student Indicator

**Goal:** Integrate publication at the attempt boundary without mixing provider logic into question rendering.

- [x] Return `examSessionId`, canonical `attemptId`, effective `cameraRequired`, and a terminal/redirecting eligibility flag from `useStudentExamAttempt()` without exposing token state.
- [x] Create `student-live-inspection-bridge.tsx` to compose the shared publisher hook with `useStudentExamMediaPipeStream()` and render a persistent, accessible **Camera being viewed live by an authorized proctor** indicator only while the lease is actually `LIVE`.
- [x] Render the bridge beside `AttemptView` in `attempt/page.tsx` after initialization and only for an eligible, unblocked active session.
- [x] Update privacy/checkup disclosure copy to state that authorized live camera inspection may occur during an active camera-required exam; keep microphone and recording explicitly excluded.
- [x] Add bridge/page/privacy/checkup tests for eligibility, visible-live timing, no false indicator during request/connect, submission cleanup, blocked state, camera-optional exams, and copy.

**Migration required:** No — student UI integration only.

## Exit Gate

- [x] Tests prove no second `getUserMedia()` call and no microphone publication.
- [x] Starting/stopping/reconnecting LiveKit never stops or replaces the original MediaPipe track.
- [x] Private signals alone cannot trigger publication; every action is confirmed by Sentinel API.
- [x] Stale events/responses cannot revive an ended lease.
- [x] Student disclosure and live indicator tests pass.
- [x] Commit this package before beginning work package 05.

## Compatibility, Configuration, and Rollback Notes

- **Breaking API changes:** None; adds student-only behavior behind the feature gate.
- **Database migration:** No.
- **Environment variables:** No client LiveKit secret or public LiveKit variable; URL/token arrive only from authenticated API responses.
- **Rollback:** Disable the feature, remove the bridge/shared publisher hook, and retain MediaPipe/provider behavior unchanged.
