# Fix 001 Implementation Plan: Attempt Lifecycle, Progress, Turn-In, and Evidence

**Status:** Planned  
**Date:** 2026-08-04  
**Type:** fix  
**Source context:** `docs/context/August/4/issue-attempt-turn-in.md`  
**Phase directory:** `docs/task/2026-08-04/fix-001-attempt-lifecycle-progress-turn-in-evidence/`

## Task Summary

Make terminal attempt state authoritative in the active student page, restore timely
question-progress persistence, complete turn-in through the supported transaction bridge, preserve
the auto-closing MediaPipe frame, and verify the private Supabase evidence path end to end.

## Pre-Planning

- [x] Read `.agents/rules/implementation-plan.md`.
- [x] Read `.agents/rules/global/1-3-1-rule.md`.
- [x] Read `.agents/workflows/to-do-workflow.md`.
- [x] Read `docs/context/August/4/issue-attempt-turn-in.md`.
- [x] Scanned the student attempt, flow API, monitoring, transaction, telemetry evidence, Supabase
      storage, and related Vitest files referenced by the phase documents.
- [x] Identified affected tables: `exam_attempts`, `exam_attempt_lifecycle_events`,
      `flagged_incidents`, and `telemetry_incident_evidence`.
- [x] **Prisma migration required:** No. Required columns, states, indexes, and tables already
      exist. Supabase bucket provisioning remains an operational resource check.

## Unified Context

The server correctly makes `CLOSED` terminal, but the mounted student page has no independent
lifecycle channel and its answer-sync debounce is reset by the one-second timer. The same production
sequence exposes two backend ordering defects: completion chooses an unsupported Kysely-native
transaction, while an evidence candidate can automatically close its attempt before its signed
upload target is authorized.

The implementation must preserve server authority, atomic completion, evidence severity/privacy
gates, and direct browser-to-Supabase uploads. A stale client must never regain write or evidence
permission after a terminal transition.

## Three Options

### Option A: The Pragmatic Path (Speed & Simplicity)

- **Approach:** Poll the full student exam detail, stabilize the current sync callback, replace the
  local transaction wrapper, and allow a narrow just-closed evidence exception.
- **Tradeoff:** Fastest, but repeatedly downloads an oversized payload and leaves lifecycle and
  evidence ordering encoded as special cases.

### Option B: The Strategic Path (Robustness & Scalability)

- **Approach:** Add a lightweight owned-session status contract, centralize terminal teardown,
  separate answer debounce from heartbeat state, use the Prisma-backed transaction bridge, and
  split incident persistence from side effects so evidence initialization precedes auto-close.
- **Tradeoff:** More contracts and orchestration tests must change, requiring a larger but bounded
  review pass.

### Option C: The Pivot Path (Creative & Out-of-the-Box)

- **Approach:** Deliver lifecycle changes through realtime events and move evidence handling to an
  outbox-driven background workflow.
- **Tradeoff:** Adds distributed replay and blob-lifetime concerns beyond the current dependency and
  complexity budget.

## Chosen Execution

**The Recommendation:** Choose **Option B: The Strategic Path**.

**The Justification:** It matches existing Hono, React Query, Prisma, and telemetry patterns without
adding dependencies. It avoids polling exam content, gives terminal teardown one owner, preserves
atomic completion, and fixes evidence ordering without weakening authorization.

## Task and Phase Index

Each task has its own folder. Each phase is a self-contained Markdown checklist with a focused goal,
concrete files/functions, tests, migration decision, and completion gate.

### Task 1: Authoritative Attempt Lifecycle

Folder: `fix-001-attempt-lifecycle-progress-turn-in-evidence/task-1-attempt-lifecycle/`

- [Phase 1: Owned-session status contract](fix-001-attempt-lifecycle-progress-turn-in-evidence/task-1-attempt-lifecycle/phase-1-owned-session-status-contract.md)
- [Phase 2: Terminal teardown and navigation](fix-001-attempt-lifecycle-progress-turn-in-evidence/task-1-attempt-lifecycle/phase-2-terminal-teardown-and-navigation.md)

### Task 2: Question Progress Synchronization

Folder: `fix-001-attempt-lifecycle-progress-turn-in-evidence/task-2-progress-synchronization/`

