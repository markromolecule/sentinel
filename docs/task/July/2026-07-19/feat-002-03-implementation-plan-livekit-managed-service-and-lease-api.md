# LiveKit Work Package 03: Managed Service and Lease API

## 1. The Context

With durable leases and authorization established, Sentinel needs a narrow managed-LiveKit adapter and authenticated APIs that coordinate rooms, credentials, status, webhooks, and expiry. Existing monitoring and exam-flow routes must remain available when LiveKit is disabled or unavailable.

## 2. The Triad

### Option A: The Pragmatic Path (Speed & Simplicity)

- **Approach:** Generate join tokens directly in staff/student controllers and rely on browser disconnect handlers for cleanup.
- **Tradeoff:** Provider calls, domain transitions, token redaction, and crash recovery would be duplicated and difficult to test.

### Option B: The Strategic Path (Robustness & Scalability)

- **Approach:** Isolate LiveKit SDK calls behind a typed adapter, orchestrate leases in domain services, mount separate staff/student/webhook controllers, and run an idempotent expiry reconciler.
- **Tradeoff:** Adds service/controller layers and lifecycle tests before frontend integration.

### Option C: The Pivot Path (Creative & Out-of-the-Box)

- **Approach:** Use LiveKit room metadata and webhooks as the sole session database.
- **Tradeoff:** Provider availability would become required for authorization/status reads and would weaken Sentinel's audit/recovery guarantees.

## 3. The Execution

**Recommendation:** Option B — the Strategic Path.

**Justification:** The provider adapter keeps managed-service mechanics replaceable in tests without building a speculative multi-provider system. Domain services continue to own authorization and lease state, so provider failures cannot invalidate exam attempts or expose credentials.

### Entry Gate

- [x] Confirm work-package-02 migration, RLS, RBAC, repository, and state tests pass and are committed.
- [x] Keep `LIVE_INSPECTION_ENABLED=false` while endpoints are introduced.

## Pre-Planning Checklist

- [x] Inspected the current LiveKit stub, Hono route registration, monitoring and flow controllers, server startup/shutdown pattern, service client, query hooks, and audit logging.
- [x] Identified the managed provider adapter, staff/student route families, webhook ingress, reconciler, service clients, hooks, and tests this package will touch.
- [x] Confirmed this package consumes the work-package-02 tables and requires no additional Prisma migration.

## Scope and Affected Files

- `app/sentinel-api/src/modules/infrastructure/livekit/livekit.dto.ts`
- `app/sentinel-api/src/modules/infrastructure/livekit/livekit.routes.ts`
- `app/sentinel-api/src/modules/infrastructure/livekit/services/livekit-managed.service.ts` **[NEW]**
- `app/sentinel-api/src/modules/infrastructure/livekit/services/livekit-managed.service.test.ts` **[NEW]**
- `app/sentinel-api/src/modules/infrastructure/livekit/controllers/livekit-webhook.controller.ts` **[NEW]**
- `app/sentinel-api/src/modules/examination/live-inspection/live-inspection.dto.ts` **[NEW]**
- `app/sentinel-api/src/modules/examination/live-inspection/live-inspection.routes.ts` **[NEW]**
- `app/sentinel-api/src/modules/examination/live-inspection/live-inspection.routes.test.ts` **[NEW]**
- `app/sentinel-api/src/modules/examination/live-inspection/live-inspection.repository.ts`
- `app/sentinel-api/src/modules/examination/live-inspection/services/start-live-inspection.service.ts` **[NEW]**
- `app/sentinel-api/src/modules/examination/live-inspection/services/start-live-inspection.service.test.ts` **[NEW]**
- `app/sentinel-api/src/modules/examination/live-inspection/services/get-live-inspection-status.service.ts` **[NEW]**
- `app/sentinel-api/src/modules/examination/live-inspection/services/create-viewer-connection.service.ts` **[NEW]**
- `app/sentinel-api/src/modules/examination/live-inspection/services/stop-live-inspection.service.ts` **[NEW]**
- `app/sentinel-api/src/modules/examination/live-inspection/services/get-student-live-inspection-directive.service.ts` **[NEW]**
- `app/sentinel-api/src/modules/examination/live-inspection/services/create-publisher-connection.service.ts` **[NEW]**
- `app/sentinel-api/src/modules/examination/live-inspection/services/acknowledge-publisher-ready.service.ts` **[NEW]**
- `app/sentinel-api/src/modules/examination/live-inspection/services/acknowledge-publisher-failure.service.ts` **[NEW]**
- `app/sentinel-api/src/modules/examination/live-inspection/services/live-inspection-webhook.service.ts` **[NEW]**
- `app/sentinel-api/src/modules/examination/live-inspection/services/live-inspection-webhook.service.test.ts` **[NEW]**
- `app/sentinel-api/src/modules/examination/live-inspection/services/live-inspection-reconciler.service.ts` **[NEW]**
- `app/sentinel-api/src/modules/examination/live-inspection/services/live-inspection-reconciler.service.test.ts` **[NEW]**
- `app/sentinel-api/src/modules/examination/live-inspection/services/live-inspection-service-helpers.ts` **[NEW]**
- `app/sentinel-api/src/modules/examination/monitoring/monitoring.routes.ts`
- `app/sentinel-api/src/modules/examination/flow/flow.routes.ts`
- `app/sentinel-api/src/app.ts`
- `app/sentinel-api/src/server.ts`
- `packages/shared/src/schema/exams/live-inspection-schema.ts`
- `packages/services/src/api/exams/live-inspection.ts` **[NEW]**
- `packages/services/src/api/exams/live-inspection.test.ts` **[NEW]**
- `packages/services/src/api/exams/index.ts`
- `packages/hooks/src/query/exams/live-inspection/**` **[NEW]**

