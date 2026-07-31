# MediaPipe Evidence Severity Gating Implementation Plan

**Status:** Implemented; broader validation follow-up still pending  
**Date:** 2026-07-28  
**Type:** Patch  
**Source:** `docs/context/July/July 28/patch-capture-frame.md`  
**Affected workspaces:** `app/sentinel-api`, `app/sentinel-web`, and `packages/services`  
**Rules:** `.agents/rules/implementation-plan.md`,
`.agents/rules/global/1-3-1-rule.md`, `.agents/workflows/to-do-workflow.md`  
**Migration required:** **No** — the existing `telemetry_incident_evidence.incident_id`,
`event_id`, lifecycle, uniqueness, and storage columns can represent a severity-authorized upload;
the patch changes orchestration and API contracts rather than persistence shape.

## Pre-Planning Checklist

- [x] Read and summarize the source context in one sentence.
- [x] Inspect the MediaPipe frame processor and dispatcher, telemetry client and API helpers,
      ingestion policy and queue, incident persistence and severity resolver, evidence
      authorization/upload/correlation services, OpenAPI routes, migration, and focused tests.
- [x] Identify the affected services, client contracts, hooks, API routes, and database tables.
- [x] Determine whether a Prisma migration is needed: **No**, because the existing evidence row can
      be created with its authoritative `incident_id` after severity resolution.

## Task Summary

Capture the exact accepted MediaPipe frame into bounded browser memory, persist its telemetry
occurrence through a server-authoritative decision path, and create an evidence row and signed
upload target only when that occurrence resolves to `MEDIUM` or `HIGH`, while preserving telemetry
when capture, decision delivery, or upload fails.

## Implementation Outcome

- Implemented the new authenticated `POST /telemetry/evidence/candidates` contract and removed the
  standalone `POST /telemetry/evidence/uploads` initialization route.
- Added inline candidate persistence through `TelemetryIngestionService.persistEvidenceCandidate()`
  so the three MediaPipe evidence-candidate event types bypass the queue for the severity decision
  while ordinary telemetry keeps the existing ingestion path.
- Added `EvidenceCandidateService` to gate upload eligibility from authoritative server severity,
  write direct `incident_id` linkage, and fail closed for low or unavailable decisions.
- Replaced the shared client `initializeEvidenceUpload()` helper with
  `ingestMediaPipeEvidenceCandidate()` and refactored the student runtime to capture the frame
  first, request a server decision, upload only on `UPLOAD`, and fall back to ordinary telemetry on
  candidate suppression, timeout, or local capture failure.
- Added bounded browser retention guards with `MAX_PENDING_EVIDENCE_DECISIONS = 3` and
  `EVIDENCE_DECISION_TIMEOUT_MS = 10_000`.
- Focused validation completed on 2026-07-28:
  `packages/services` targeted tests passed,
  targeted `sentinel-web` MediaPipe upload/client tests passed,
  targeted `sentinel-api` evidence controller/DTO tests passed,
  and targeted `sentinel-api` ingestion DTO/service tests passed.
- Remaining follow-up: the DB-backed `sentinel-api` evidence service suite could not be completed in
  this environment because the Supabase pooler was unreachable during validation, and the broader
  workspace suites (`pnpm test`, `pnpm lint`, `pnpm build`) were not rerun as part of this patch.

## Pre-Planning Summary

- **Affected API services:** `TelemetryIngestionService`, `TelemetryStorageService`,
  `EvidenceUploadService`, a new evidence-candidate orchestration service, and the authenticated
  telemetry evidence routes.
- **Affected client services:** MediaPipe telemetry payload construction, the
  `@sentinel/services` telemetry API helpers, the incident dispatcher, and the direct evidence
  upload hook.
- **Affected DB tables:** `flagged_incidents`, `telemetry_incident_evidence`, `exam_attempts`,
  `exam_configurations`, `students`, and `institutions`.
- **Existing external resource:** the private Supabase bucket configured by
  `TELEMETRY_EVIDENCE_BUCKET`; no new bucket or provider is required.
- **Prisma migration required:** No.

## 1. The Context

The browser currently uploads evidence as soon as a MediaPipe signal crosses its local
duration/confidence/cooldown boundary, but the authoritative `LOW`/`MEDIUM`/`HIGH` decision is made
later by API persistence using server history and runtime overrides. The patch must retain the
triggering frame before it disappears, avoid creating any low/ignored evidence row or object, keep
the general telemetry queue unchanged, and fail closed without interrupting the exam.

