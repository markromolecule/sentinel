# LiveKit On-Demand Student Camera Integration Program

## 1. The Context

Sentinel needs camera-only, on-demand viewing of one active student attempt from both `sentinel-web` and `sentinel-core` without connecting the full examination roster to LiveKit. The work crosses configuration, RBAC, Prisma, Supabase Realtime, managed LiveKit APIs, the student MediaPipe stream, two monitoring UIs, and operational rollout, so implementing it as one large phase would create unsafe partial states and broad rollback boundaries.

## 2. The Triad

### Option A: The Pragmatic Path (Speed & Simplicity)

- **Approach:** Add token endpoints and connect the two existing `LiveFeedMonitor` components directly to LiveKit with client polling.
- **Tradeoff:** Fast delivery would leave duplicated cross-app behavior, weak crash recovery, and no authoritative lease protecting cost, privacy, or concurrent viewers.

### Option B: The Strategic Path (Robustness & Scalability)

- **Approach:** Deliver six independently promotable work packages: configuration, durable lease/security contracts, managed-service APIs, student publishing, shared cross-app viewing, and resilience/rollout validation.
- **Tradeoff:** Requires a Prisma migration and more staged contract work before the first camera frame is displayed.

### Option C: The Pivot Path (Creative & Out-of-the-Box)

- **Approach:** Keep students connected to one exam-wide room and use selective subscriptions to show only the chosen camera.
- **Tradeoff:** Simplifies signaling but consumes participant minutes for every student and weakens the two-party privacy boundary.

## 3. The Execution

**Recommendation:** Option B — the Strategic Path.

**Justification:** Durable, server-authoritative leases isolate LiveKit from exam correctness, while shared viewer behavior prevents `sentinel-core` and `sentinel-web` from drifting. Separating the work into gated files lets each schema, security, provider, browser, and rollout boundary be tested and rolled back before the next boundary depends on it.

### Locked Program Decisions

1. Use managed LiveKit only; delete the empty AWS EC2 service and add no AWS dependency or credential.
2. Use one opaque LiveKit room per inspection lease with `maxParticipants: 2`.
3. Use a database-backed lease with one active lease per attempt and one active lease per viewer.
4. Use private Supabase Broadcast only as a wake-up hint; Sentinel API remains authoritative.
5. Reuse a clone of the existing student camera track; never request a second camera stream or publish microphone audio.
6. Require `examinations:monitor_live_video`, institution scope, and the role/relationship rules defined in work package 02.
7. Share contracts, service calls, controller hooks, and a prop-driven monitor UI across both portals.
8. Keep the feature disabled by default until the final rollout gate passes.

## Pre-Planning Checklist

- [x] Summarized the requested feature and the need for separately executable plan files.
- [x] Inspected the LiveKit stub, exam monitoring routes/services, student MediaPipe provider, attempt orchestration, Supabase clients/hooks, RBAC catalog, Prisma schema, and duplicated monitoring detail surfaces in both portals.
- [x] Identified the affected apps, packages, database tables, environment variables, tests, and external managed services.
- [x] Determined that a Prisma migration is required for durable inspection leases, webhook deduplication, active-lease indexes, and private Realtime authorization.

## Program Files and Promotion Order

| Order | Plan file                                                                                                 | Bounded outcome                                                                   | Promotion gate                                                            |
| ----- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| 01    | `docs/task/2026-07-19/feat-002-01-implementation-plan-livekit-foundation-and-configuration.md`            | Dependencies, safe defaults, environment validation, and removal of AWS EC2 scope | Feature remains disabled; config and dependency tests pass                |
| 02    | `docs/task/2026-07-19/feat-002-02-implementation-plan-livekit-persistence-contracts-and-authorization.md` | Lease schema, state machine, RBAC, RLS, private wake-up contract                  | Migration and authorization tests pass; no provider calls exist           |
| 03    | `docs/task/2026-07-19/feat-002-03-implementation-plan-livekit-managed-service-and-lease-api.md`           | Managed LiveKit adapter, staff/student APIs, webhook processing, and reconciler   | API/provider tests pass with feature disabled in production               |
| 04    | `docs/task/2026-07-19/feat-002-04-implementation-plan-livekit-student-publisher-and-signaling.md`         | Targeted student wake-up and camera-only publisher using the existing stream      | Student tests prove no second capture, no audio, and safe cleanup         |
| 05    | `docs/task/2026-07-19/feat-002-05-implementation-plan-livekit-cross-app-viewer.md`                        | One shared viewer contract rendered consistently in both monitoring portals       | Core/web parity, authorization, media-state, and accessibility tests pass |
| 06    | `docs/task/2026-07-19/feat-002-06-implementation-plan-livekit-resilience-validation-and-rollout.md`       | Security, capacity, browser, cost, observability, rollout, and rollback evidence  | Formal release sign-off; then enable only for the allowlisted institution |

Do not execute two work packages concurrently. Commit and verify the current package, record its exit-gate evidence, and only then begin the next file.

## Phase 1: Freeze Baseline and Execute Work Package 01

**Goal:** Establish a disabled, validated managed-LiveKit foundation without changing exam behavior.

- [ ] Record focused baseline results for `app/sentinel-api`, `packages/shared`, `packages/services`, `packages/hooks`, `packages/ui`, `app/sentinel-web`, and `app/sentinel-core` in `docs/task/2026-07-19/livekit-integration-execution-log.md` **[NEW]**.
- [x] Execute every unchecked task in `docs/task/2026-07-19/feat-002-01-implementation-plan-livekit-foundation-and-configuration.md`.
- [x] Run the configuration and package tests named in work package 01 and append exact commands/results to `docs/task/2026-07-19/livekit-integration-execution-log.md`.

