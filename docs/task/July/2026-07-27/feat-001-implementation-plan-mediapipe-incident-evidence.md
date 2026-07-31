# MediaPipe Incident Evidence — Implementation Plan

**Status:** Planned  
**Date:** 2026-07-27  
**Type:** Feature  
**Source:** `docs/capstone/mediapipe-incident-evidence.md`  
**Affected workspaces:** `app/sentinel-web`, `app/sentinel-api`, `packages/shared`,
`packages/services`, `packages/hooks`, and `packages/db`  
**Rules:** `.agents/rules/implementation-plan.md`,
`.agents/rules/global/1-3-1-rule.md`, `.agents/workflows/to-do-workflow.md`  
**Migration required:** **Yes** — a one-to-many evidence entity, lifecycle enums, foreign keys,
uniqueness constraint, and cleanup indexes are required; `flagged_incidents.evidence_url` cannot
represent asynchronous correlation, multiple images, or deletion/expiry state.

## Pre-Planning Checklist

- [x] Read and summarize the request in one sentence.
- [x] Inspect the MediaPipe attempt runtime, telemetry payload schemas and client, ingestion
      controller and worker, incident aggregation/persistence, incident query scoping, Supabase
      storage helper patterns, audit logging, cron configuration, monitoring contracts and UI, and
      student privacy disclosure.
- [x] Identify the files, services, external storage resources, environment variables, and database
      tables the feature will touch.
- [x] Determine whether a Prisma migration is needed: **Yes**, because durable evidence identity
      and lifecycle state require a dedicated relation.
- [x] Confirm the working tree is clean before writing this plan.

## Task Summary

Capture one bounded camera image on the student device for each accepted MediaPipe dispatch, upload
it independently of telemetry, correlate it to the inserted or aggregated incident by a stable
event UUID, and provide authorized instructors with short-lived viewing and irreversible deletion
while automatically expiring stored images after seven days.

## 1. The Context

The current student runtime owns the only camera frame available at detection time, but telemetry is
accepted asynchronously and several dispatches may aggregate into one `flagged_incidents` row.
Consequently, the existing nullable `evidence_url` cannot safely identify, correlate, authorize,
retain, or delete one or more private evidence objects.

The implementation must never block the exam or suppress telemetry, must reuse the existing camera
stream and incident authorization scope, and must avoid permanent/public URLs, image bytes in JSON,
or unbounded capture. Privacy approval, private storage, idempotent state transitions, and a precise
retention rule are release gates rather than optional follow-up work.

## 3. The Triad

### Option A: The Pragmatic Path (Speed & Simplicity)

- **Approach:** Proxy each captured image through a multipart API route and store the resulting
  object path in a new evidence row before telemetry is emitted.
- **Tradeoff:** This is simpler for the browser but routes every binary through the Hono process,
  increasing API memory, bandwidth, timeout exposure, and scaling cost during large exams.

### Option B: The Strategic Path (Robustness & Scalability)

- **Approach:** Add a first-class evidence lifecycle and use an API-authorized, short-lived
  Supabase signed upload target; correlate evidence and telemetry with the same client-generated
  `eventId`, then expose signed view URLs only through incident-scoped routes.
- **Tradeoff:** The initialize/upload/complete flow and reconciliation job add state-machine and
  operational complexity that must be tested against out-of-order completion and retries.

### Option C: The Pivot Path (Creative & Out-of-the-Box)

- **Approach:** Capture evidence from the instructor's active LiveKit inspection stream and attach
  it to incidents after the fact.
- **Tradeoff:** Evidence would exist only while a viewer is connected, would not represent the
  accepted historical MediaPipe frame reliably, and would couple automated evidence to an optional
  live-inspection session.

## 1. The Execution

**The Recommendation:** Choose **Option B: The Strategic Path**.

**The Justification:** Direct private uploads preserve the existing API as a control plane rather
than a binary relay, while a dedicated evidence row gives retries, aggregation, deletion, expiry,
and audit behavior durable identities. This fits the repository's Supabase service-role and signed
URL patterns, reuses existing telemetry correlation and query-scoping boundaries, and introduces no
new runtime dependency.

**Next Steps:**

1. Add the evidence schema, configuration, storage service, and authorized API contracts with
   idempotent lifecycle tests.
2. Capture and upload one bounded frame in the accepted MediaPipe dispatch branch while emitting
   telemetry with the same stable event identity regardless of evidence failure.
3. Correlate evidence during incident persistence, render the authorized evidence gallery, and
   deploy cleanup, privacy, observability, and staged rollout controls.

## Confirmed Repository Baseline

- `useMediapipeCameraRuntime()` owns the attempt `<video>`, the existing stream, analysis timing,
  threshold/cooldown state, and the `dispatch.shouldEmit && telemetrySignal` branch.
- `buildAttemptMediaPipeTelemetryPayload()` does not currently accept or populate `eventId`,
  `dedupeKey`, or `clientActionAt`, although
  `packages/shared/src/schema/telemetry/telemetry-schema.ts` already permits those metadata fields.
- `POST /telemetry/events` authenticates `studentId`, returns `202`, and can enqueue or buffer an
  event before an incident exists.
