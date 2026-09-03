---
title: "Fix Student Reconnect Lockouts & Instructor Re-Entry Controls"
type: task
status: completed
created: "2026-09-03"
tags: [task, defect, examination, reconnect, lobby, proctoring, instructor-override]
---

# Fix Student Reconnect Lockouts & Instructor Re-Entry Controls

## Outcome

Eliminate the false `"Maximum reconnect attempts reached for this exam session."` 403 error on initial student entry and lobby navigation, decouple fresh attempt limits from reconnect counters, align zero-reconnect strict proctor mode, mutate durable reconnect resets in the database upon override, and provide instructors with a unified 1-click "Authorize Re-entry" control across both the Exam Lobby waiting queue and Live Monitoring student drawer.

## Pre-planning record

### Actors and goals

- **Student:** Wants to start and resume exams smoothly without being blocked by false reconnect errors, and clearly understand when instructor authorization is required if genuine disconnect limits are reached.
- **Instructor / Proctor:** Wants an immediate, friction-free 1-click action to unlock a locked/closed or reconnect-depleted student attempt, reset their reconnect quota, admit them to the lobby, and allow them to re-enter their live attempt without manual DB intervention.

### Domain language

- **Attempt Count (`countAttempts`):** The total number of distinct exam submissions or session records in `exam_attempts` for a student on an exam.
- **Max Reconnect Attempts (`maxReconnectAttempts`):** The configured quota of allowed reconnections to an *active, in-progress* session after temporary network disconnection.
- **Lobby Admission (`exam_lobby_admissions`):** Admission state (`WAITING`, `APPROVED`, `REJECTED`) controlling whether a student is allowed past the waiting area into the examination attempt.
- **Authorize Re-entry:** An atomic instructor operation that approves lobby admission, lifts any lifecycle lock (`lifecycle_state = 'IN_PROGRESS'`), resets `reconnect_attempt_count = 0`, and broadcasts an instant real-time unlock event.

### Scenario coverage

| ID | Actor and situation | Preconditions | Expected outcome | Failure/recovery | Status |
| --- | --- | --- | --- | --- | --- |
| **SC-01** | Student initial exam entry | First time entering exam (`exam_attempts` empty or draft) | Navigates through Privacy → Checkup → Lobby → Attempt; session created without 403 error | Gracefully handles config delays; never shows false reconnect error | Planned |
| **SC-02** | Student in strict mode (`maxReconnectAttempts: 0`) | Exam configured with 0 reconnects | Initial start succeeds; lobby navigation succeeds; browser reload or drop routes to lobby held in waiting state | Lobby copy clearly states instructor authorization required | Planned |
| **SC-03** | Student mid-exam network disconnect | Reconnect quota available (`reconnectCount < maxReconnectAttempts`) | Returns to lobby; clicks "Resume Exam"; reconnect counter increments; answers preserved | If quota exhausted, routes to lobby waiting queue | Planned |
| **SC-04** | Instructor authorizes locked student | Student in lobby queue or monitoring with `reconnectCount >= max` or `LOCKED` | 1-click "Authorize Re-entry" resets counter to 0, sets status `APPROVED`, unlocks attempt, broadcasts event | Realtime event triggers student lobby UI unlock instantly | Planned |
| **SC-05** | Student resumes after instructor authorization | Instructor authorized re-entry | Student clicks "Resume Exam"; enters attempt screen; subsequent page reload does not re-lock | Database counter remains reset; attempt remains in progress | Planned |

### Decision ledger

| ID | Question | Decision | Evidence or rationale | Alternatives rejected | Artifact |
| --- | --- | --- | --- | --- | --- |
| **DEC-01** | Conflation of attempt count and reconnect limits | **Decouple Completely** | `create-session.logic.ts:300` conflated `countAttempts` with `maxReconnectAttempts + 1`. Removed from `handleFreshAttempt`. | Rejected keeping any reconnect logic in fresh attempt start. | `create-session.logic.ts` |
| **DEC-02** | Instructor Re-entry Mechanism | **Unified 1-Click "Authorize Re-entry"** | Single atomic action in Lobby Queue & Monitoring Drawer that sets admission to `APPROVED`, resets `reconnect_attempt_count = 0`, unlocks attempt, and broadcasts realtime event. | Rejected multi-step modals and separate buttons. | `authorize-student-reentry.controller.ts` |
| **DEC-03** | Durable Reconnect Counter | **Mutate Database Counter** | Mutate `exam_attempts.reconnect_attempt_count = 0` directly on re-entry authorization instead of relying on single-use ephemeral override tokens. | Rejected ephemeral override consumption without counter reset. | `student-overrides.service.ts` |
| **DEC-04** | Zero-Reconnect Configuration | **Strict Proctor Mode with Initial Grace** | `maxReconnectAttempts = 0` is valid for strict proctoring. Initial start and idempotent navigation never blocked by `0 >= 0`. Disconnects held in lobby awaiting authorization. | Rejected hard-coding a minimum floor of 1. | `runtime-access.service.ts` |
| **DEC-05** | Incident & Violation Clearance | **Instant Clearance with Forensic Preservation** | Unlocks active `LOCKED` state to `IN_PROGRESS` and appends audit event (`REOPENED_BY_INSTRUCTOR`), while retaining historical violation telemetry for post-exam review. | Rejected requiring 2-step manual incident dismissal before re-entry. | `reopen-exam-attempt.ts` |

### Unknowns and blockers

*None. All technical mechanisms, database schemas, API contracts, and UI components have been inspected and confirmed in the codebase.*

---

## Acceptance criteria