## 3. The Triad

### Option A: The Pragmatic Path (Speed & Simplicity)

- **Approach:** Add a dedicated authenticated MediaPipe evidence-candidate route that reuses
  telemetry policy but persists only these three already-throttled event types inline, then returns
  a signed upload target only when the resulting server severity is `MEDIUM` or `HIGH`.
- **Tradeoff:** Evidence-candidate MediaPipe events bypass Redis queueing, so this route needs
  latency monitoring and must stay restricted to the three bounded event types.

### Option B: The Strategic Path (Robustness & Scalability)

- **Approach:** Add a durable per-event outcome table written by both sync and Redis persistence,
  then let the browser poll by `eventId` while holding the encoded frame until the outcome becomes
  eligible or terminal.
- **Tradeoff:** Preserves fully asynchronous ingestion but requires a Prisma migration, outcome
  retention and authorization rules, polling backoff, cleanup, and another reconciliation surface.

### Option C: The Pivot Path (Creative & Out-of-the-Box)

- **Approach:** Upload each frame into a short-lived uncommitted storage namespace, promote the
  object and create its evidence row only after a worker resolves `MEDIUM`/`HIGH`, and automatically
  purge every low or orphaned candidate.
- **Tradeoff:** Avoids long browser-held blobs but still transmits and temporarily stores low
  evidence, increasing privacy exposure and bucket load contrary to the patch objective.

## 1. The Execution

- **The Recommendation:** Option A.
- **The Justification:** The three MediaPipe events are already bounded by client persistence and
  cooldown rules, and `TelemetryStorageService.appendEvent()` already returns the authoritative
  incident, disposition, and severity needed for the decision. A dedicated inline route avoids a
  schema migration, polling, duplicate severity logic, and low-severity object creation while
  leaving all other telemetry on the configured sync/Redis path; the browser still invokes it
  asynchronously, so API latency cannot block frame processing or exam interaction.
- **Next Steps:**
    1. Add the decision-aware API contract and a reusable inline telemetry-persistence seam for the
       three MediaPipe event types.
    2. Create and directly link evidence only for new `MEDIUM`/`HIGH` results, and close the
       standalone initialization bypass.
    3. Refactor the student dispatcher to capture first, consume the decision, upload only when
       authorized, and fall back to ordinary telemetry on any local or decision-path failure.

## Fixed Product and Technical Decisions

- Every distinct occurrence whose authoritative final severity is `MEDIUM` or `HIGH` gets at most
  one image; capture is not limited only to the `LOW`→`MEDIUM` or `MEDIUM`→`HIGH` transition.
- Forced `MEDIUM` and `HIGH` telemetry overrides are eligible because
  `AppendEventResult.finalSeverity` is the authority.
- `LOW`, policy-ignored, unsupported, timed-out, and unavailable decisions create no evidence row
  and no storage object.
- The exact frame is drawn and encoded before the decision request, then held only in memory.
- The combined request contains telemetry plus declared capture metadata, never image bytes.
- Only `GAZE_OFF_SCREEN`, `NO_FACE_DETECTED`, and `MULTIPLE_FACES` may use the decision route.
- The decision route persists inline in both configured ingestion modes; all other telemetry keeps
  the current queue behavior.
- The API response exposes a bounded upload decision and optional signed target, not a
  client-supplied or client-calculated severity.
- A duplicate event may resume an existing compatible `PENDING_UPLOAD` row or report an existing
  `AVAILABLE` row, but it must never create a new row from the incident's later current severity.
- Evidence initialization directly writes the authoritative `incident_id`; legacy correlation and
  reconciliation remain for pre-patch or interrupted rows.
- Terminal evidence rows continue counting toward the lifetime attempt/type quotas so deletion
  cannot be used to generate an unbounded sequence of captures.
- The browser allows at most three pending candidate decisions and uses a ten-second decision
  timeout; overflow or timeout falls back to ordinary telemetry with the same `eventId` and
  `dedupeKey`.

## Phase 1: Decision Contract and Inline Persistence Seam

**Goal:** Define a strict API contract for one MediaPipe telemetry occurrence plus its captured-frame metadata and return an authoritative bounded evidence decision.