- `appendIncidentRecord()` returns the selected `incidentId` for both inserts and aggregations, and
  it already logs `metadata.eventId`; this is the correct transaction boundary for correlation.
- `flagged_incidents` has only `evidence_url`; monitoring maps it to both `snapshotUrl` and
  `evidenceUrl`.
- `FlaggingTimeline` renders placeholder content when `snapshotUrl` exists, and
  `StudentDetailHeader` exposes an inactive **Capture Frame** button.
- Incident read/review routes enforce `incidents:view` and `incidents:review`, with role-aware
  institution, department, course, assignment, ownership, share, and proctor scoping in
  `buildIncidentScopingPredicate()`.
- `getSupabaseAdmin()` and `PdfStorageService` establish the repository pattern for private storage
  operations and short-lived signed view URLs.
- `audit_logs` and `createLogData()` can record evidence view/deletion actions without storing
  signed URLs or image content.
- `app/sentinel-api/vercel.json` already schedules an authenticated telemetry maintenance endpoint,
  so evidence cleanup can follow the same deployment boundary.
- The student privacy screen mentions live viewing and no recording, but does not disclose retained
  flagged camera frames.

## Fixed Product and Technical Decisions

- Capture only `GAZE_OFF_SCREEN`, `NO_FACE_DETECTED`, and `MULTIPLE_FACES` after
  `dispatch.shouldEmit` is true and the corresponding exam rule is enabled.
- Use `crypto.randomUUID()` once per accepted dispatch. The same UUID is the evidence `eventId`,
  telemetry `metadata.eventId`, and the unique idempotency component in `metadata.dedupeKey`.
- Capture the current frame synchronously into a canvas before starting network work; do not wait
  for upload initialization before scheduling the next animation frame.
- Encode WebP first with JPEG fallback, preserve aspect ratio, and enforce server-configured
  dimensions and byte limits on both client and API boundaries.
- Do not acquire, clone, or publish a second camera stream and do not draw landmarks, answers, or
  screen content onto evidence.
- Use the dedicated private bucket `sentinel-proctoring-evidence`; the API creates every bucket/path
  value and clients cannot list or read the bucket directly.
- Use signed direct upload rather than API-proxied multipart upload.
- Model one evidence row per accepted dispatch and preserve all evidence rows when incidents
  aggregate.
- Use `AVAILABLE`, `PENDING_UPLOAD`, `DELETE_PENDING`, `DELETED`, `FAILED`, and `EXPIRED` lifecycle
  states. Storage coordinates remain non-null until object deletion converges, then are cleared.
- Use the recommended attempt retention rule:
  `max(exam.end_date_time, attempt.completed_at, attempt.started_at, captured_at) + 7 days`, ignoring
  unavailable values. Policy/privacy owners must approve this exact rule before production enablement.
- Reuse `incidents:review` for deletion in the first release. Adding a new
  `incidents:delete_evidence` permission is deferred to a separately approved RBAC change to avoid
  silently altering every role template.
- Replace the inactive **Capture Frame** control with **View Evidence** only when the selected
  student has evidence; manual instructor-requested capture is out of scope.
- Keep `flagged_incidents.evidence_url` readable during compatibility rollout, but stop writing it
  for new captures and remove it only in a later migration after all consumers are evidence-aware.
- Gate capture with `TELEMETRY_EVIDENCE_ENABLED=false` by default and an explicit
  `TELEMETRY_EVIDENCE_INSTITUTION_ALLOWLIST`; the enabled MediaPipe exam rule provides the per-exam
  gate.
- Evidence failure is non-fatal: telemetry emission, the exam attempt, and the next MediaPipe frame
  continue even when encoding, initialization, upload, completion, or correlation fails.

## Data Model and Migration Contract

### New enum: `telemetry_incident_evidence_state`

- `PENDING_UPLOAD`
- `AVAILABLE`
- `DELETE_PENDING`
- `DELETED`
- `FAILED`
- `EXPIRED`

### New enum: `telemetry_incident_evidence_deletion_reason`

- `INSTRUCTOR_REVIEW`
- `RETENTION_EXPIRED`
- `ATTEMPT_DELETED`
- `STALE_PENDING_UPLOAD`
- `TELEMETRY_UNLINKED`
- `OBJECT_MISSING`

### New table: `telemetry_incident_evidence`