- [Phase 1: Decouple answer debounce from timer](fix-001-attempt-lifecycle-progress-turn-in-evidence/task-2-progress-synchronization/phase-1-decouple-answer-debounce.md)
- [Phase 2: Latest-wins sync and guarded persistence](fix-001-attempt-lifecycle-progress-turn-in-evidence/task-2-progress-synchronization/phase-2-latest-wins-sync.md)
- [Phase 3: Controlled-boundary progress flush](fix-001-attempt-lifecycle-progress-turn-in-evidence/task-2-progress-synchronization/phase-3-controlled-progress-flush.md)

### Task 3: Supported Turn-In Transaction

Folder: `fix-001-attempt-lifecycle-progress-turn-in-evidence/task-3-turn-in-transaction/`

- [Phase 1: Replace the local transaction check](fix-001-attempt-lifecycle-progress-turn-in-evidence/task-3-turn-in-transaction/phase-1-supported-transaction-bridge.md)
- [Phase 2: Atomicity and route semantics](fix-001-attempt-lifecycle-progress-turn-in-evidence/task-3-turn-in-transaction/phase-2-atomicity-and-route-semantics.md)

### Task 4: Auto-Closing Camera Evidence

Folder: `fix-001-attempt-lifecycle-progress-turn-in-evidence/task-4-camera-evidence/`

- [Phase 1: Separate persistence from side effects](fix-001-attempt-lifecycle-progress-turn-in-evidence/task-4-camera-evidence/phase-1-deferred-incident-side-effects.md)
- [Phase 2: Initialize evidence before auto-close](fix-001-attempt-lifecycle-progress-turn-in-evidence/task-4-camera-evidence/phase-2-evidence-before-auto-close.md)
- [Phase 3: Browser capture and direct upload](fix-001-attempt-lifecycle-progress-turn-in-evidence/task-4-camera-evidence/phase-3-browser-capture-direct-upload.md)

### Task 5: Supabase Readiness and Coupled Rollout

Folder: `fix-001-attempt-lifecycle-progress-turn-in-evidence/task-5-readiness-and-rollout/`

- [Phase 1: Non-destructive evidence readiness](fix-001-attempt-lifecycle-progress-turn-in-evidence/task-5-readiness-and-rollout/phase-1-evidence-readiness-check.md)
- [Phase 2: Coupled regression and rollout gates](fix-001-attempt-lifecycle-progress-turn-in-evidence/task-5-readiness-and-rollout/phase-2-coupled-regression-rollout.md)

## Phase Finalization Protocol

- [ ] Activate only one phase at a time unless the user explicitly authorizes parallel work.
- [ ] Implement only the checkboxes in the active phase file.
- [ ] Run the active phase's focused tests and quality commands.
- [ ] Record results and material decisions in that phase's completion gate.
- [ ] Recheck the phase's migration decision.
- [ ] Mark the phase complete only after its tests pass.
- [ ] Do not pre-check tasks in later phase files.

## API, Environment, and Compatibility Notes

- **API:** Additive `GET /examination/flow/sessions/:sessionId/status`; no breaking changes.
- **Environment:** No new required variables. Existing `TELEMETRY_EVIDENCE_*` and Supabase
  variables will be documented and validated.
- **Schema migration:** None.
- **Rollback:** Revert the additive status hook/endpoint and orchestration changes together. For
  evidence rollback, set `TELEMETRY_EVIDENCE_ENABLED=false` and leave reconciliation active until
  pending/failed cleanup converges.
- **Security:** Never authorize arbitrary closed-attempt evidence, expose answers through status,
  or log storage paths, signed URLs, upload tokens, image bytes, hashes, or landmarks.

## Overall Done Criteria

- [ ] Every linked phase has independently recorded passing tests and a completed phase gate.
- [ ] An idle student exits the interactive attempt within one polling interval after `CLOSED`.
- [ ] Continuous timer ticks cannot starve progress; `21/28` reaches monitoring as `75%`.
- [ ] Valid turn-in uses no Kysely-native transaction and atomically writes completion plus its
      lifecycle event.
- [ ] The MediaPipe event causing automatic closure can become `AVAILABLE` evidence without
      authorizing unrelated post-close uploads.
- [ ] The deployment passes the redacted Supabase readiness check and coupled regression.
- [ ] Focused tests, workspace tests, lint, typechecks, and formatting are recorded.