- [x] In `app/sentinel-api/src/modules/telemetry/evidence/evidence.dto.ts`, add
      `ingestEvidenceCandidateSchema` whose body reuses the canonical telemetry fields but restricts
      `eventType` to `GAZE_OFF_SCREEN`, `NO_FACE_DETECTED`, or `MULTIPLE_FACES`, requires `WEB` and
      `AI`, requires `metadata.eventId`, `metadata.dedupeKey`, and `metadata.clientActionAt`, and
      adds `capture` with `capturedAt`, `mimeType`, and positive `sizeBytes`.
- [x] In `app/sentinel-api/src/modules/telemetry/evidence/evidence.dto.ts`, define the response with
      `telemetryDisposition` (`inserted`, `aggregated`, `duplicate-ignored`, or `ignored`),
      `evidenceDecision` (`UPLOAD`, `NOT_ELIGIBLE`, `ALREADY_AVAILABLE`, or `UNAVAILABLE`), and an
      optional existing signed-upload target; do not return or accept a browser-controlled
      severity.
- [x] In `app/sentinel-api/src/modules/telemetry/ingestion/ingestion.service.ts`, extract the current
      settings resolution, global-enabled check, and `filterImportantEvent()` call into a shared
      private preparation path, then add exported
      `TelemetryIngestionService.persistEvidenceCandidate()` that writes a prepared candidate
      directly with `TelemetryStorageService.appendEvent()` and returns its
      `AppendEventResult | null` without calling `TelemetryIngestionQueueService.submit()`.
- [x] In `app/sentinel-api/src/modules/telemetry/ingestion/ingestion.service.ts`, reject
      non-MediaPipe evidence-candidate event types before persistence and retain the existing
      `processEvent()` behavior for ordinary sync and Redis ingestion.
- [x] Add JSDoc to the new exported DTO types and
      `TelemetryIngestionService.persistEvidenceCandidate()`, documenting the inline severity
      authority and restricted event set.
- [x] Extend `app/sentinel-api/src/modules/telemetry/ingestion/ingestion.dto.test.ts` with valid
      candidate bodies plus rejection cases for missing stable IDs, mismatched source/rule,
      unsupported event types, non-Web platforms, invalid MIME types, and non-positive sizes.
- [x] Create
      `app/sentinel-api/src/modules/telemetry/ingestion/ingestion.service.test.ts` covering ignored
      policy results, globally disabled telemetry, direct storage persistence in configured `sync`
      and `redis` modes, returned `AppendEventResult`, and proof that the queue submitter is not
      called for evidence candidates.
      **Migration required:** No — this phase adds an OpenAPI/service contract over existing
      telemetry records.

## Phase 2: Server-Authoritative Evidence Decision and Route

**Goal:** Persist the occurrence, apply the authoritative severity gate, and create a directly linked evidence row only for eligible new events.

- [x] Create
      `app/sentinel-api/src/modules/telemetry/evidence/services/evidence-candidate.service.ts` with
      exported `EvidenceCandidateService.process()` that derives the evidence attempt exclusively
      from the telemetry `examSessionId` instead of accepting a second client attempt identifier, calls
      `TelemetryIngestionService.persistEvidenceCandidate()`, and maps null/`LOW` results to
      `NOT_ELIGIBLE` without calling evidence initialization.
- [x] In
      `app/sentinel-api/src/modules/telemetry/evidence/services/evidence-candidate.service.ts`, for
      distinct `inserted` or `aggregated` `MEDIUM`/`HIGH` results, call
      `EvidenceUploadService.initializeUpload()` with the server-returned `incidentId` and return
      `UPLOAD`; catch feature-flag, allowlist, quota, and storage-target failures after telemetry
      persistence and return `UNAVAILABLE` with bounded diagnostics instead of failing or retrying
      telemetry.
- [x] In
      `app/sentinel-api/src/modules/telemetry/evidence/services/evidence-candidate.service.ts`,
      handle `duplicate-ignored` by looking up only an existing `(attempt_id, event_id)` evidence
      row: refresh a compatible `PENDING_UPLOAD` target, return `ALREADY_AVAILABLE` for
      `AVAILABLE`, and return `NOT_ELIGIBLE` when no row exists so a historical low frame cannot
      become eligible after its aggregated incident later escalates.
- [x] In
      `app/sentinel-api/src/modules/telemetry/evidence/services/evidence-upload.service.ts`, accept
      the authoritative `incidentId`, persist it on new evidence rows, perform the idempotency lookup
      before quota checks, refresh targets only for compatible `PENDING_UPLOAD` rows, and never
      resurrect `AVAILABLE`, `FAILED`, `DELETED`, or `EXPIRED` rows.