| Column                      | Contract                                                           |
| --------------------------- | ------------------------------------------------------------------ |
| `evidence_id`               | UUID primary key generated by Postgres                             |
| `attempt_id`                | Required FK to `exam_attempts`, `ON DELETE CASCADE`                |
| `incident_id`               | Nullable FK to `flagged_incidents`, `ON DELETE SET NULL`           |
| `institution_id`            | Required FK to `institutions`, tenant scope                        |
| `student_id`                | Required FK to `students`, upload ownership context                |
| `event_id`                  | Required client UUID; unique with `attempt_id`                     |
| `event_type`                | Required `telemetry_event_type`, limited by API to MediaPipe types |
| `captured_at`               | Validated client timestamp                                         |
| `received_at`               | Server timestamp, default `now()`                                  |
| `storage_bucket`            | Nullable only after terminal deletion convergence                  |
| `storage_path`              | Nullable only after terminal deletion convergence                  |
| `mime_type`                 | Allow-listed `image/webp` or `image/jpeg`                          |
| `declared_size_bytes`       | Client-declared initialization size                                |
| `size_bytes`                | Nullable until completion verifies object metadata                 |
| `sha256`                    | Nullable integrity field; deferred computation is allowed          |
| `state`                     | Evidence state, default `PENDING_UPLOAD`                           |
| `expires_at`                | Server-calculated retention deadline                               |
| `reviewed_at`               | Nullable reviewer timestamp                                        |
| `deleted_at`                | Nullable storage-deletion timestamp                                |
| `deleted_by`                | Nullable FK to `auth.users`, null for automated cleanup            |
| `deletion_reason`           | Nullable deletion-reason enum                                      |
| `failure_code`              | Nullable bounded operational code; never raw provider tokens/URLs  |
| `created_at` / `updated_at` | Server timestamps                                                  |

Required constraints and indexes:

- unique `(attempt_id, event_id)`;
- index `(incident_id, state, captured_at)`;
- index `(state, expires_at)`;
- index `(institution_id, created_at)`;
- index `(attempt_id, event_type, created_at)` for quotas;
- positive declared/verified size checks;
- terminal-state checks requiring `deleted_at` and `deletion_reason` for `DELETED`/`EXPIRED`;
- RLS enabled with no direct authenticated table policy; all metadata access remains API-mediated.

### Migration rollback

Before rollback, disable `TELEMETRY_EVIDENCE_ENABLED`, stop the cleanup schedule, wait for in-flight
uploads to settle, and run the deletion service over every non-terminal row until no private object
remains. Only then drop evidence foreign keys/table/enums and remove the bucket; never roll back the
database first because cascade/drop would orphan sensitive storage objects.

## Files and Services in Scope

### Database and generated types

- `packages/db/prisma/schema.prisma`
- `packages/db/prisma/migrations/[timestamp]_add_telemetry_incident_evidence/migration.sql` **[NEW]**
- `packages/db/src/generated/types.ts` **[GENERATED]**

Tables touched:

- `telemetry_incident_evidence` **[NEW]**
- `flagged_incidents` (new back relation and incident correlation)
- `exam_attempts`, `students`, `institutions`, and `auth.users` (new back relations/FKs)
- `audit_logs` (view/deletion audit entries)

### Shared and service contracts

- `packages/shared/src/schema/telemetry/telemetry-schema.ts`
- `packages/shared/src/schema/exams/monitoring-schema.ts`
- `packages/shared/src/types/proctor/exams/[id]/monitoring/index.ts`
- `packages/services/src/api/telemetry.ts`
- `packages/services/src/api/telemetry.test.ts` **[NEW if no co-located suite exists]**
- `packages/services/src/api/exams/types.ts`
- `packages/services/src/api/exams/mappers.ts`
- `packages/services/src/api/exams/mappers.test.ts`
- `packages/hooks/src/query/exams/use-exam-monitoring-student-query.ts`
- `packages/hooks/src/query/exams/use-exam-monitoring-student-query.test.ts`
- `packages/hooks/src/query/telemetry/use-incident-evidence-query.ts` **[NEW]**
- `packages/hooks/src/query/telemetry/use-incident-evidence-query.test.ts` **[NEW]**
- `packages/hooks/src/query/telemetry/use-delete-incident-evidence-mutation.ts` **[NEW]**
- `packages/hooks/src/query/telemetry/use-delete-incident-evidence-mutation.test.ts` **[NEW]**

### API evidence module and configuration

- `app/sentinel-api/.env.example`
- `app/sentinel-api/vercel.json`
- `app/sentinel-api/src/modules/telemetry/telemetry.routes.ts`
- `app/sentinel-api/src/modules/telemetry/evidence/evidence.constants.ts` **[NEW]**
- `app/sentinel-api/src/modules/telemetry/evidence/evidence.dto.ts` **[NEW]**
- `app/sentinel-api/src/modules/telemetry/evidence/evidence.routes.ts` **[NEW]**
- `app/sentinel-api/src/modules/telemetry/evidence/evidence.service.ts` **[NEW]**
- `app/sentinel-api/src/modules/telemetry/evidence/services/evidence-authorization.service.ts` **[NEW]**
- `app/sentinel-api/src/modules/telemetry/evidence/services/evidence-storage.service.ts` **[NEW]**
- `app/sentinel-api/src/modules/telemetry/evidence/services/evidence-upload.service.ts` **[NEW]**
- `app/sentinel-api/src/modules/telemetry/evidence/services/evidence-query.service.ts` **[NEW]**
- `app/sentinel-api/src/modules/telemetry/evidence/services/evidence-deletion.service.ts` **[NEW]**
- `app/sentinel-api/src/modules/telemetry/evidence/services/evidence-correlation.service.ts` **[NEW]**
- `app/sentinel-api/src/modules/telemetry/evidence/services/evidence-reconciliation.service.ts` **[NEW]**
- `app/sentinel-api/src/modules/telemetry/evidence/controllers/initialize-evidence-upload.controller.ts` **[NEW]**
- `app/sentinel-api/src/modules/telemetry/evidence/controllers/complete-evidence-upload.controller.ts` **[NEW]**
- `app/sentinel-api/src/modules/telemetry/evidence/controllers/get-incident-evidence.controller.ts` **[NEW]**
- `app/sentinel-api/src/modules/telemetry/evidence/controllers/delete-evidence.controller.ts` **[NEW]**
- `app/sentinel-api/src/modules/telemetry/evidence/controllers/reconcile-evidence.controller.ts` **[NEW]**
- Co-located `*.test.ts` files for every evidence controller and service above **[NEW]**

