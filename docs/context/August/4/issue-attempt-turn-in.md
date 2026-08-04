# Attempt Closure, Monitoring Progress, Turn-In, and Camera Evidence Context

**Date:** 2026-08-04  
**Status:** Investigation complete; ready for implementation planning  
**Affected workspaces:** `app/sentinel-web`, `app/sentinel-api`, `packages/hooks`, `packages/db`  
**Production attempt in supplied evidence:** `17d9e522-3d37-4dc5-a006-9008062baa2a`

## Purpose

Prepare an evidence-backed context for a later implementation plan covering four production
failures observed in the same exam attempt:

1. An attempt is automatically marked `CLOSED`, but the student remains on the attempt page and can
   continue interacting with the exam.
2. Instructor monitoring remains at `0%` although the student has answered questions.
3. Turn-in fails with `prisma-extension-kysely does not support transactions`.
4. MediaPipe captures do not reach the private Supabase evidence bucket.

This document records current behavior, confirmed causes, affected boundaries, planning
constraints, and validation requirements. It does not implement the fixes.

## Production evidence and correlated timeline

The supplied screenshots and logs describe one internally consistent failure sequence. Log times
are UTC; the screenshots use Asia/Manila time (`UTC+08:00`).

| Local time | Evidence                                                                                                                          | Interpretation                                                                                                      |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 11:21:48   | Monitoring timeline shows `CLOSED` for attempt `17d9e522-...`                                                                     | Automatic lifecycle policy has already made the attempt terminal.                                                   |
| 11:22:03   | Student attempt still shows question 22 of 28 and `21/28 answered`                                                                | The active student route has not learned about the lifecycle transition and has not stopped the attempt runtime.    |
| 11:22:40   | API logs `Upload target unavailable after candidate persisted` with `Evidence upload is only permitted for in-progress attempts.` | A later MediaPipe candidate was accepted after closure; upload initialization then rejected the now-closed attempt. |
| 11:22:48   | First turn-in fails with `prisma-extension-kysely does not support transactions`                                                  | Completion reached the unsupported Kysely transaction wrapper.                                                      |
| 11:23:28   | Retried turn-in fails with the same exception                                                                                     | The transaction failure is deterministic, not a transient network or scoring failure.                               |
| 11:24:03   | Monitoring overview still displays `0%` for the closed student                                                                    | Persisted `answered_question_count` did not keep up with the student's local `21/28` state.                         |

The evidence-upload error is not proof that canvas capture failed. It proves that the API persisted
the candidate and then refused to initialize the upload target because the same attempt was already
`CLOSED`.

## Executive root-cause assessment

| Area                                   | Assessment                                                                                                                                                                                                                                                                                                                                                          | Confidence                       |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| Student remains in a closed attempt    | The attempt route performs an initial exam-detail query but has no lifecycle polling, subscription, or independent heartbeat. It only learns about `CLOSED` if a progress-sync request returns `409`. The current progress-sync defect can prevent that request indefinitely.                                                                                       | High                             |
| Monitoring progress stays at `0%`      | The monitoring API correctly calculates question progress from `exam_attempts.answered_question_count` and the overview polls every two seconds. The student-side two-second debounce is reset every second because `syncProgress` changes identity whenever `elapsedSeconds` changes. The remote sync may therefore never fire while the timer is running.         | High                             |
| Turn-in throws unsupported transaction | `persistCompletedSession()` calls `dbClient.transaction().execute(...)`. The production `dbClient` is `prisma.$kysely`; its driver exposes the Kysely transaction method but deliberately throws. The repository already provides `executeTransaction()` specifically for this adapter, but completion does not use it.                                             | Confirmed                        |
| Camera evidence is not stored          | Candidate persistence runs incident side effects, including automatic attempt closure, before upload initialization. The subsequent authorization requires `lifecycle_state = IN_PROGRESS`, so the event which crosses the auto-close threshold can close its own attempt before its evidence row and signed target are created.                                    | Confirmed for the supplied event |
| Supabase bucket readiness              | Code is designed for a direct browser-to-Supabase signed upload, but the reported request failed before signed-target creation. The evidence migration creates the database table only; bucket creation and environment enablement are operational steps. The supplied logs cannot confirm bucket existence, MIME/size configuration, or deployed allowlist values. | Requires deployment verification |