## Phase 1: Implement the Managed LiveKit Adapter

**Goal:** Centralize room, grant, token, participant, and webhook operations with safe defaults.

- [x] Create exported `LiveKitManagedService` methods with JSDoc for `createInspectionRoom`, `createPublisherToken`, `createViewerToken`, `removeParticipant`, `deleteInspectionRoom`, `listInspectionParticipants`, and `receiveWebhook` in `services/livekit-managed.service.ts`.
- [x] Explicitly create rooms with the opaque lease room name, `maxParticipants: 2`, configured empty/departure timeouts, and metadata limited to `leaseId`; never enable Egress or recording.
- [x] Generate publisher grants with camera as the only publish source, `canSubscribe:false`, and `canPublishData:false`; generate viewer grants with `canPublish:false`, `canSubscribe:true`, and `canPublishData:false`.
- [x] Use lease-specific opaque participant identities, configured `60s` initial-connect TTL, and no name/email/student-number metadata.
- [x] Make room deletion and participant removal tolerate provider not-found responses while preserving other errors as bounded `PROVIDER_*` codes.
- [x] Verify webhook signatures from the raw body with the SDK receiver before parsing or recording any event.
- [x] Add adapter tests with a mocked LiveKit SDK proving exact room options/grants/TTL, no forbidden capabilities, idempotent not-found cleanup, redacted errors, and invalid webhook rejection.

**Migration required:** No — consumes work-package-02 storage.

## Phase 2: Implement Staff Lease Orchestration and Routes

**Goal:** Let one authorized viewer create, observe, join, and stop one lease without receiving publisher credentials.

- [x] Create `start-live-inspection.service.ts`, `get-live-inspection-status.service.ts`, `create-viewer-connection.service.ts`, and `stop-live-inspection.service.ts` under `app/sentinel-api/src/modules/examination/live-inspection/services/`, with JSDoc on exports.
- [x] In start, evaluate global switch/allowlist/caps, call `assertLiveInspectionViewerAccess()`, resolve the canonical active attempt from exam/student, atomically acquire the lease, create the room, and terminalize the lease if room creation fails.
- [x] Return `409` bounded conflicts for active attempt/viewer leases and never reveal another viewer's user ID, room name, or token.
- [x] In viewer connection, reauthorize the same lease owner and issue a subscribe-only token only from `PUBLISHER_READY`; reject terminal, expired, wrong-owner, and pre-ready states.
- [x] In stop, transition idempotently, remove known participants, delete the room, and terminalize with a bounded reason even if provider cleanup partially fails.
- [x] Add staff controllers under `/exams/:examId/monitoring/...`, register them in `monitoring.routes.ts`, and define request/response OpenAPI schemas through `live-inspection.dto.ts` using shared schemas.
- [x] Add service/controller tests covering permission/relationship denial, caps, acquire race, provider failure compensation, status redaction, readiness gate, owner mismatch, idempotent stop, and disabled configuration.

**Migration required:** No — routes consume the established lease schema.

## Phase 3: Implement Student Directive and Publisher Routes

**Goal:** Mint camera-only credentials only for the authenticated owner of the current active session.