### Telemetry persistence correlation

- `app/sentinel-api/src/modules/telemetry/storage/services/incident-persistence.service.ts`
- `app/sentinel-api/src/modules/telemetry/storage/services/incident-persistence.service.test.ts`
- `app/sentinel-api/src/modules/telemetry/storage/services/incident-writer.service.ts`
- `app/sentinel-api/src/modules/telemetry/ingestion/services/telemetry-job-processor.service.ts`
- `app/sentinel-api/src/modules/telemetry/ingestion/services/telemetry-job-processor.service.test.ts`

### Student capture and upload

- `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-attempt-mediapipe-monitoring/_hooks/use-mediapipe-camera-runtime.ts`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-attempt-mediapipe-monitoring/_hooks/use-mediapipe-camera-runtime.test.tsx` **[NEW]**
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-attempt-mediapipe-monitoring/_utils/capture-incident-evidence-frame.ts` **[NEW]**
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-attempt-mediapipe-monitoring/_utils/capture-incident-evidence-frame.test.ts` **[NEW]**
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-attempt-mediapipe-monitoring/_hooks/use-incident-evidence-upload.ts` **[NEW]**
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-attempt-mediapipe-monitoring/_hooks/use-incident-evidence-upload.test.tsx` **[NEW]**
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/_lib/web-telemetry-client/_types/index.ts`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/_lib/web-telemetry-client/_utils/payloads.ts`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/_lib/web-telemetry-client.test.ts`

### Instructor monitoring and privacy

- `app/sentinel-api/src/modules/examination/monitoring/services/get-exam-monitoring-student-detail.ts`
- `app/sentinel-api/src/modules/examination/monitoring/services/get-exam-monitoring-student-detail.test.ts`
- `app/sentinel-api/src/modules/examination/monitoring/services/map-monitoring-response.ts`
- `app/sentinel-api/src/modules/examination/monitoring/services/map-monitoring-response.test.ts`
- `app/sentinel-api/src/modules/examination/exams/services/delete-exam.service.ts`
- `app/sentinel-api/src/modules/examination/exams/services/delete-exam.service.test.ts`
- `app/sentinel-web/src/features/exams/monitoring/_components/student-detail-header.tsx`
- `app/sentinel-web/src/features/exams/monitoring/_components/student-detail-header.test.tsx` **[NEW]**
- `app/sentinel-web/src/features/exams/monitoring/_components/flagging-timeline.tsx`
- `app/sentinel-web/src/features/exams/monitoring/_components/flagging-timeline.test.tsx`
- `app/sentinel-web/src/features/exams/monitoring/_components/incident-evidence-gallery.tsx` **[NEW]**
- `app/sentinel-web/src/features/exams/monitoring/_components/incident-evidence-gallery.test.tsx` **[NEW]**
- `app/sentinel-web/src/features/exams/monitoring/_components/incident-evidence-dialog.tsx` **[NEW]**
- `app/sentinel-web/src/features/exams/monitoring/_components/incident-evidence-dialog.test.tsx` **[NEW]**
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/privacy/page.tsx`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/privacy/page.test.tsx`

### Operations

- `docs/operations/mediapipe-incident-evidence-runbook.md` **[NEW]**
- Supabase project storage configuration for the private
  `sentinel-proctoring-evidence` bucket **[EXTERNAL RESOURCE]**

## API Contract

### `POST /telemetry/evidence/uploads`

- Student-authenticated initialization.
- Body: `attemptId`, `eventId`, MediaPipe `eventType`, `capturedAt`, `mimeType`, and `sizeBytes`.
- Response: `evidenceId`, signed `uploadUrl`, provider `uploadToken`, and evidence `expiresAt`.
- Idempotent on `(attempt_id, event_id)`; a matching pending row returns the same evidence identity
  and a refreshed upload target, while incompatible metadata returns `409`.

### `POST /telemetry/evidence/{evidenceId}/complete`

- Student-authenticated completion for the attempt owner.
- Verifies exact server-created object existence, MIME type, and size before transitioning to
  `AVAILABLE`.
- Idempotently returns the current available record; mismatch transitions to `FAILED` and schedules
  object deletion.

### `GET /telemetry/incidents/{incidentId}/evidence`

- Requires `incidents:view` plus the existing incident query scope.
- Returns ordered metadata and signed URLs only for `AVAILABLE` rows; terminal and pending rows
  return status metadata without storage coordinates.
- Signed view TTL defaults to five minutes and URLs are never stored or logged.

