# LiveKit Work Package 06: Resilience, Validation, and Rollout

## 1. The Context

Passing unit tests is insufficient for camera monitoring because real WebRTC behavior depends on two authenticated browsers, provider quotas, network traversal, autoplay, reconnects, tab closure, and privacy controls. The final package must collect evidence that the feature is secure, bounded in cost, reversible, and independent of exam completion before any institution is enabled.

## 2. The Triad

### Option A: The Pragmatic Path (Speed & Simplicity)

- **Approach:** Enable one production institution after unit tests and observe failures through normal logs.
- **Tradeoff:** Real students would become the first test of network, cleanup, privacy, and quota behavior.

### Option B: The Strategic Path (Robustness & Scalability)

- **Approach:** Add provider-gated smoke tests, full two-browser scenarios, security/chaos/capacity checks, operational metrics/runbooks, and a staged allowlist rollout with rollback rehearsal.
- **Tradeoff:** Delays broad enablement until evidence and approvals are complete.

### Option C: The Pivot Path (Creative & Out-of-the-Box)

- **Approach:** Run a permanent synthetic student/viewer pair as a production canary before every exam.
- **Tradeoff:** Improves continuous detection but consumes quota and adds a persistent camera/test-account operational surface.

## 3. The Execution

**Recommendation:** Option B — the Strategic Path.

**Justification:** WebRTC and privacy risks must be proven under realistic lifecycle and network conditions, not inferred from mocks. A staged allowlist and rehearsed kill switch keep failures from affecting exam answers, MediaPipe telemetry, or unrelated institutions.

### Entry Gate

- [x] Confirm work packages 01-05 are committed with all exit-gate evidence.
- [x] Confirm production remains globally disabled and no real institution is allowlisted.

## Pre-Planning Checklist

- [x] Inspected current Vitest scripts, API app tests, browser-facing component tests, worker/startup patterns, audit logging, and existing documentation locations.
- [x] Identified the automated E2E, opt-in provider smoke, browser/network, capacity, security, observability, runbook, rollout, and rollback evidence required.
- [x] Confirmed final validation and rollout require no new Prisma migration.

## Scope and Affected Files