## 1. Closed attempts do not terminate the active student experience

### Intended lifecycle contract

`CLOSED` is a terminal attempt lifecycle state. Existing API guards already enforce that contract:

- `sync-session.service.ts` rejects progress updates for `LOCKED`, `CLOSED`, or `SUPERSEDED`.
- `prepare-session.service.ts` rejects turn-in preparation for those states.
- `complete-session.guards.ts` rejects final completion for those states.
- `start-session.service.ts` prevents resuming a closed attempt.
- Evidence authorization permits upload only while the attempt is `IN_PROGRESS`.

The server therefore stops accepting meaningful attempt mutations. The defect is that the already
mounted student UI does not promptly observe the server transition.

### Current student flow

Relevant files:

- `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-student-exam-data.ts`
- `packages/hooks/src/query/exams/use-exam-query.ts`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-student-exam-stage-guard.ts`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/index.ts`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-session.ts`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/page.tsx`

`useStudentExamData()` uses `useExamQuery()` once at route load. Unlike the instructor monitoring
queries, `useExamQuery()` has no `refetchInterval`. The stage guard can correctly map an
authoritative `runtimeAccess.state === 'closed'` response to a blocked/redirected route, but it can
only do so when query data changes.

The only active-route lifecycle feedback is incidental:

1. A changed answer schedules `syncExamProgress()`.
2. The API returns `409` for a closed attempt.
3. `useExamSession()` invokes `onLifecycleBlocked()`.
4. `useStudentExamAttempt()` renders a local blocked state.

This is insufficient because it depends on answer sync, does not run while the student is idle, and
is currently undermined by the debounce defect described below.

### Required behavior to carry into the implementation plan

- Detect `LOCKED`, `CLOSED`, `SUPERSEDED`, and `SUBMITTED` independently of answer changes.
- Stop the timer, answer writes, progress sync, MediaPipe/audio monitoring, live-inspection
  publication, and security listeners as soon as a terminal state is accepted by the client.
- Clear or quarantine local session/turn-in state so a stale attempt cannot be reopened locally.
- Replace the attempt route with the approved terminal destination or a terminal blocked screen.
- Do not rely on `window.close()`: browsers generally cannot close a tab they did not open. Product
  behavior should mean terminating the attempt runtime and navigating away, not forcibly closing
  an arbitrary browser tab.
- Preserve the API guards as the final authority even after client termination is added.

### Planning decision

Choose the authoritative delivery mechanism:

- short-interval polling of the existing student exam detail;
- a lightweight attempt-lifecycle status endpoint;
- realtime/SSE/WebSocket lifecycle delivery with polling fallback.

The current instructor overview already polls every two seconds, so a bounded student lifecycle
poll is the smallest compatible change. The later plan should still specify focus/background
behavior, network retry, and the maximum allowed closure-to-termination latency.

## 2. Monitoring progress is starved by the student timer

### Current persistence and display path

The intended path is sound at the API/monitoring boundary:

1. `useAttemptSync()` counts answered values and schedules a sync after
   `SYNC_PROGRESS_DEBOUNCE_MS = 2000`.
2. `syncSessionService()` writes `answered_question_count`, `answer_snapshot`,
   `time_spent_minutes`, and `last_synced_at` to `exam_attempts`.
3. `getExamMonitoringOverview()` selects `answered_question_count` and obtains the authoritative
   exam question count.
4. `resolveProgress()` calculates `answered_question_count / questionCount`, capped at `99%` until
   completion.
5. `useExamMonitoringOverviewQuery()` refetches every two seconds, including in the background.

Relevant files:

- `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/use-attempt-sync.ts`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-session.ts`
- `app/sentinel-api/src/modules/examination/flow/services/sync-session.service.ts`
- `app/sentinel-api/src/modules/examination/flow/data/_mutations/attempt-mutations.ts`
- `app/sentinel-api/src/modules/examination/monitoring/services/get-exam-monitoring-overview.ts`
- `app/sentinel-api/src/modules/examination/monitoring/services/map-monitoring-response.ts`
- `packages/hooks/src/query/exams/use-exam-monitoring-overview-query.ts`

### Confirmed timing defect

`useExamSession()` increments `elapsedSeconds` every second. Its `syncProgress` callback uses
`elapsedSeconds` as a default argument and lists it as a `useCallback` dependency. The callback
therefore receives a new identity every second.

`useAttemptSync()` lists `syncProgress` as an effect dependency. Each new identity cleans up the
current timeout and schedules another two-second timeout. Since the callback changes after one
second, the two-second debounce may be postponed forever even when the selected answers are stable.

This explains all supplied observations:

- local attempt UI correctly derives `21/28 answered` from React state;
- database `answered_question_count` can remain `0`;
- monitoring repeatedly polls and correctly keeps returning `0%`;
- the student also misses the sync `409` that would reveal the automatic closure.

### Required behavior to carry into the implementation plan

- Give the remote sync callback a stable identity; pass elapsed time explicitly or read it from a
  ref rather than capturing it as a callback dependency.
- Define sync triggers separately for answer changes and heartbeat/time changes.
- Do not send an answer snapshot every second merely to update time.
- Flush the latest snapshot before turn-in navigation and on controlled lifecycle teardown where
  the platform permits it.
- Ensure a failed/aborted request cannot overwrite a newer snapshot.
- Keep monitoring progress question-based; time-based fallback should only apply when the question
  count or answered count is genuinely unavailable.

### Missing regression coverage

Current tests mock `useExamSession()` or exercise answer sync without advancing the real one-second
timer against the two-second debounce. Add a fake-timer integration test proving that:

- the exam timer can tick continuously;
- one answer change still produces a sync within the agreed bound;
- later answer changes produce updated counts;
- a `409 CLOSED` response terminates the active attempt.

## 3. Turn-in uses the unsupported Kysely transaction path

### Confirmed adapter mismatch

Relevant files:

- `packages/db/src/db.ts`
- `packages/db/src/create-db-client.ts`
- `app/sentinel-api/src/modules/examination/flow/services/complete-session/complete-session.persistence.ts`

The application constructs Prisma and attaches `prisma-extension-kysely`. The Hono context receives
`dbClient = prisma.$kysely`. That object has a `transaction()` method because it is a Kysely client,
but `prisma-extension-kysely` version 4.0.0 does not implement Kysely-native transactions. Calling
it produces the exact production exception:

```text
Error: prisma-extension-kysely does not support transactions
```

`executeInTransactionIfAvailable()` checks only whether the method exists. It therefore chooses the
unsupported branch every time in production. This differs from
`IncidentPersistenceService.executeWithTransactionFallback()`, which recognizes the exception,
and from the shared `executeTransaction()` helper, which uses Prisma `$transaction` and exposes the
transaction-scoped `$kysely` client through `AsyncLocalStorage`.

### Atomicity requirement

Completion currently intends to atomically:

1. update the attempt to `COMPLETED` / `SUBMITTED` with score and answer snapshots; and
2. append the immutable `SUBMITTED` lifecycle event.

The implementation plan should use the repository's supported Prisma-backed transaction bridge,
not silently fall back to two non-atomic writes. If transaction injection or unit-test isolation is
a concern, make that an explicit shared abstraction rather than another local adapter check.

### Missing regression coverage

Current completion tests pass a mock database object without the production adapter behavior. They
verify scoring, guards, and controller responses but do not execute the completion persistence path
against `prisma.$kysely` or a test double whose Kysely `transaction()` throws the production error.

Required tests:

- completion succeeds through the supported transaction bridge;
- attempt update and lifecycle-event insert use the same transaction-scoped client;
- lifecycle insert failure rolls back the completed attempt update;
- idempotent retry still returns the existing result for the same answer checksum;
- a closed attempt returns the lifecycle `409`, not a transaction `500`.

## 4. MediaPipe frame capture loses the auto-closing event

### Existing browser capture and direct-upload path

Relevant browser files:

- `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-attempt-mediapipe-monitoring/_hooks/use-incident-telemetry-dispatcher.ts`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-attempt-mediapipe-monitoring/_utils/capture-incident-evidence-frame.ts`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-attempt-mediapipe-monitoring/_hooks/use-incident-evidence-upload.ts`

The requested background behavior already exists as event-driven capture, not continuous
recording:

1. MediaPipe analyzes the active student camera `<video>` stream.
2. For an accepted `GAZE_OFF_SCREEN`, `NO_FACE_DETECTED`, or `MULTIPLE_FACES` dispatch, the browser
   draws the current video frame to an in-memory canvas.
3. It encodes a bounded WebP/JPEG blob.
4. It sends capture metadata with the telemetry candidate.
5. If the API returns `UPLOAD`, the browser calls Supabase `uploadToSignedUrl()` directly.
6. It calls the API completion endpoint, which verifies object metadata and changes the evidence
   row from `PENDING_UPLOAD` to `AVAILABLE`.

This is already a direct client-to-Supabase data path; image bytes do not pass through the Sentinel
API. Evidence is intentionally captured only for server-eligible `MEDIUM` or `HIGH` MediaPipe
occurrences, not every analyzed frame or every `LOW` occurrence.

### Confirmed lifecycle race

Relevant API files:

- `app/sentinel-api/src/modules/telemetry/evidence/services/evidence-candidate.service.ts`
- `app/sentinel-api/src/modules/telemetry/storage/services/incident-persistence.service.ts`
- `app/sentinel-api/src/modules/telemetry/storage/services/incident-side-effects.service.ts`
- `app/sentinel-api/src/modules/examination/lifecycle/services/close-exam-attempt.ts`
- `app/sentinel-api/src/modules/telemetry/evidence/services/evidence-authorization.service.ts`
- `app/sentinel-api/src/modules/telemetry/evidence/services/evidence-upload.service.ts`

The current order is:

1. `EvidenceCandidateService.process()` persists the candidate through telemetry ingestion.
2. `IncidentPersistenceService.appendEvent()` invokes incident side effects before returning.
3. The automatic policy sees the threshold and calls `closeExamAttempt()`.
4. Candidate processing receives an eligible `MEDIUM`/`HIGH` result and calls
   `initializeUpload()`.
5. `authorizeStudentUpload()` reloads the attempt and requires `IN_PROGRESS`.
6. The attempt is now `CLOSED`, so authorization throws
   `Evidence upload is only permitted for in-progress attempts.`
7. Candidate processing returns `UNAVAILABLE`; no evidence row, signed target, direct object
   upload, or completion step occurs.

The event that causes automatic closure is exactly the event most likely to need evidence, so this
ordering defeats the audit value of the feature.

### Security constraint for the fix

Do not broadly permit new uploads for all closed attempts. The plan must preserve these properties:

- capture belongs to the same stable `(attempt_id, event_id)` candidate accepted while the attempt
  was active;
- `incident_id`, severity, ownership, AI-rule enablement, MIME type, size, quota, and storage path
  remain server-authoritative;
- a stale page cannot create arbitrary evidence after closure;
- duplicate requests only resume a compatible `PENDING_UPLOAD` record;
- evidence failure remains non-fatal to telemetry and lifecycle closure.

Safe designs include ordering evidence authorization/row creation before automatic-close side
effects, or authorizing the exact just-persisted event from its pre-close eligibility context. The
later implementation plan should choose one transaction and side-effect boundary and document what
happens if signed-target generation fails while closure still must proceed.

### Bucket and deployment checks still required

Relevant files:

- `app/sentinel-api/src/modules/telemetry/evidence/evidence.constants.ts`
- `app/sentinel-api/src/modules/telemetry/evidence/services/evidence-storage.service.ts`
- `packages/db/prisma/migrations/20260727140000_add_telemetry_incident_evidence/migration.sql`
- `docs/operations/mediapipe-incident-evidence-runbook.md`

The database migration creates the evidence table and indexes but does not create the Supabase
bucket. The runbook requires manual creation of the private `sentinel-proctoring-evidence` bucket
(or the configured `TELEMETRY_EVIDENCE_BUCKET`) with WebP/JPEG MIME limits and the matching size
limit. Evidence also fails closed unless both `TELEMETRY_EVIDENCE_ENABLED=true` and the institution
UUID is in `TELEMETRY_EVIDENCE_INSTITUTION_ALLOWLIST`.

The later implementation/rollout checklist must verify in the deployed environment:

- API and web point at the same Supabase project;
- the private bucket exists under the configured name;
- signed upload creation works with the service-role client;
- browser upload uses the matching public Supabase URL and anon client;
- allowed MIME types and object-size limit accept the generated blob;
- feature flag and exact institution UUID allowlist are present;
- one test event reaches `telemetry_incident_evidence.state = AVAILABLE`;
- the object exists at the server-generated path and is retrievable only by a short-lived signed
  reviewer URL;
- reconciliation is scheduled for stale `PENDING_UPLOAD`, missing, failed, and expired evidence.

## Coupling between the four failures

These are not four isolated UI defects:

```text
MediaPipe event crosses policy threshold
    -> incident persists
    -> automatic policy closes attempt
       -> evidence initialization rejects CLOSED attempt
       -> student page remains active because it does not poll lifecycle
          -> later MediaPipe events continue from a stale active runtime
          -> progress sync should discover CLOSED, but its debounce is starved
             -> monitoring remains at stale 0%
             -> turn-in reaches API and then hits the unsupported transaction path
