# Patch MediaPipe Incident Evidence Capture

**Status:** Investigated and implemented; follow-up validation remains  
**Date:** 2026-07-28  
**Type:** Corrective follow-up to the MediaPipe incident-evidence feature  
**Affected workspaces:** `app/sentinel-web`, `app/sentinel-api`, `packages/services`, and tests  
**Related design:** `docs/capstone/mediapipe-incident-evidence.md`  
**Related implementation plan:** `docs/task/2026-07-28/patch-002-implementation-plan-mediapipe-evidence-severity-gating.md`

## Request summary

Automatically retain a student camera frame for the three reviewable MediaPipe events:

- `GAZE_OFF_SCREEN`
- `NO_FACE_DETECTED`
- `MULTIPLE_FACES`

Evidence must be associated with the occurrence that makes the incident authoritative at
`MEDIUM` or `HIGH` severity. A `LOW` incident must continue through telemetry but must not create a
stored evidence image. Capture or upload failure must not block the exam or suppress telemetry.

## Investigation outcome

The original problem statement is stale: automatic frame capture and evidence storage are already
implemented. The remaining defect is **severity gating**.

The current student runtime captures and starts uploading a frame for every client-accepted
MediaPipe dispatch. It does this before the API has persisted the telemetry event and calculated its
authoritative incident severity. Consequently, the first accepted occurrence normally creates
evidence even though the resulting incident is `LOW`.

This is not a missing click handler or a missing canvas-capture implementation. The patch must
change when an already-captured frame becomes eligible for upload.

## Implementation follow-up

The severity-gating patch has now been implemented. The student runtime captures the exact frame,
submits a dedicated evidence-candidate telemetry request, and uploads only when the API returns an
authoritative `UPLOAD` decision. The standalone evidence-upload initialization route was removed in
favor of the combined candidate contract, and evidence rows now persist the authoritative
`incident_id` directly.

Focused validation completed on 2026-07-28:

- targeted `packages/services` telemetry helper tests passed;
- targeted `sentinel-web` MediaPipe upload/client tests passed;
- targeted `sentinel-api` evidence controller and DTO tests passed.

The DB-backed evidence service suite and broader workspace validation still need a follow-up pass in
an environment with working database connectivity.

## Confirmed current implementation

### Student runtime

1. `useMediaPipeFrameProcessor()` analyzes the existing student camera stream.
2. It applies the configured rule, persistence duration, confidence threshold, and client cooldown.
3. When `dispatch.shouldEmit && telemetrySignal` is true, it calls
   `useIncidentTelemetryDispatcher()`.
4. The dispatcher creates one `eventId`, `dedupeKey`, and `clientActionAt`.
5. It immediately captures the exact frame with `captureIncidentEvidenceFrame(videoElement)`.
6. It sends the combined candidate request through `emitMediaPipeEvidenceCandidate(...)`.
7. It uploads the retained blob with `startIncidentEvidenceUpload(...)` only when the API returns
   `evidenceDecision: 'UPLOAD'`.
8. It falls back to `emitMediaPipeTelemetryEvent(...)` only when capture fails, the pending limit is
   reached, the candidate decision is suppressed or times out, or the candidate request fails before
   telemetry persistence.

The student runtime now holds at most three pending encoded frames in memory, bounds each decision
to ten seconds, aborts pending candidate work during cleanup, and keeps evidence failure
non-fatal to the exam attempt.

Relevant files:

- `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-attempt-mediapipe-monitoring/_hooks/use-mediapipe-frame-processor.ts`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-attempt-mediapipe-monitoring/_hooks/use-incident-telemetry-dispatcher.ts`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-attempt-mediapipe-monitoring/_hooks/use-incident-evidence-upload.ts`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-attempt-mediapipe-monitoring/_utils/capture-incident-evidence-frame.ts`

### Evidence API and storage

The repository already has:

- a `telemetry_incident_evidence` table and lifecycle states;
- a private Supabase bucket contract;
- signed direct-upload initialization and completion routes;
- `(attempt_id, event_id)` idempotency;
- evidence-to-incident correlation;
- incident-scoped signed viewing URLs;
- authorized deletion and automatic reconciliation/retention;
- instructor evidence galleries and student privacy disclosure;
- a feature flag and institution allowlist, both failing closed.

The authoritative evidence gate now lives on the candidate-ingestion path rather than the old
standalone upload-initialization route. The API persists the MediaPipe telemetry occurrence first,
uses the resulting `AppendEventResult.finalSeverity` as the only authority, creates or refreshes an
evidence row only for eligible `MEDIUM` or `HIGH` occurrences, and directly stores the resolved
`incident_id` on new evidence rows. Duplicate retries may resume an existing pending upload target
for the same `(attempt_id, event_id)` but must never retroactively create evidence for a
historically low occurrence.

Relevant files:

- `app/sentinel-api/src/modules/telemetry/evidence/services/evidence-authorization.service.ts`
- `app/sentinel-api/src/modules/telemetry/evidence/services/evidence-upload.service.ts`
- `app/sentinel-api/src/modules/telemetry/evidence/services/evidence-correlation.service.ts`
- `app/sentinel-api/src/modules/telemetry/evidence/services/evidence-reconciliation.service.ts`
- `packages/db/prisma/migrations/20260727140000_add_telemetry_incident_evidence/migration.sql`

### Authoritative severity calculation

Severity is assigned only in the API persistence layer by
`IncidentSeverityResolverService`. All four calibrated AI rules, including the three MediaPipe
rules, use the same default ten-minute occurrence ladder:

| Occurrences in the effective window | Severity |
| ----------------------------------- | -------- |
| 1–2                                 | `LOW`    |
| 3–5                                 | `MEDIUM` |
| 6 or more                           | `HIGH`   |

Runtime telemetry settings can change the repeat threshold and can force a severity override. The
resolver counts prior matching incident occurrences and the current event, then
`appendIncidentRecord()` either inserts a new incident or aggregates into the current incident.
Therefore the student browser cannot safely reproduce this decision from its local MediaPipe
tracker.

Relevant files:

- `app/sentinel-api/src/modules/telemetry/storage/services/incident-severity-resolver.service.ts`
- `app/sentinel-api/src/modules/telemetry/storage/services/incident-writer.service.ts`
- `app/sentinel-api/src/modules/telemetry/storage/services/incident-persistence.service.ts`

## Root cause

There are two different acceptance boundaries:

1. **Client dispatch acceptance** means a MediaPipe signal crossed its local
   duration/confidence/cooldown requirements.
2. **Server severity acceptance** means the persisted occurrence was resolved as `MEDIUM` or
   `HIGH` after server-side history and runtime overrides were applied.

The implementation treats boundary 1 as permission to store evidence, while the requested behavior
requires boundary 2.

`POST /telemetry/events` cannot currently close this gap. It returns `202` with only the ingestion
mode and optional queue job ID. In Redis mode, persistence occurs later in a worker. Even in sync
mode, the existing `AppendEventResult` containing `incidentId` and `finalSeverity` is discarded
before the response is built.

There is a second-order race: evidence can be uploaded even when telemetry is later ignored,
dropped, or fails. Reconciliation eventually deletes unlinked evidence, but that still creates the
database row and storage object the severity gate is intended to avoid.

## Required behavior

| Server outcome for the dispatched event | Telemetry | Evidence object |
| --------------------------------------- | --------- | --------------- |
| Ignored by telemetry policy             | Continue  | Do not upload   |
| Persisted as `LOW`                      | Continue  | Do not upload   |
| Persisted as `MEDIUM`                   | Continue  | Upload one frame |
| Persisted as `HIGH`                     | Continue  | Upload one frame |
| Duplicate retry                         | Idempotent | Do not create a second object |
| Severity decision unavailable/timeout   | Continue  | Drop the local frame |
| Capture, encoding, or upload failure    | Continue  | Record bounded diagnostics only |

When an existing incident escalates, the evidence must represent the **current dispatch that
caused that escalation**, not the first low-severity occurrence and not a later arbitrary camera
frame.

## Planning constraint: the exact frame exists only on the student device

Waiting for a server decision before capturing would lose the triggering frame. The camera and
MediaPipe continue advancing while telemetry is queued or persisted.

The safe ordering is:

1. Create the stable `eventId`.
2. Copy and encode the current video frame into a bounded in-memory `Blob`.
3. Emit telemetry without waiting in the animation loop.
4. Obtain the authoritative persistence outcome for that same `eventId`.
5. Upload the retained blob only for `MEDIUM` or `HIGH`.
6. Release the blob for `LOW`, ignored, failed, duplicate-without-eligible-severity, or timed-out
   outcomes.

This temporarily retains image bytes in browser memory but does not create a database row or bucket
object for low-severity events. The implementation plan must define a short timeout, a small
in-memory limit, cleanup on unmount/attempt termination, and fail-closed behavior.

## Recommended planning direction

Use the server's existing `AppendEventResult` as the sole authority and add an evidence-eligibility
decision contract keyed by the stable `eventId`.

The implementation plan should compare these delivery options:

### Option A — synchronous decision for evidence-eligible MediaPipe events

Persist the three bounded MediaPipe event types inline, return `incidentId`, `disposition`, and
`finalSeverity`, and let the browser upload the already-captured blob only when eligible.

- Strongest and simplest correlation.
- Reuses the existing severity result without duplicating severity logic.
- Changes the fast-path behavior for these events and must remain non-blocking from the exam UI.
- Must define how deployments configured for Redis ingestion handle this special path.

### Option B — asynchronous decision/status contract

Keep Redis ingestion, expose a bounded status lookup or targeted server signal by `eventId`, and
hold the blob locally until the worker publishes the decision.

- Preserves queue isolation.
- Adds polling/signaling, expiry, authorization, and completed-decision retention.
- Must not depend only on the incident row's mutable `lastEvent`, because a later aggregation can
  overwrite it.

### Option C — upload every accepted dispatch and delete `LOW` afterward

- Requires the least change to the browser flow.
- Still writes low-severity rows and objects, increases privacy/storage exposure, and only cleans up
  after the fact.
- Does not satisfy the stated goal of avoiding unnecessary database and bucket load.

**Recommendation:** plan around Option A unless Redis-only latency or throughput evidence makes it
unacceptable. Use Option B when asynchronous ingestion must remain mandatory. Do not implement
client-side severity prediction or Option C as the final severity gate.

## Important implementation decisions for the later plan

- Define whether a forced `MEDIUM`/`HIGH` runtime override is eligible. The recommended answer is
  yes because it is part of the authoritative final severity.
- Define duplicate behavior using the stored incident severity and the same `eventId`; retries must
  never create another evidence row or object.
- Keep telemetry emission independent from evidence. An evidence timeout or denial must not retry
  or suppress the telemetry occurrence.
- Preserve the existing `(attempt_id, event_id)` uniqueness and telemetry `dedupeKey`.
- Enforce the severity gate on the API, not only in React. A modified client must not be able to
  initialize evidence for a `LOW` or unknown event.
- Do not add severity supplied by the browser to the upload request as an authority.
- Do not acquire a second camera stream, capture a later frame, include screen/answer content, or
  draw MediaPipe landmarks onto the image.
- Retain existing feature-flag, institution-allowlist, quota, MIME, size, lifecycle, signed-URL,
  authorization, audit, deletion, and retention controls.
- Decide whether evidence rows should count only `PENDING_UPLOAD`/`AVAILABLE` objects toward quota;
  the current service counts every lifecycle state.
- Preserve out-of-order recovery for eligible events even if the normal ordering changes from
  evidence-first to telemetry-first.

## Suggested acceptance criteria

- The first and second default occurrences persist as `LOW` without calling evidence upload
  initialization.
- The third occurrence persists/escalates to `MEDIUM` and uploads exactly the frame captured for
  that third dispatch.
- Occurrences four and five remain `MEDIUM`; the plan must explicitly decide whether each gets one
  image or only severity transitions do. The request currently reads as each accepted
  `MEDIUM`/`HIGH` occurrence.
- The sixth occurrence escalates to `HIGH` and uploads its own frame.
- A runtime severity override to `HIGH` allows evidence on the first occurrence.
- An ignored event, disabled rule, ineligible attempt, low result, timeout, and worker failure
  produce no evidence row or storage object.
- Redis and sync ingestion modes have deterministic, tested behavior.
- Telemetry still emits when capture, decision delivery, initialization, storage upload, or
  completion fails.
- Repeated delivery of one `eventId` produces at most one evidence row and object.
- Aggregated incidents retain multiple eligible evidence frames in chronological order.
- Attempt teardown releases pending blobs and prevents late uploads.
- API tests prove a client cannot initialize evidence for a low, missing, mismatched, or
  unauthorized event.

## Test seams already present

Existing tests cover frame encoding, upload initialization/completion, evidence correlation,
storage validation, evidence API authorization, severity resolution, incident persistence,
monitoring galleries, and privacy copy. The patch should extend rather than replace these suites.

Investigation validation completed on 2026-07-28:

- `sentinel-web`: 3 focused test files passed, 22 tests.
- `sentinel-api`: 3 focused test files passed, 21 tests.

## Out of scope

- Manual instructor-requested snapshots.
- Continuous recording or LiveKit recording.
- Audio evidence.
- New MediaPipe event types.
- Changing the calibrated severity ladder itself.
- Replacing the private storage, signed-view, deletion, or seven-day retention model.