### `DELETE /telemetry/evidence/{evidenceId}`

- Requires `incidents:review` plus the same incident/tenant scope.
- Moves `AVAILABLE` to `DELETE_PENDING`, deletes the object, then records `DELETED`,
  `INSTRUCTOR_REVIEW`, actor, and timestamp and clears storage coordinates.
- Returns success only after deletion convergence; provider not-found is treated as converged.

### `POST /telemetry/internal/evidence/reconcile`

- Requires the configured cron bearer secret.
- Claims bounded stale/expired batches, invokes the shared deletion service, reconciles missing and
  unlinked rows, and returns counts by terminal disposition without exposing object paths.

## Phase 1: Establish Schema, Configuration, and Private Storage

**Goal:** Create the durable evidence lifecycle and safe server-owned storage boundary.

- [x] In `packages/db/prisma/schema.prisma`, add the two evidence enums, the
      `telemetry_incident_evidence` model, all declared relations, constraints, and indexes; add
      back-relations to `flagged_incidents`, `exam_attempts`, `students`, `institutions`, and
      `auth.users`.
- [x] Create
      `packages/db/prisma/migrations/[timestamp]_add_telemetry_incident_evidence/migration.sql`;
      include enum/table/index/FK/check creation, RLS enablement, and grants only to the service role.
- [x] Regenerate `packages/db/src/generated/types.ts` through the repository's Prisma generation
      command; do not hand-edit the generated file.
- [x] In `app/sentinel-api/.env.example`, document
      `TELEMETRY_EVIDENCE_ENABLED=false`,
      `TELEMETRY_EVIDENCE_INSTITUTION_ALLOWLIST=`,
      `TELEMETRY_EVIDENCE_BUCKET=sentinel-proctoring-evidence`,
      `TELEMETRY_EVIDENCE_RETENTION_DAYS=7`,
      `TELEMETRY_EVIDENCE_MAX_DIMENSION=1280`,
      `TELEMETRY_EVIDENCE_MAX_BYTES=524288`,
      `TELEMETRY_EVIDENCE_MAX_PER_EVENT_TYPE=10`,
      `TELEMETRY_EVIDENCE_MAX_PER_ATTEMPT=30`,
      `TELEMETRY_EVIDENCE_UPLOAD_TTL_SECONDS=120`, and
      `TELEMETRY_EVIDENCE_VIEW_TTL_SECONDS=300`.
- [x] In `evidence.constants.ts`, export documented, bounded parsers for the environment values;
      fail closed when disabled, the institution is absent from the allowlist, or a numeric value
      is invalid.
- [x] In Supabase, create `sentinel-proctoring-evidence` as private with only WebP/JPEG MIME types
      and the configured object limit; record the repeatable setup and verification steps in the
      runbook.
- [x] In `evidence-storage.service.ts`, export documented methods to create a signed upload target,
      inspect one exact object, create a signed view URL, and delete one exact object; require
      server-supplied bucket/path arguments and map provider errors to bounded internal codes.
- [x] Add schema/migration verification and `evidence.constants.test.ts` /
      `evidence-storage.service.test.ts` coverage for defaults, invalid configuration, private path
      generation, signed TTLs, exact-object inspection, not-found deletion, and redacted errors.

**Migration required:** **Yes** — this phase introduces the evidence table and enums. Use the
rollback procedure above; no existing data is rewritten.

## Phase 2: Add Authorized, Idempotent Evidence APIs

**Goal:** Let an eligible student upload exactly one server-scoped object per event and let scoped
reviewers list/delete it without exposing durable storage coordinates.

- [x] In `evidence.dto.ts`, define strict Zod/OpenAPI schemas for all four public evidence routes
      and the internal reconciliation response; use shared MediaPipe event enums, UUIDs, datetime
      validation, MIME allowlists, and configured byte ceilings.
- [x] In `evidence-authorization.service.ts`, export documented functions that join
      `exam_attempts -> students -> exams`, verify `students.user_id` equals the authenticated user,
      verify active/eligible attempt lifecycle, resolve institution/exam, check the corresponding AI
      rule, and apply environment/allowlist gating.
- [x] In `evidence-upload.service.ts`, implement initialization as a transaction-safe upsert keyed
      by `(attempt_id, event_id)`; calculate the retention deadline, enforce clock skew/rate/quota
      limits, create the opaque path
      `{institutionId}/{examId}/{attemptId}/{eventId}.{ext}`, and return a short-lived signed target.
- [x] In `evidence-upload.service.ts`, implement completion by re-authorizing ownership, inspecting
      the exact object, comparing MIME and size to the declaration/server limits, and moving
      `PENDING_UPLOAD -> AVAILABLE`; incompatible or oversized objects must move to `FAILED` and be
      deleted through the shared deletion service.
- [x] In `evidence-query.service.ts`, resolve an incident through the existing scoped incident
      query before selecting chronological evidence; generate signed view URLs only for
      `AVAILABLE` rows and write a bounded `incident_evidence.view` audit log containing IDs/state,
      not URL/path/image data.