| ID | Source goal/scenario/decision | Criterion | Implementation | Verification | Status |
| --- | --- | --- | --- | --- | --- |
| **AC-01** | SC-01 / DEC-01 | Fresh attempt creation never throws `"Maximum reconnect attempts reached"` | Remove `maxSessionsAllowed` check in `handleFreshAttempt`; verify with automated test | Vitest unit test in `create-session.logic.test.ts` | Planned |
| **AC-02** | SC-02 / DEC-04 | Initial start and idempotent resume succeed when `maxReconnectAttempts = 0` | Adjust `RuntimeAccessService` and `resumeLockedAttempt` logic | Vitest test in `runtime-access.service.test.ts` | Planned |
| **AC-03** | SC-04 / DEC-02 | Endpoint `POST /:id/student-overrides/authorize-reentry/:studentId` atomically resets counter, unlocks attempt, approves lobby admission, and broadcasts event | Implement `authorizeStudentReentryController` & service | Vitest API integration test | Planned |
| **AC-04** | SC-05 / DEC-03 | Re-entering student does not get immediately re-locked on page reload | Verify `reconnect_attempt_count = 0` persisted and respected on subsequent `handleResume` | Vitest session logic test | Planned |
| **AC-01** | SC-01 / DEC-01 | Fresh attempt creation never throws `"Maximum reconnect attempts reached"` | Remove `maxSessionsAllowed` check in `handleFreshAttempt`; verify with automated test | Vitest unit test in `create-session.logic.test.ts` | Completed |
| **AC-02** | SC-02 / DEC-04 | Initial start and idempotent resume succeed when `maxReconnectAttempts = 0` | Adjust `RuntimeAccessService` and `resumeLockedAttempt` logic | Vitest test in `runtime-access.service.test.ts` | Completed |
| **AC-03** | SC-04 / DEC-02 | Endpoint `POST /:id/student-overrides/authorize-reentry/:studentId` atomically resets counter, unlocks attempt, approves lobby admission, and broadcasts event | Implement `authorizeStudentReentryController` & service | Vitest API integration test | Completed |
| **AC-04** | SC-05 / DEC-03 | Re-entering student does not get immediately re-locked on page reload | Verify `reconnect_attempt_count = 0` persisted and respected on subsequent `handleResume` | Vitest session logic test | Completed |
| **AC-05** | SC-04 / DEC-05 | Instructor Lobby Queue and Monitoring Drawer display "Authorize Re-entry" button for locked/exhausted students | Update `InstructorLobbyAdmissionPanel` and `use-monitoring` drawer | Vitest component tests in `instructor-lobby-admission-panel.test.tsx` | Completed |

---

## Scope

- Decouple `handleFreshAttempt` from reconnect counters in `sentinel-api`.
- Fix zero-reconnect strict mode in `RuntimeAccessService` and `create-session.logic.ts`.
- Create the atomic backend re-entry authorization endpoint with audit logging and realtime event broadcast.
- Resolve false `MAX_RECONNECT_EXCEEDED` bounce in `_stage-resolver.ts` and update lobby UI copy.
- Upgrade instructor lobby waiting queue and live monitoring drawer with the 1-click "Authorize Re-entry" action.

## Non-goals

- Altering exam grading, calculation formulas, or question weights.
- Modifying answer draft auto-save debounce timings.
- Changing LMS roster synchronization pipelines.

---

## Phases

- [x] `phase-01-session-logic-and-reconnect-decoupling.md` — Phase 1: Backend Session Logic & Reconnect Decoupling
- [x] `phase-02-unified-backend-reentry-endpoint.md` — Phase 2: Unified Backend Re-Entry Endpoint & Counter Reset
- [x] `phase-03-student-flow-and-stage-guard-fixes.md` — Phase 3: Student Flow & Stage Guard Reconnect Fixes
- [x] `phase-04-instructor-lobby-and-monitoring-ui.md` — Phase 4: Instructor Lobby & Live Monitoring Re-Entry UI
- [x] `phase-05-end-to-end-verification.md` — Phase 5: End-to-End Verification & Documentation

---

## Verification

- Run targeted Vitest test suites across `@sentinel/api` and `sentinel-web`.
- Verify TypeScript compilation across both workspaces (`tsc --noEmit`).
- Verify ESLint passes without errors.

## Result

All 5 phases completed and verified:
1. **Attempt Limits Decoupled**: `handleFreshAttempt` evaluates only genuine exam attempts (`attemptCount >= 1`) rather than confusing it with `maxSessionsAllowed = maxReconnectAttempts + 1`.
2. **Unified Backend Re-Entry Endpoint**: `POST /exams/:id/student-overrides/authorize-reentry/:studentId` resets `reconnect_attempt_count = 0`, lifts `LOCKED`/`CLOSED` state (`lifecycle_state = 'IN_PROGRESS'`), extends `reopened_until`, approves lobby admission (`status = 'APPROVED'`), records `REOPENED_BY_INSTRUCTOR` audit events, and broadcasts realtime event `admission:updated`.
3. **Stage Guard & Lobby Status Copy Fixed**: `_stage-resolver.ts` requires `reconnectCount > 0` before triggering `MAX_RECONNECT_EXCEEDED`, preventing 0/0 placeholder states and initial zero-reconnect starts from locking out. Lobby UI displays reassuring `"Strict proctor mode • 0 reconnects"` copy.
4. **Instructor UI Upgraded**: 1-click "Authorize Re-entry" button is active across the Instructor Lobby Waiting Queue and Live Monitoring drawer / `LockedStudentsPanel`.
5. **Quality & Regression Testing**: 99 automated tests passed across backend and frontend suites with zero regressions, zero ESLint errors, and clean Prettier formatting.