```

The implementation plan must coordinate lifecycle termination, sync scheduling, evidence ordering,
and completion persistence. Fixing only the visible monitoring percentage would still leave a
closed attempt active; fixing only the turn-in transaction would correctly expose a lifecycle
`409` but would not create a good student termination experience.

## Planning-ready workstreams

### A. Authoritative active-attempt lifecycle channel

- Add bounded active-route lifecycle refresh/delivery.
- Centralize terminal-state handling and teardown.
- Define the student destination and local-storage cleanup for each state.
- Ensure a late response cannot reactivate or overwrite a terminal state.

### B. Stable progress synchronization

- Decouple callback identity from the one-second elapsed timer.
- Define answer debounce, heartbeat, retry, and final flush behavior.
- Add ordering/idempotency protection for overlapping syncs if required.
- Keep the persisted answered count as the monitoring source of truth.

### C. Supported completion transaction

- Replace the local Kysely-native transaction wrapper with the supported shared transaction
  bridge or an equivalent injected abstraction.
- Prove rollback and idempotent retry behavior.
- Preserve lifecycle guard precedence and useful `409` responses.

### D. Evidence-before-terminal-side-effect orchestration

- Preserve authoritative severity gating.
- Create/authorize the exact candidate evidence before automatic closure invalidates generic
  in-progress authorization, or carry a narrowly scoped pre-close authorization fact.
- Keep upload asynchronous and non-blocking after the signed target/evidence row is issued.
- Add production diagnostics for capture, candidate decision, signed-target creation, upload, and
  completion without logging URLs, tokens, paths, or image content.

### E. Deployment verification

- Verify the private bucket, environment flags, institution allowlist, Supabase project alignment,
  retention cron, and reviewer signed-view flow.
- Add an end-to-end smoke check that follows one event ID from detection to `AVAILABLE` evidence.

## Acceptance criteria for the future implementation plan

### Attempt closure

- A server transition to `LOCKED`, `CLOSED`, `SUPERSEDED`, or `SUBMITTED` terminates the active
  attempt UI within the agreed latency even if the student does not answer another question.
- No further answers, progress writes, telemetry, camera/audio processing, or live-inspection
  publication starts after the client accepts the terminal state.
- Refreshing or using stale local storage cannot resume a closed attempt.
- Server guards still reject stale mutations.

### Monitoring progress

- Answering 1 of 28 questions causes monitoring to show approximately `4%` within the agreed sync
  plus polling bound.
- Answering 21 of 28 shows `75%`, matching the student's local calculation.
- Continuous timer ticks do not postpone remote sync.
- Completion shows `100%`; closed-but-unsubmitted attempts retain their last persisted question
  progress rather than being forced to `100%`.

### Turn-in

- A valid in-progress attempt completes without the Kysely transaction exception.
- Attempt completion and its `SUBMITTED` lifecycle event are atomic.
- Retrying the same prepared result is idempotent.
- A closed attempt receives a clear lifecycle conflict and is routed out of the attempt flow.

### Evidence

- The exact eligible frame that crosses the automatic-close threshold receives an evidence record
  and signed upload target without reopening or broadly authorizing the closed attempt.
- The browser uploads directly to the configured private Supabase bucket and completion changes the
  row to `AVAILABLE`.
- `LOW`, ignored, stale, mismatched, oversized, over-quota, or unauthorized candidates create no
  evidence object.
- Telemetry persistence and automatic closure still succeed if capture or storage fails.
- No signed URL, upload token, storage path, image bytes, or face landmarks appear in logs.

## Required automated validation

- `sentinel-web`: fake-timer integration for one-second timer versus two-second answer sync.
- `sentinel-web`: active attempt reacts to authoritative `CLOSED` without another answer change.
- `sentinel-web`: terminal teardown stops MediaPipe, audio, live inspection, and security listeners.
- `sentinel-api`: completion persistence against the supported Prisma/Kysely transaction bridge,
  including rollback.
- `sentinel-api`: evidence candidate which triggers automatic close still obtains one narrowly
  authorized upload target.
- `sentinel-api`: stale post-close candidate remains denied.
- `sentinel-api`: monitoring mapping reflects persisted answered counts for active, flagged,
  closed, and submitted attempts.
- end-to-end: student answers update monitoring, policy closes the attempt, student is terminated,
  triggering evidence becomes `AVAILABLE`, and stale turn-in cannot mutate the closed attempt.

## Observability needed during rollout

Correlate by `attemptId`, `eventId`, and `incidentId` while avoiding sensitive storage data:

- lifecycle transition time and client-observed time;
- progress sync scheduled/sent/accepted/rejected with answered count;
- monitoring source counts and question count;
- completion transaction outcome and lifecycle conflict code;
- evidence capture outcome, server decision, initialization outcome, upload outcome, and completion
  state;
- count and age of `PENDING_UPLOAD`, `FAILED`, and `AVAILABLE` evidence rows.

## Out of scope for this context

- Continuous webcam recording or periodic background snapshots unrelated to an accepted MediaPipe
  incident.
- Weakening evidence privacy, retention, private-bucket, or severity-gating requirements.
- Allowing a closed attempt to be submitted as if it were still active.
- Forcibly closing arbitrary browser tabs.
- Redesigning the instructor monitoring UI beyond making its data timely and authoritative.

## Recommended implementation order

1. Fix and test the shared completion transaction boundary.
2. Stabilize answer sync and add an independent active-attempt lifecycle channel.
3. Centralize client terminal teardown and navigation.
4. Reorder/narrow evidence authorization around automatic closure.
5. Verify Supabase bucket and deployment configuration end to end.
6. Run the coupled production-like scenario with correlation diagnostics enabled.

This order restores safe persistence first, then makes lifecycle state observable to the student,
then repairs the evidence race without relaxing authorization.