- [x] In `evidence-deletion.service.ts`, implement idempotent
      `AVAILABLE -> DELETE_PENDING -> DELETED` transitions, provider not-found convergence,
      storage-coordinate clearing, and `incident_evidence.delete` audit logging; retain
      `DELETE_PENDING` when provider deletion fails.
- [x] In the new controllers, call only the evidence facade/service methods, pass authenticated
      actor and scope context, and use `requireActivePermission(c, 'incidents:view')` or
      `requireActivePermission(c, 'incidents:review')` for instructor actions.
- [x] Mount `evidence.routes.ts` from `telemetry.routes.ts`; keep student upload routes behind
      `authMiddleware` and keep internal reconciliation independent of user-role middleware but
      protected by the cron bearer secret.
- [x] In `packages/services/src/api/telemetry.ts`, add typed initialize, complete, list, and delete
      functions; ensure upload tokens/URLs are returned only to the direct caller and never placed
      in query keys or logs.
- [x] Add co-located controller/service tests covering another student's attempt, inactive and
      completed attempts, disabled rules, disallowed institutions, clock skew, MIME/size mismatch,
      quota/rate limit, idempotent initialize/complete/delete, cross-tenant view/delete denial,
      assignment/course/department scope, signed URL TTL, audit redaction, object-not-found
      convergence, and storage deletion failure.

**Migration required:** No — this phase uses the Phase 1 evidence schema.

## Phase 3: Capture and Upload One Accepted MediaPipe Frame

**Goal:** Attach a stable event identity and one bounded image to an accepted MediaPipe dispatch
without slowing or weakening telemetry.

- [x] In `packages/services/src/api/telemetry.ts`, extend the exported `TelemetryMetadata` type with
      the already-supported `eventId`, `dedupeKey`, and `clientActionAt` fields so browser code does
      not cast around the shared contract.
- [x] In the MediaPipe telemetry `_types/index.ts` and `_utils/payloads.ts`, accept
      `eventId`, `dedupeKey`, and `clientActionAt` and forward them into the shared MediaPipe
      payload metadata without changing browser/mobile event behavior.
- [x] In `capture-incident-evidence-frame.ts`, export a documented function that validates
      `readyState`, `videoWidth`, and `videoHeight`, scales to the configured maximum dimension,
      draws the current `<video>` to an in-memory canvas, attempts WebP then JPEG `toBlob()`,
      rejects null/empty/oversized blobs, and releases canvas references.
- [x] In `use-incident-evidence-upload.ts`, export a documented fire-and-forget upload operation
      that initializes, uploads the blob to the returned provider-signed target, completes the
      evidence row, bounds retries to initialization/upload-safe cases, and emits only bounded
      diagnostics; do not require the browser to construct or select a bucket/path.
- [x] In `use-mediapipe-camera-runtime.ts`, generate `eventId`, `dedupeKey`, and `clientActionAt`
      inside `dispatch.shouldEmit && telemetrySignal`; immediately capture the current video frame,
      then start evidence upload and telemetry emission independently with the same identifiers.
- [x] In the same runtime, preserve the current toast/incident behavior, schedule the next
      animation frame without awaiting encoding/network completion, prevent duplicate in-flight
      work for the same `eventId`, and clear the in-flight registry on completion/unmount.
- [x] Ensure evidence initialization is skipped when capture is disabled, the attempt becomes
      ineligible, the rule is disabled, quota denial is cached for the bounded server-provided
      period, or the camera has no usable current frame; telemetry must still emit.
- [x] Add utility/hook/runtime tests proving exact scaling and aspect ratio, WebP/JPEG fallback,
      null/oversized rejection, one capture per accepted dispatch, no capture before duration
      threshold, no capture during cooldown/suspension/disabled rules, all three MediaPipe signals,
      stable correlation identifiers, no second `getUserMedia()`, no animation-loop blocking, retry
      bounds, teardown safety, and telemetry success when every evidence stage fails.

**Implementation note (2026-07-27):** The current client caches quota/deny-style evidence
initialization failures for 60 seconds because the API does not yet return a server-supplied
backoff TTL. Telemetry emission remains non-fatal and continues even when evidence capture or
upload fails.

**Migration required:** No — this phase changes client contracts and runtime behavior only.

## Phase 4: Correlate Out-of-Order Evidence With Inserted or Aggregated Incidents

**Goal:** Link every accepted evidence row to the exact incident selected by telemetry persistence,
regardless of whether upload or incident processing finishes first.

- [x] In `evidence-correlation.service.ts`, export a documented idempotent
      `linkEvidenceToIncident(db, { attemptId, eventId, incidentId })` that updates only the matching
      unlinked row and refuses a conflicting existing incident link.
- [x] In `incident-persistence.service.ts`, invoke evidence correlation inside the same database
      transaction after `appendIncidentRecord()` returns an inserted or aggregated result and
      before transaction commit; use `payload.metadata.eventId` and do nothing for legacy events
      without it.
- [x] In `incident-writer.service.ts`, change duplicate-dedupe handling to return the existing
      `incidentId` as a distinct duplicate result (without incrementing occurrence count) so a
      retried telemetry event can converge an already-created evidence link.
- [x] Update `AppendEventResult` and `processQueuedTelemetryEvent()` to preserve the existing
      `duplicate-ignored` external disposition while still making the existing incident identity
      available for internal correlation.