- [x] Create `get-student-live-inspection-directive.service.ts`, `create-publisher-connection.service.ts`, `acknowledge-publisher-ready.service.ts`, and `acknowledge-publisher-failure.service.ts` under `app/sentinel-api/src/modules/examination/live-inspection/services/`.
- [x] Resolve every student call through the authenticated `sessionId`; never accept a student user ID from the request body.
- [x] Re-run attempt ownership, camera-required, lifecycle, lease-expiry, and expected-state checks before issuing each publisher token.
- [x] Transition `REQUESTED -> PUBLISHER_CONNECTING` with compare-and-set semantics and accept ready/failure acknowledgements only for the current lease version.
- [x] Add student controllers below `/examination/flow/live-inspections`, register them in `flow.routes.ts`, and ensure response schemas never expose viewer identity or provider room metadata beyond the immediate connection URL/token response.
- [x] Add service/controller tests for owner mismatch, stale session/lease/revision, camera-optional exam, terminal attempt, expired lease, repeated claim, ready/failure transition, and token redaction from logs.

**Migration required:** No — student APIs consume existing storage and contracts.

## Phase 4: Process Webhooks and Reconcile Expiry

**Goal:** Clean up leases after browser crashes, connection aborts, track loss, and hard deadlines.

- [x] Implement `livekit-webhook.controller.ts` at `/infrastructure/livekit/webhooks`, mount it in `app.ts` without user JWT middleware, and require verified LiveKit signatures over the untouched raw body.
- [x] Record webhook event IDs before processing; treat duplicates as successful no-ops and store only bounded event type/result metadata.
- [x] Map `participant_joined`, `participant_left`, `participant_connection_aborted`, `track_published`, `track_unpublished`, and `room_finished` to valid compare-and-set lease transitions; ignore unknown rooms/identities without leaking lookup details.
- [x] Create `live-inspection-reconciler.service.ts` and start/stop helpers that claim expired leases in bounded batches, idempotently remove participants/delete rooms, and terminalize request/viewer/max-duration timeouts.
- [x] Wire reconciler startup/shutdown in `app/sentinel-api/src/server.ts` only when the feature is enabled; guard horizontally concurrent runs through lease version/state updates rather than process-local locks.
- [x] Add webhook and reconciler tests for invalid signatures, duplicate/out-of-order events, unknown rooms, publisher-ready, viewer-live, disconnect grace, expired batches, partial provider failure, and shutdown cleanup.

**Migration required:** No — webhook dedupe and expiry indexes already exist.

## Phase 5: Add Typed Service Clients and Query/Mutation Hooks

**Goal:** Give both portals and the student runtime one tested HTTP boundary without exposing token values to caches.

- [x] Add staff and student functions in `packages/services/src/api/exams/live-inspection.ts`; connection-token calls must opt out of persistence/caching and return tokens only to their immediate caller.
- [x] Export the client functions through `packages/services/src/api/exams/index.ts` and service barrels with JSDoc.
- [x] Add status/start/stop hooks under `packages/hooks/src/query/exams/live-inspection/`; status polling must run only for the selected active lease and stop on terminal state/unmount.
- [x] Keep publisher/viewer connection credential acquisition as imperative, non-query helpers so TanStack Query devtools/cache do not retain tokens.
- [x] Add service tests for exact paths/methods/bodies and hook tests for polling state, terminal stop, invalidation, unmount cancellation, disabled state, and absence of token query keys/cache writes.

**Migration required:** No — client/hook contracts only.

## Exit Gate

- [x] Provider adapter tests prove two-participant rooms, exact grants, TTL, and webhook verification.
- [x] Staff/student route tests prove authorization, ownership, redaction, conflicts, and idempotency.
- [x] Webhook/reconciler tests prove orphan cleanup without affecting exam attempt state.
- [x] OpenAPI generation, API typecheck, shared/service/hook tests pass.
- [x] Production remains disabled and no user-facing start control exists.
- [x] Commit this package before beginning work package 04.

**Validation note:** Package-03 route schemas were validated through route/service tests and a focused API TypeScript check. The repository still has known unrelated full-API typecheck blockers in older files, so package validation used the focused LiveKit API graph plus shared/services/hooks builds and tests.

## Compatibility, Configuration, and Rollback Notes

- **Breaking API changes:** Additive endpoints only; existing monitoring and flow endpoints remain independent of LiveKit.
- **Database migration:** No new migration in this package.
- **Environment variables:** Uses work-package-01 variables.
- **Rollback:** Disable the feature, stop the reconciler, terminate active rooms, remove route registration/services/clients, and retain lease tables for audit until work package 02 is separately rolled back.