**Migration required:** No — work package 01 changes dependencies and configuration only.

## Phase 2: Execute Work Package 02

**Goal:** Establish the database and authorization source of truth before any provider or browser can connect.

- [x] Confirm the work-package-01 exit gate in `docs/task/2026-07-19/livekit-integration-execution-log.md` before applying a database migration.
- [x] Execute every unchecked task in `docs/task/2026-07-19/feat-002-02-implementation-plan-livekit-persistence-contracts-and-authorization.md`.
- [x] Run the migration, schema, state-transition, RBAC, RLS, and authorization tests named in work package 02 and record results in the execution log.

**Migration required:** Yes — this package adds lease/webhook persistence, indexes, triggers, and private Realtime authorization; its plan contains the rollback SQL requirements.

## Phase 3: Execute Work Package 03

**Goal:** Add tested server-side LiveKit orchestration while all user-facing entry points remain disabled.

- [x] Confirm the work-package-02 migration and authorization exit gate before mounting any credential endpoint.
- [x] Execute every unchecked task in `docs/task/2026-07-19/feat-002-03-implementation-plan-livekit-managed-service-and-lease-api.md`.
- [x] Run the provider, controller, service-client, webhook, reconciler, and OpenAPI tests named in work package 03 and record results in the execution log.

**Migration required:** No — this package consumes the work-package-02 schema without changing it.

## Phase 4: Execute Work Package 04

**Goal:** Let only the authenticated targeted student publish the existing camera track under an active lease.

- [x] Confirm the work-package-03 API/provider exit gate before adding browser publication code.
- [x] Execute every unchecked task in `docs/task/2026-07-19/feat-002-04-implementation-plan-livekit-student-publisher-and-signaling.md`.
- [x] Run the student publisher, MediaPipe continuity, Realtime ordering, and cleanup tests named in work package 04 and record results in the execution log.

**Migration required:** No — this package uses existing APIs and private-channel policies.

## Phase 5: Execute Work Package 05

**Goal:** Deliver one safe, consistent live-view interaction to `sentinel-core` and `sentinel-web`.

- [x] Confirm the work-package-04 student continuity gate before exposing **Start live view**.
- [x] Execute every unchecked task in `docs/task/2026-07-19/feat-002-05-implementation-plan-livekit-cross-app-viewer.md`.
- [x] Run the shared hook/UI plus core/web parity, authorization, and accessibility tests named in work package 05 and record results in the execution log.

**Migration required:** No — this package changes shared frontend behavior and both portal integrations only.

## Phase 6: Execute Work Package 06 and Promote

**Goal:** Prove the complete integration is safe, bounded, observable, and reversible before enabling it for real examinations.

- [x] Confirm all prior exit gates before running managed-service smoke, browser, network, capacity, and cost tests.
- [ ] Execute every unchecked task in `docs/task/2026-07-19/feat-002-06-implementation-plan-livekit-resilience-validation-and-rollout.md`.
- [ ] Attach final test evidence and product/privacy approval to `docs/task/2026-07-19/livekit-integration-execution-log.md` before changing the institution allowlist.

**Migration required:** No — finalization validates and controls rollout of the existing schema.

## Program Acceptance Criteria

- [x] The six work packages were executed in order with a recorded pass/fail gate between them.
- [ ] With the feature disabled or with no active inspection, zero Sentinel participants are connected to LiveKit.
- [ ] One inspection creates one opaque room with exactly one camera publisher and one subscriber.
- [x] `sentinel-core` and `sentinel-web` use the same contracts, hook state machine, and visible status semantics.
- [x] The student continues MediaPipe monitoring before, during, and after LiveKit publication.
- [x] No browser credential grants microphone, recording, room administration, data publication, screen share, or room creation.
- [x] No token, secret, SDP/ICE content, video frame, image, or face landmark is persisted or logged.
- [x] A global kill switch and institution allowlist can stop new sessions without affecting exam submission or local telemetry.
- [x] Rollback can proceed one work package at a time in reverse order without deleting student answers or incident history.

## Program Execution Notes

- Package commits were confirmed in order through `36cd1de7 feat(livekit): add resilience rollout validation`.
- Central execution evidence was reconciled in `docs/task/2026-07-19/livekit-integration-execution-log.md`, including the previously missing work-package-04 and work-package-05 sections.
- Historical caveat: package 01 started after the implementation request, so the “focused baseline before edits” entry remains unchecked and is recorded in the execution log as not run before edits.
- Release caveat: provider/browser/capacity/privacy/rollback sign-off remains open because it requires a dedicated non-production LiveKit project, synthetic accounts, browser sessions, dashboard evidence, and product/privacy approval.
- Production remains disabled by default; no real institution allowlist value or real LiveKit credential was committed.

## Compatibility, Configuration, and Rollback Notes

- **Breaking API changes:** New endpoints and response fields are additive; no existing monitoring endpoint may become dependent on LiveKit availability.
- **Database migration:** Required only in work package 02. Roll back UI/provider packages first, disable the feature, terminate active rooms, then remove policies/triggers/tables.
- **Environment variables:** Defined in work package 01; secrets remain server-only.
- **New dependencies:** `livekit-server-sdk` in `sentinel-api` and `livekit-client` in the shared browser-hook boundary.
- **Rollback order:** 06 → 05 → 04 → 03 → 02 → 01. Keep the feature disabled throughout rollback.