- [x] In `evidence-reconciliation.service.ts`, claim bounded rows that are `AVAILABLE` but unlinked,
      find the incident whose structured details contain the same event ID or whose dedupe key
      matches the event, link it when unambiguous, and mark/purge rows after the configured unlink
      timeout when telemetry was rejected or lost.
- [x] Add persistence tests for evidence-first, telemetry-first, upload-completion-first,
      aggregated incidents with multiple chronological evidence rows, duplicate telemetry delivery,
      conflicting correlation, missing event IDs, rejected telemetry, concurrent initialization,
      and retry after a transaction/provider failure.

**Implementation note (2026-07-27):** The code path for phase 4 is implemented, including
transaction-time linking, duplicate retry convergence, and bounded reconciliation of unlinked
`AVAILABLE` evidence rows. The non-DB worker contract tests passed locally, but the new DB-backed
correlation tests could not be executed on July 27, 2026 because the configured test database host
`aws-1-ap-northeast-1.pooler.supabase.com` was unreachable from this environment.

**Migration required:** No — required correlation keys and indexes are created in Phase 1.

## Phase 5: Expose Evidence in Instructor Monitoring

**Goal:** Replace snapshot placeholders with an accessible, state-aware gallery while preserving
legacy incident compatibility.

- [x] In the shared monitoring schema/types and service API types, add
      `evidenceCount` plus bounded evidence summary states; do not place signed URLs in the polling
      student-detail response.
- [x] In `get-exam-monitoring-student-detail.ts` and `map-monitoring-response.ts`, include evidence
      counts/states for each selected-attempt incident while retaining the legacy `evidenceUrl`
      fallback until migration cleanup.
- [x] In `use-incident-evidence-query.ts`, fetch signed evidence only when a reviewer expands an
      incident; use an incident-scoped query key, a stale time shorter than the signed URL TTL, and
      disable retries for authorization/not-found responses.
- [x] In `use-delete-incident-evidence-mutation.ts`, call the delete route and invalidate both the
      incident evidence key and selected student monitoring key after confirmed deletion.
- [x] In `incident-evidence-gallery.tsx`, render chronological thumbnails, capture time, event type,
      “N of M”, and explicit pending/unavailable/expired/deleted states; describe images as review
      context rather than proof of misconduct.
- [x] In `incident-evidence-dialog.tsx`, render the full image in an accessible dialog with
      keyboard-close/focus behavior, error/expired fallback text, and a reviewer-only destructive
      confirmation before deletion.
- [x] In `flagging-timeline.tsx`, replace both duplicated placeholder snapshot blocks with the
      shared gallery component; keep the legacy URL as a single read-only fallback during rollout.
- [x] In `student-detail-header.tsx`, replace **Capture Frame** with **View Evidence** only when an
      evidence-bearing incident can be focused; otherwise omit the control. Do not add remote/manual
      capture signaling.
- [x] Add mapper, query, mutation, gallery, dialog, timeline, and header tests for lazy signed URL
      loading, multiple evidence images, all lifecycle states, legacy fallback, permission-hidden
      deletion, confirmation/cancel, deletion refresh, expired URL refetch, image load failure,
      keyboard/focus accessibility, and non-accusatory copy.

Implemented with aggregated evidence state/count summaries on monitoring incidents, lazy reviewer
fetching for signed URLs, evidence deletion invalidation, a shared instructor evidence gallery and
dialog, legacy `evidenceUrl` fallback, and focused API/hooks/UI tests for the new monitoring flow.

**Migration required:** No — this phase consumes Phase 1 evidence records.

## Phase 6: Retention, Reconciliation, Privacy, and Operations

**Goal:** Automatically remove expired or unusable objects, disclose the feature accurately, and
roll it out with measurable safety gates.

- [x] In `evidence-reconciliation.service.ts`, claim small batches of expired `AVAILABLE`, stale
      `PENDING_UPLOAD`, failed, missing-object, and unlinked rows using transaction-safe locking;
      call the shared deletion service and treat provider not-found as successful convergence.
- [x] Before deleting an apparently expired row, recompute the effective retention deadline from
      the current exam end and attempt completion/start timestamps; extend `expires_at` instead of
      deleting when attempt completion now produces a later deadline.
- [x] In `delete-exam.service.ts`, enumerate and delete all evidence objects through
      `evidence-deletion.service.ts` before the database delete can cascade evidence rows; block
      permanent exam deletion on evidence cleanup failure so sensitive orphan objects do not lose
      their retry metadata, and record `ATTEMPT_DELETED` on converged rows.
- [x] In `reconcile-evidence.controller.ts`, require
      `TELEMETRY_CRON_SECRET || CRON_SECRET`, log aggregate success/failure metrics through
      `SystemLogsService`, and never return/log paths, signed URLs, tokens, hashes, image bytes, or
      landmarks.
- [x] In `app/sentinel-api/vercel.json`, add a daily
      `/telemetry/internal/evidence/reconcile` schedule after confirming the deployment supports
      both telemetry maintenance calls and the cron secret.
