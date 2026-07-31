# Phase 1 — Server-Authoritative Lobby Admission

## Task Summary

Make instructor admission authoritative from configuration persistence through student check-in, instructor waiting-list rendering, runtime eligibility, and session creation.

## 1. The Context

`checkInLobby()` correctly inserts `WAITING` for a new instructor-gated admission, and `startSessionService()` already refuses an ineligible student. The unsafe edge is stale or inconsistent admission/configuration state: an existing `APPROVED` row is retained when the exam changes from automatic to instructor-gated, while the student client also derives gating from a separately fetched configuration.

## 3. The Triad

### Option A: The Pragmatic Path (Speed & Simplicity)

- **Approach:** Force the student lobby button disabled whenever its local configuration says `INSTRUCTOR_GATED` and status is not `APPROVED`.
- **Tradeoff:** A stale or failed client configuration fetch can still misrepresent policy, and direct API calls remain the real security boundary.

### Option B: The Strategic Path (Robustness & Scalability)

- **Approach:** Reset non-active stale approvals when admission mode becomes gated, return authoritative admission/runtime state from existing API paths, and retain the gatekeeper check immediately before session creation.
- **Tradeoff:** Configuration-save and lobby behavior must be transactionally coordinated and regression-tested.

### Option C: The Pivot Path (Creative & Out-of-the-Box)

- **Approach:** Add versioned admission generations and bind each approval to a configuration/schedule generation.
- **Tradeoff:** Strongest provenance, but requires a schema migration and backfill beyond this bug-fix scope.

## 1. The Execution

- **The Recommendation:** Option B.
- **The Justification:** Existing status, decision timestamps, attempt state, and configuration fields are sufficient. Resetting admissions only on the `AUTOMATIC` → `INSTRUCTOR_GATED` transition fixes stale automatic approvals while the gatekeeper remains the non-bypassable authority.
- **Next Steps:**
    1. Add transition-aware invalidation beside configuration persistence.
    2. Normalize lobby/status/runtime consumers around the persisted mode and current admission.
    3. Prove a waiting student cannot start, while an approved or resumable student can.

### Phase 1: Persist and Enforce Instructor Admission

**Goal:** A newly gated student appears in Waiting and cannot start until an instructor approves the current admission.

- [x] In `app/sentinel-api/src/modules/examination/configuration/services/save-exam-configuration.service.ts`, detect a resolved `AUTOMATIC` → `INSTRUCTOR_GATED` transition and, in the database operations as the configuration upsert, reset admission rows for students without an `IN_PROGRESS` attempt to `WAITING` with `decided_at`/`decided_by` cleared.
- [x] Extract the transition reset into an exported, JSDoc-documented helper/service under `app/sentinel-api/src/modules/examination/lobby/services/` so configuration persistence does not duplicate lobby query rules.
- [x] In `app/sentinel-api/src/modules/examination/lobby/services/check-in-lobby.ts`, preserve a genuine instructor decision in gated mode, upgrade to `APPROVED` only in automatic mode, and ensure conflict handling returns the row's authoritative post-conflict status rather than a stale insert result.
- [x] In `app/sentinel-api/src/modules/examination/lobby/services/get-admission-status.ts`, use the same resolved admission-mode rule as check-in and return `null`/`WAITING` for gated students without a current approval; do not synthesize approval from client state.
- [x] In `app/sentinel-api/src/modules/examination/access/services/evaluate-student-exam-eligibility.service.ts`, retain `resolveLobbyRuntimeAccess()` as the source of `lobby_waiting`, `lobby_rejected`, and `lobby_approved`, and add coverage that stale automatic approvals reset by the transition cannot produce `canStart: true`.
- [x] In `app/sentinel-api/src/modules/examination/flow/services/start-session.service.ts`, keep eligibility verification before `SessionRepository.createSession()` and surface a stable lobby reason code/message without creating an attempt.
- [x] In `app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/_hooks/use-lobby-state.ts`, treat `admissionStatus` plus refreshed `runtimeAccess` as authoritative; keep the entry button disabled during unknown/pending gated status and after rejection.
- [x] In `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/lobby/_hooks/use-instructor-lobby.ts`, invalidate/refetch the waiting list after decisions and verify a newly checked-in gated student is placed in the waiting collection.
- [x] Add API tests to `app/sentinel-api/src/modules/examination/configuration/configuration.service.test.ts`, `app/sentinel-api/src/modules/examination/lobby/services/check-in-lobby.test.ts`, `app/sentinel-api/src/modules/examination/access/access.test.ts`, and `app/sentinel-api/src/modules/examination/flow/flow.test.ts` for mode transition, waiting, rejection, approval, direct-start rejection, and active-attempt resume.
- [x] Add frontend tests to `app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/_hooks/use-lobby-state.test.tsx` and `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/lobby/_hooks/use-instructor-lobby.test.tsx` for unknown, waiting, rejected, approved, and refetched runtime states.
      **Migration required:** No — reuse `lobby_admission_mode`, `status`, `checked_in_at`, `decided_at`, and `decided_by`; active attempts protect legitimate resumptions.

## Done Criteria

- [x] Every new or reset gated admission appears in the instructor Waiting list.
- [x] No session row is created before gated approval.
- [x] Approval enables entry after runtime access refetch; rejection remains blocked.
- [x] Existing `IN_PROGRESS` attempts resume without demanding a second instructor approval.
- [x] All exported helpers have JSDoc and focused Vitest coverage.

## Additional Considerations

- **Breaking API changes:** None; preserve lobby DTO fields and runtime access reason codes.
- **New environment variables:** None.
- **Migration rollback:** Not applicable.
- **Concurrency:** Configuration transition and admission reset must be transactional so check-in cannot observe half-applied policy.