- [x] Create
      `app/sentinel-api/src/modules/telemetry/evidence/controllers/ingest-evidence-candidate.controller.ts`
      with an authenticated `POST /telemetry/evidence/candidates` OpenAPI route that enforces
      `body.studentId === user.id`, invokes `EvidenceCandidateService.process()`, and returns the
      decision contract without logging upload tokens or URLs.
- [x] In `app/sentinel-api/src/modules/telemetry/evidence/evidence.routes.ts`, register the
      candidate route and remove registration of `POST /telemetry/evidence/uploads`; delete
      `app/sentinel-api/src/modules/telemetry/evidence/controllers/initialize-evidence-upload.controller.ts`
      after all callers move to the combined candidate contract.
- [ ] Add JSDoc to `EvidenceCandidateService.process()` and modified exported evidence-upload
      methods, and add only non-obvious comments around duplicate fail-closed behavior.
- [ ] Create
      `app/sentinel-api/src/modules/telemetry/evidence/services/evidence-candidate.service.test.ts`
      covering first/second `LOW`, third-through-fifth `MEDIUM`, sixth `HIGH`, forced severity,
      policy ignore, disabled evidence, quota denial, initialization failure, direct incident
      linkage, duplicate pending/available reuse, and duplicate-without-row denial.
- [ ] Extend `app/sentinel-api/src/modules/telemetry/evidence/evidence.service.test.ts` for
      idempotency-before-quota, direct `incident_id` insertion, terminal-state refusal, and
      lifetime quota counting.
- [ ] Extend `app/sentinel-api/src/modules/telemetry/evidence/evidence.controller.test.ts` with
      authenticated candidate success, student mismatch, unsupported payload, low decision with no
      upload target, eligible decision with a target, and removal of the standalone initialization
      route.
      **Migration required:** No — `telemetry_incident_evidence.incident_id` already supports
      direct linkage.

## Phase 3: Shared Client Contract

**Goal:** Give the web runtime one typed request that submits telemetry metadata and receives an optional server-authorized upload target.

- [x] In `packages/services/src/api/telemetry.ts`, replace
      `initializeEvidenceUpload()` and `InitializeEvidenceUploadPayload` with exported
      `ingestMediaPipeEvidenceCandidate()`,
      `IngestMediaPipeEvidenceCandidatePayload`, and
      `IngestMediaPipeEvidenceCandidateResponse` matching the new decision route.
- [x] In `packages/services/src/api/telemetry.ts`, let
      `ingestMediaPipeEvidenceCandidate()` accept an optional `AbortSignal`, post to
      `/telemetry/evidence/candidates`, and preserve the existing response-unwrapping convention.
- [ ] Keep `completeEvidenceUpload()`, incident evidence viewing/deletion, and reconciliation
      helpers unchanged; update `packages/services/src/api/index.ts` only if an explicit export is
      required after the type changes.
- [x] In
      `app/sentinel-web/src/app/(protected)/student/exam/[id]/_lib/web-telemetry-client/index.ts`,
      add exported `emitMediaPipeEvidenceCandidate()` that applies the same runtime/rule eligibility
      checks and canonical `buildAttemptMediaPipeTelemetryPayload()` mapping as
      `emitMediaPipeTelemetryEvent()`, then calls the new package helper with capture metadata.
- [ ] Add JSDoc to the new exported package helper and web telemetry function, including the
      server-authoritative decision and abort semantics.
- [ ] Update `packages/services/src/api/telemetry.test.ts` to assert the candidate endpoint, exact
      request/response shape, optional signal propagation, and removal of the standalone
      initialization helper.
- [ ] Extend
      `app/sentinel-web/src/app/(protected)/student/exam/[id]/_lib/web-telemetry-client.test.ts`
      with disabled runtime/rule suppression, canonical stable metadata forwarding, all four
      evidence decisions, and unchanged generic MediaPipe telemetry fallback behavior.
      **Migration required:** No — this phase changes TypeScript and HTTP contracts only.

## Phase 4: Exact-Frame Retention, Decision, and Upload

**Goal:** Hold the accepted frame only in bounded browser memory and upload it exclusively when the API returns `UPLOAD`.