- [x] In the student privacy page, disclose automatic capture of frames only when a configured
      camera rule produces a reviewable signal, authorized reviewer access, seven-day retention,
      immediate reviewer deletion, and the fact that this is not continuous audio/video recording.
- [x] In `docs/operations/mediapipe-incident-evidence-runbook.md`, document bucket creation,
      configuration names, enable/disable sequence, quota tuning, retention calculation, cleanup
      interpretation, stuck-state recovery, orphan inspection, deletion verification, rollback,
      and incident response without exposing sensitive paths.
- [x] Add operational metrics for encode duration, image size, initialization/upload/completion
      outcome, evidence per attempt/type, correlation latency, unlinked rows, stale pending rows,
      delete failures, expiry backlog, storage usage, and signed-view failures.
- [x] Define alerts for repeatedly stuck `DELETE_PENDING`, expiry backlog age, upload failure
      spikes, unlinked evidence growth, and storage limit/cost thresholds.
- [x] Add reconciliation/controller/privacy tests for retention-boundary calculation, shortened
      non-production expiry, bounded batching, concurrent cleanup, stale upload deletion, orphan and
      missing-object convergence, retryable provider failure, cron rejection, log redaction, and
      conditional disclosure copy; add exam-deletion coverage proving evidence objects are removed
      before row cascade and a provider failure prevents orphaning.
- [ ] Obtain documented institution privacy/policy approval for capture purpose, authorized roles,
      the recommended attempt-based retention rule, immediate deletion, student access/deletion
      requests, and rollout institutions before enabling production capture.
- [ ] Roll out with the global flag off, create/verify the private bucket, migrate the database,
      deploy API/web code, run cleanup in report-only staging mode, enable one test institution,
      validate one evidence event end to end, then expand only after device, storage, false-positive,
      and deletion metrics meet agreed thresholds.

**Migration required:** No — cleanup and rollout operate on the Phase 1 schema.

Implemented with shared retention-date recomputation, automated stale/expired/delete-pending
convergence, pre-cascade exam evidence cleanup, cron-secret enforcement plus aggregate system logs,
a daily Vercel reconcile schedule, updated student privacy disclosure copy, and an operational
evidence runbook. DB-backed reconciliation coverage was extended, but execution still depends on the
external Supabase test host being reachable.

## Breaking Changes, Dependencies, and Environment

- **Public API:** Additive evidence endpoints and additive monitoring response fields; no existing
  route is removed.
- **Database:** Additive migration. The legacy `flagged_incidents.evidence_url` remains during
  compatibility rollout.
- **Permissions:** No permission ID changes in the first release; deletion reuses
  `incidents:review`.
- **Dependencies:** No new npm package is required; use browser canvas APIs and the installed
  Supabase client.
- **New environment variables:** All `TELEMETRY_EVIDENCE_*` variables listed in Phase 1. Existing
  `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and cron secret remain server-only.
- **External resource:** A dedicated private Supabase Storage bucket is required and must be created
  before enabling capture.
- **Behavioral change:** Privacy copy changes before evidence is enabled; the inactive manual
  capture button is removed/replaced rather than made functional.

## Verification Commands

```bash
pnpm --dir packages/db prisma validate
pnpm --dir packages/db prisma generate
pnpm --dir packages/shared test
pnpm --dir packages/services test
pnpm --dir packages/hooks test
pnpm --dir app/sentinel-api test
pnpm --dir app/sentinel-api typecheck
pnpm --dir app/sentinel-web test
pnpm --dir app/sentinel-web lint
pnpm --dir app/sentinel-web build
pnpm format:check
```

Run the DB-backed evidence persistence/correlation suite against an isolated test database. Perform
browser validation in Chrome, Edge, Firefox, and Safari where MediaPipe is supported, including
foreground/background throttling, low bandwidth, temporary offline recovery, low-end encoding
impact, and simultaneous MediaPipe/LiveKit camera continuity.

## Done Criteria

- [ ] Every accepted MediaPipe dispatch creates at most one evidence row/object and uses the same
      event UUID in telemetry.
- [ ] Evidence failure never blocks, delays, or suppresses telemetry or the exam attempt.
- [ ] Evidence arriving before or after telemetry links to the inserted or aggregated incident.
- [ ] Aggregated incidents preserve a chronological one-to-many evidence gallery.
- [ ] Students cannot initialize/complete evidence for another attempt, inactive attempt, disabled
      rule, disallowed institution, or exceeded quota.
- [ ] Reviewers cannot list/delete evidence outside existing incident scope or without the required
      permission.
- [ ] Only private durable object coordinates are stored; signed URLs are short-lived, on-demand,
      and absent from database/audit/application logs.
- [ ] Instructor deletion and automatic expiry remove the object, clear storage coordinates, and
      retain bounded audit metadata.
- [ ] Cleanup is idempotent and converges missing, stale, failed, unlinked, and partially deleted
      states without unbounded batches.
- [ ] Monitoring renders real images and explicit unavailable/deleted/expired states accessibly and
      never labels a frame as proof of cheating.
- [ ] Privacy/policy approval, private bucket verification, load measurements, operational alerts,
      and the staged rollback procedure are complete before production enablement.
