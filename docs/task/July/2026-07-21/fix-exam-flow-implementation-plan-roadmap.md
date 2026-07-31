# Exam Flow Fix Roadmap

## Task Summary

Stabilize the student preflight, admission, reconnect, monitoring-readiness, and instructor report-navigation flows without allowing client-side state to bypass server policy or discard locally saved answers.

## 1. The Context

The flow already has lobby admission, runtime access, local answer drafts, camera/audio providers, and MediaPipe calibration, but those concerns currently make independent readiness decisions. The repair must make server admission authoritative, require a fresh live-device gate after interruption, preserve attempt drafts, and remove competing report-navigation state without turning the work into one oversized change.

## 3. The Triad

### Option A: The Pragmatic Path (Speed & Simplicity)

- **Approach:** Patch the existing lobby checks, add a reload redirect, and correct the report active-link condition in place.
- **Tradeoff:** Fast, but leaves duplicated readiness and navigation state able to drift again.

### Option B: The Strategic Path (Robustness & Scalability)

- **Approach:** Keep the existing architecture while establishing one authoritative contract per boundary: server admission, explicit reconnect intent, live media readiness, guarded preflight stages, and URL-derived navigation.
- **Tradeoff:** Requires coordinated API and frontend tests across several workspaces.

### Option C: The Pivot Path (Creative & Out-of-the-Box)

- **Approach:** Replace the flow with a persisted event-driven state machine shared by the API and web client.
- **Tradeoff:** Introduces a large migration and rollout surface for a focused bug-fix request.

## 1. The Execution

- **The Recommendation:** Option B.
- **The Justification:** It closes the server-authority and live-readiness gaps using existing tables, hooks, providers, and route conventions. It avoids new dependencies and contains risk by making every concern a separately testable phase file.
- **Next Steps:**
    1. Execute the phase files below in order; Phases 1–3 are release blockers, while Phase 5 may be implemented independently after its route contract is agreed.
    2. Do not start a later student-flow phase until the prior phase's focused tests pass.
    3. Run the cross-phase regression matrix in Phase 4 before release.

## Phase Files

### Phase 1: Server-Authoritative Lobby Admission

**Goal:** Ensure instructor-gated exams always create and display a waiting student until a current instructor decision approves entry.

- [x] Complete [fix-exam-flow-implementation-plan-lobby-admission.md](./fix-exam-flow-implementation-plan-lobby-admission.md).
- [x] Pass the API lobby, access, flow, configuration, and instructor/student lobby component tests named in that file.
      **Migration required:** No — the existing `exam_configurations` and `exam_lobby_admissions` columns support the selected transition-reset approach.

### Phase 2: Reconnect Gate and Local Draft Recovery

**Goal:** Route interrupted active attempts through the lobby while retaining answers and elapsed time locally and on the server.

- [ ] Complete [fix-exam-flow-implementation-plan-reconnect-and-drafts.md](./fix-exam-flow-implementation-plan-reconnect-and-drafts.md).
- [ ] Pass the storage, session, attempt, and API reconnect tests named in that file.
      **Migration required:** No — reconnect counters and attempt drafts already exist in the current schema.

### Phase 3: Live Camera, Microphone, and MediaPipe Readiness

**Goal:** Prevent entry or re-entry until every required live monitoring resource is actually ready.

- [x] Complete [fix-exam-flow-implementation-plan-media-readiness.md](./fix-exam-flow-implementation-plan-media-readiness.md).
- [x] Pass provider, checkup, lobby, and attempt monitoring tests named in that file.
      **Migration required:** No — readiness is transient browser state plus existing session-scoped calibration metadata.

### Phase 4: Preflight Flow Stability and Regression Coverage

**Goal:** Make instruction → privacy → checkup → lobby → attempt transitions deterministic across direct URLs, denial, retry, refresh, and reconnect.

- [x] Complete [fix-exam-flow-implementation-plan-preflight-stability.md](./fix-exam-flow-implementation-plan-preflight-stability.md).
- [x] Pass the route-guard and end-to-end component regression matrix named in that file.
      **Migration required:** No — this phase consolidates client orchestration and test coverage.

### Phase 5: Instructor Report Navigation

**Goal:** Render one sidebar whose active item follows the canonical report URL for Overview, Attempt Summary, Action Queue, and Incident Logs.

- [x] Complete [fix-exam-flow-implementation-plan-instructor-navigation.md](./fix-exam-flow-implementation-plan-instructor-navigation.md).
- [x] Pass the navigation, workspace-shell, and report-hook tests named in that file.
      **Migration required:** No — this is route and render-state cleanup only.

## Release Done Criteria

- [x] A gated student cannot create an attempt before an `APPROVED` admission is observed by the API.
- [ ] Reload, browser return, and offline recovery route an active attempt to the lobby without clearing the local answer draft.
- [x] Resume remains disabled until required live camera/audio tracks and MediaPipe readiness are valid.
- [x] Direct URLs cannot skip privacy, checkup, lobby admission, or reconnect readiness gates.
- [x] Report navigation renders once and highlights the URL-selected section.
- [x] No exported function added or changed by implementation is left without JSDoc.
- [x] `pnpm --dir app/sentinel-api test` and `pnpm --dir app/sentinel-web test` pass.

## Cross-Cutting Notes

- **Breaking API changes:** None planned; existing response shapes should be retained. If reconnect intent is added to the start-session request, make it optional during rollout.
- **New environment variables:** None.
- **Migration rollback:** Not applicable because no schema migration is selected.
- **Implementation discipline:** Update the checkboxes in the active phase file as work proceeds; do not combine phases into a single pull request unless all earlier test gates are green.