- [x] In
      `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-attempt-mediapipe-monitoring/_constants.ts`,
      add `MAX_PENDING_EVIDENCE_DECISIONS = 3` and
      `EVIDENCE_DECISION_TIMEOUT_MS = 10_000` with comments explaining the bounded-memory and
      fail-closed limits.
- [x] Refactor
      `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-attempt-mediapipe-monitoring/_hooks/use-incident-evidence-upload.ts`
      so it accepts a server-issued upload target and blob, performs only the signed Supabase upload
      and completion call, and no longer initializes evidence independently.
- [x] In
      `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-attempt-mediapipe-monitoring/_hooks/use-incident-telemetry-dispatcher.ts`,
      replace `inFlightEvidenceEventIdsRef` with a `Map<eventId, AbortController>`, draw/encode the
      current frame immediately, submit the candidate with the same `eventId`, `dedupeKey`, and
      `clientActionAt`, and call the upload hook only for an `UPLOAD` response.
- [x] In
      `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-attempt-mediapipe-monitoring/_hooks/use-incident-telemetry-dispatcher.ts`,
      release the blob and pending entry for `NOT_ELIGIBLE`, `ALREADY_AVAILABLE`, or `UNAVAILABLE`;
      when capture fails, the pending limit is reached, the decision times out, or the candidate
      request exhausts bounded retries, call `emitMediaPipeTelemetryEvent()` with the same stable
      identifiers so telemetry persists idempotently without evidence.
- [x] In
      `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-attempt-mediapipe-monitoring/_hooks/use-incident-telemetry-dispatcher.ts`,
      keep toasts and active-incident UI independent of evidence, map decision/upload outcomes to
      bounded `writeMonitoringEventTrace()` reasons, and never log blobs, signed URLs, or upload
      tokens.
- [x] In
      `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-attempt-mediapipe-monitoring/_hooks/use-incident-telemetry-dispatcher.ts`,
      make `clearInFlightEvents()` abort every decision, clear the map, and prevent late upload or
      completion work after unmount, attempt termination, or lost eligibility.
- [ ] Add or update JSDoc on the exported dispatcher and upload hook to describe exact-frame
      retention, authoritative gating, fallback telemetry, and cleanup.
- [x] Update the tests in
      `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-attempt-mediapipe-monitoring/_hooks/use-incident-evidence-upload.test.tsx`
      to cover signed upload/completion from a supplied target, retryable storage errors,
      completion failure, unmount, and proof that the hook never calls evidence initialization.
- [ ] Extend the tests in
      `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-attempt-mediapipe-monitoring/index.test.tsx`
      to prove low/ignored/unavailable decisions never upload, each medium/high `UPLOAD` decision
      uploads its matching blob once, duplicate available does not upload, capture occurs before the
      decision resolves, three pending blobs are allowed, the fourth falls back to telemetry,
      timeout/failure reuse the same IDs, and cleanup aborts late work.
- [ ] Retain and run
      `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-attempt-mediapipe-monitoring/_utils/capture-incident-evidence-frame.test.ts`
      to verify maximum dimension, byte limit, MIME fallback, invalid frame rejection, and canvas
      cleanup remain intact.
      **Migration required:** No — blobs remain ephemeral browser memory and existing evidence rows
      are used only after authorization.

## Phase 5: Regression, Operations, and Rollout Validation

**Goal:** Prove the severity gate, telemetry fallback, storage lifecycle, and both ingestion modes remain safe under retries and failure.

- [ ] Extend
      `app/sentinel-api/src/modules/telemetry/storage/services/incident-persistence.service.test.ts`
      with a six-occurrence MediaPipe sequence asserting the exact `LOW`, `LOW`, `MEDIUM`,
      `MEDIUM`, `MEDIUM`, `HIGH` results and distinct event IDs while preserving aggregation.
- [ ] Run `pnpm --dir app/sentinel-api test` and confirm ingestion, severity, persistence,
      evidence-candidate, upload, correlation, controller, storage, deletion, and reconciliation
      suites pass.
- [ ] Run `pnpm --dir app/sentinel-web test` and confirm the MediaPipe runtime, dispatcher, frame
      capture, upload, telemetry client, monitoring gallery, incident drawer, and privacy suites
      pass.
- [x] Run `pnpm --dir packages/services test` to verify the additive candidate helper and retained
      evidence read/delete/complete helpers.
- [ ] Run `pnpm lint`, `pnpm format:check`, and `pnpm build` to catch cross-workspace OpenAPI,
      TypeScript, formatting, and production-build failures.