- co-located `*.test.ts` files under `app/sentinel-api/src/modules/examination/live-inspection/` **[UPDATE]**
- co-located `*.test.ts` files under `app/sentinel-api/src/modules/infrastructure/livekit/` **[UPDATE]**
- `app/sentinel-api/src/tests/live-inspection.e2e.test.ts` **[NEW]**
- `app/sentinel-web/src/features/exams/monitoring/_components/live-feed-monitor.test.tsx`
- `app/sentinel-core/src/features/exams/monitoring/_components/live-feed-monitor.test.tsx`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/_components/student-live-inspection-bridge.test.tsx`
- `docs/testing/livekit-live-inspection-runbook.md` **[NEW]**
- `docs/testing/livekit-browser-network-matrix.md` **[NEW]**
- `docs/testing/livekit-security-checklist.md` **[NEW]**
- `docs/task/2026-07-19/livekit-integration-execution-log.md` **[NEW/UPDATE]**
- operational log/metric helpers under `app/sentinel-api/src/modules/examination/live-inspection/`

## Phase 1: Complete Automated Security and Contract Verification

**Goal:** Prove every credential, route, lease, and cross-tenant boundary fails closed.

- [ ] Add `app/sentinel-api/src/tests/live-inspection.e2e.test.ts` using the Hono app, test database, mocked provider, and authenticated student/instructor/admin/support contexts to execute start → directive → publisher-ready → viewer-connection → live → stop.
- [ ] Cover unauthorized role, missing permission, public/share-only instructor, cross-tenant admin, wrong student session, wrong lease owner, expired/stale lease, reused token request, unexpected track identity, and third-participant capacity errors.
- [x] Add assertions across API tests that serialized responses/log mocks contain no API secret, raw token after immediate return, SDP/ICE data, email, student number, video/image content, or face landmarks.
- [x] Run package/API/frontend test suites and a generated OpenAPI snapshot/contract check; record commands and results in the execution log.

**Migration required:** No — validates the existing migration and APIs.

## Phase 2: Verify Real Managed-LiveKit and Browser Behavior

**Goal:** Demonstrate the two-browser media path and cleanup against a dedicated non-production LiveKit project.

- [ ] Add an opt-in provider smoke test guarded by `LIVEKIT_SMOKE_TEST_ENABLED=true` that creates one room, validates `maxParticipants:2`, joins allowed publisher/viewer identities, rejects a third participant, and deletes the room in `finally`; skip it by default in CI.
- [x] Create `docs/testing/livekit-live-inspection-runbook.md` with prerequisites, synthetic accounts, exact start/publish/view/stop steps, expected LiveKit dashboard counts, log checks, cleanup queries, and evidence fields.
- [ ] Manually verify Chrome/Chromium, Firefox, and Safari/WebKit with two authenticated sessions: first frame, video-only playback, student indicator, explicit stop, route navigation, refresh, viewer crash, student crash, submission, lock, close, supersede, and network reconnect.
- [x] Fill `docs/testing/livekit-browser-network-matrix.md` with browser/OS/network/TURN result, time to publisher-ready, time to first frame, reconnect outcome, cleanup duration, and bounded failure code.
- [ ] Add regression tests for each reproducible browser failure discovered; do not approve the phase with an undocumented workaround.

**Migration required:** No — managed-service/browser verification only.

## Phase 3: Prove Capacity, Cost, and Orphan Cleanup

**Goal:** Validate zero idle participants, `2N` live connections, bounded usage, and deterministic expiry.

- [ ] Execute and record scenarios for 60 active attempts with zero inspections, one inspection, 10 inspections across 10 exams, duplicate starts on one attempt, one viewer opening two students, and provider/global/institution cap exhaustion.
- [ ] Confirm the LiveKit dashboard reports zero Sentinel participants when no lease is active and at most `2N` participants for `N` live leases.
- [ ] Test request `20s`, viewer-join `15s`, maximum-duration `300s`, room-empty `30s`, departure `10s`, and token `60s` behavior with controlled clock/provider fixtures plus one real smoke case.
- [ ] Force missed stop, duplicate/out-of-order webhook, API restart, reconciler overlap, and partial room-deletion failures; prove every lease becomes terminal and rooms are removed without changing `exam_attempts` answers/status.
- [ ] Record participant minutes and downstream GB per scenario in the execution log; require projected monthly testing to remain below an agreed warning threshold beneath current Build-plan allowances.
- [ ] Add automated tests for any cleanup/cap defect found during capacity testing.

**Migration required:** No — load and recovery verification only.

## Phase 4: Finalize Observability, Privacy, and Operations

**Goal:** Give operators enough bounded evidence to detect and stop failures without accessing media.

- [x] Add counters/timers for requested, publisher-ready, live, ended, failed, expired, active global/institution, time-to-publisher-ready, time-to-first-frame acknowledgement, inspection duration, and cleanup failure using existing logging/telemetry conventions.
- [x] Ensure audit actions record actor/attempt/exam/institution/lease IDs, role, timestamps, duration, and bounded reason only; add tests proving no per-frame/quality spam or secret/media fields.
- [x] Create `docs/testing/livekit-security-checklist.md` covering grant inspection, private-channel RLS, token storage search, no audio/Egress, tenant tests, student disclosure, audit access, secret rotation, webhook verification, and incident response.
- [x] Add operational runbook sections for provider outage, quota/cap reached, secret rotation, invalid webhook spike, stuck lease query, forced global disable, room cleanup, and support-safe diagnostics.
- [ ] Obtain documented product/privacy approval for disclosure, student live indicator, allowed staff roles, metadata retention, and no-recording/no-audio policy; link the approval reference in the execution log.

**Migration required:** No — observability and documentation only.

## Phase 5: Rehearse Rollback and Roll Out by Allowlist

**Goal:** Enable the feature only after rollback succeeds without affecting examinations.

- [ ] In staging, start an active inspection, set `LIVE_INSPECTION_ENABLED=false`, verify new starts fail closed, stop/reconcile all active rooms, and prove student answering/submission/MediaPipe continue.
- [ ] Rehearse reverse-package rollback order 06 → 05 → 04 → 03 while retaining work-package-02 tables; verify existing monitoring pages render an honest unavailable state.
- [ ] Enable one synthetic/internal institution in `LIVE_INSPECTION_INSTITUTION_ALLOWLIST`, keep caps at global `20`/institution `10`, and observe at least one complete controlled exam test.
- [ ] Review failures, first-frame latency, active/expired leases, participant minutes, downstream transfer, and cleanup evidence before adding any further institution.
- [ ] Record final sign-off and exact enabled configuration in `docs/task/2026-07-19/livekit-integration-execution-log.md`; never commit real credentials or institution secrets.

**Migration required:** No — feature-flag rollout only.

## Final Acceptance Criteria

- [ ] Zero LiveKit participants are connected for 60 uninspected active attempts.
- [ ] One inspection produces one room, one camera-only student publisher, and one expected viewer.
- [ ] A third participant and a second viewer/attempt lease are rejected safely.
- [x] No audio, Egress, recording, screenshot, thumbnail, or raw media persistence path exists.
- [x] Both portals show `LIVE` only after the expected track is playing and clean up on stop/navigation/crash.
- [ ] Student MediaPipe and exam completion survive all tested provider failures and rollback.
- [ ] Cross-role, cross-user, cross-lease, and cross-tenant security tests pass.
- [ ] Webhook/reconciler/idempotency tests leave no orphaned non-terminal lease or provider room.
- [ ] Browser/network matrix, security checklist, privacy approval, cost evidence, and rollback rehearsal are complete.
- [x] Focused tests, full workspace tests, lint, format check, and targeted builds pass or have documented unrelated pre-existing failures.

## Execution Notes

- Package 01-05 commits were confirmed on `feat-livekit-integration` before package-06 work began.
- Production remains disabled by default (`LIVE_INSPECTION_ENABLED=false`) and no committed institution allowlist value was added.
- `LIVEKIT_SMOKE_TEST_ENABLED=false` was added as the default; provider smoke is opt-in for a dedicated non-production LiveKit project.
- The automated smoke test covers provider room creation, `maxParticipants:2`, expected publisher/viewer token identities, zero idle participants, and `finally` cleanup. The live third-participant rejection check remains in the two-browser/provider drill because it requires an intentional WebRTC client join against the non-production LiveKit project.
- Manual browser, capacity, cost, rollback, and privacy-approval gates remain open because they require synthetic accounts and LiveKit dashboard access outside this repository execution.

## Compatibility, Configuration, and Rollback Notes

- **Breaking API changes:** None expected; a global disable returns bounded unavailable responses only on new live-inspection endpoints.
- **Database migration:** No new migration; work-package-02 rollback remains the final reverse step after all code and rooms are removed.
- **Environment variables:** Production enablement changes only the global switch/allowlist after secrets and caps are verified.
- **Rollback:** Disable immediately, terminate/reconcile rooms, revert portal viewer, student publisher, API/provider, then persistence/configuration only if the feature is permanently abandoned.