- [ ] Manually validate with `TELEMETRY_INGESTION_MODE=sync` that occurrences one and two create no
      evidence row/object, occurrences three through six create one chronological frame each, and
      the instructor gallery displays only those four eligible frames.
- [ ] Repeat the same occurrence matrix with `TELEMETRY_INGESTION_MODE=redis` and verify candidate
      requests still resolve inline while unrelated telemetry enters Redis normally.
- [ ] Manually validate feature-disabled, institution-not-allowlisted, quota-reached, offline,
      request-timeout, refresh/unmount, and Supabase upload-failure cases: the exam continues,
      telemetry remains idempotent, no low/unknown object is created, and stale pending rows converge
      through the existing reconciliation endpoint.
- [ ] Verify operational logs and monitoring traces contain event IDs and bounded decision codes but
      never image bytes, upload tokens, or signed URLs; compare inline candidate latency and volume
      against the existing telemetry health baseline before expanding the institution allowlist.
      **Migration required:** No — rollout uses the existing evidence feature flag, allowlist,
      quotas, bucket, and reconciliation cron.

## Done Criteria

- [ ] The first two default MediaPipe occurrences persist as `LOW` without an evidence row or
      object.
- [ ] Every distinct third-through-fifth `MEDIUM` and sixth-or-later `HIGH` occurrence receives at
      most one evidence row linked directly to the incident and one private object.
- [ ] Forced `MEDIUM`/`HIGH` severity is eligible; forced or organic `LOW` is not.
- [ ] Unsupported, policy-ignored, feature-disabled, non-allowlisted, timed-out, and failed
      candidates produce no new object and never suppress telemetry.
- [ ] Duplicate delivery never turns an old low occurrence into eligible evidence and never creates
      a second row or object.
- [ ] The student browser never supplies authoritative severity and cannot call a standalone route
      to initialize low-severity evidence.
- [ ] Redis and sync configurations produce the same severity/evidence outcome for candidate
      events, while ordinary telemetry retains its configured ingestion mode.
- [ ] At most three encoded frames await decisions, every decision is bounded to ten seconds, and
      teardown prevents late uploads.
- [ ] Existing private storage, signed view, deletion, retention, audit, and reconciliation
      behavior remains intact.
- [ ] Every new or modified exported function has JSDoc, and inline comments are limited to
      non-obvious idempotency, severity, and cleanup logic.
- [ ] All focused and workspace Vitest suites, lint, formatting checks, and builds pass.

## Additional Considerations

- **Breaking API Changes:** Yes, for the authenticated student evidence-upload initialization
  surface. `POST /telemetry/evidence/uploads` and
  `@sentinel/services.initializeEvidenceUpload()` are replaced by the combined candidate endpoint
  and helper; API, package, and web changes must deploy together. Incident evidence viewing,
  deletion, completion, and reconciliation contracts remain unchanged.
- **New Environment Variables:** None. Reuse `TELEMETRY_EVIDENCE_ENABLED`,
  `TELEMETRY_EVIDENCE_INSTITUTION_ALLOWLIST`, bucket, size, quota, signed-URL TTL, and retention
  settings.
- **Migration Rollback:** Not applicable because no Prisma migration is planned. Rollback requires
  restoring the standalone initialization route/helper and the prior dispatcher together; do not
  roll back only the API while the new web client is deployed.
- **Authorization Boundary:** The authenticated user ID must match the telemetry `studentId`;
  existing attempt ownership, `IN_PROGRESS` lifecycle, institution allowlist, and enabled AI-rule
  checks remain mandatory before an upload target is issued.
- **Privacy Boundary:** Drawing to an in-memory canvas is not permission to persist. Only an
  API-authorized `UPLOAD` response may create or transmit an image object.
- **Idempotency Boundary:** The stable `eventId` and `dedupeKey` must be reused across candidate
  retries and generic telemetry fallback. Duplicate evidence decisions may resume only an already
  existing row for that exact event.
- **Performance Boundary:** Inline persistence is restricted to the three client-throttled
  MediaPipe events. If measured candidate latency or volume exceeds the operational budget, stop
  allowlist expansion and plan Option B rather than moving severity prediction into the browser.
- **Deployment Order:** Deploy the API and `packages/services` contract before or atomically with
  the web client, create/verify the private bucket, run focused tests, then enable institutions
  gradually through the existing allowlist.
