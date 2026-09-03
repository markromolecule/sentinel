---
title: "Student Reconnect Attempts & Instructor Re-Entry Specification"
type: context
status: implemented
created: "2026-09-03"
tags: [context, examination, reconnect, lobby, instructor-override, lifecycle]
feature: "student-reconnect-and-instructor-reentry"
---

# Student Reconnect Attempts & Instructor Re-Entry Specification

## 1. Overview & Objective

### Problem Statement

Students attempting to enter an examination or returning to the lobby are prematurely encountering `403 Forbidden` errors with the message:
`"Maximum reconnect attempts reached for this exam session."`
even when it is their very first attempt entering the lobby or starting the examination. Furthermore, when students genuinely exhaust their reconnect limit or their attempt is locked by proctoring/system rules, instructors lack a unified, explicit, and reliable mechanism to authorize re-entry into the specific exam attempt screen.

### Root Cause Analysis (Verified Against Source Code)

1. **Conflation of Fresh Attempt Counts vs Reconnect Limits (`create-session.logic.ts:299-306`)**:
   In `handleFreshAttempt`:

   ```typescript
   const attemptCount = await countAttempts(db, examId, studentId);
   const maxSessionsAllowed = Math.max(1, maxReconnectAttempts + 1);

   if (!isFreshAttemptOverride && attemptCount >= maxSessionsAllowed) {
       throw new HTTPException(403, {
           message: 'Maximum reconnect attempts reached for this exam session.',
       });
   }
   ```

   - `maxReconnectAttempts` governs network drops/reconnections *within a single exam session*.
   - `countAttempts` counts all non-superseded attempt records in `exam_attempts`.
   - If `maxReconnectAttempts` is configured as `0` (or defaults low), `maxSessionsAllowed = 1`. If an existing row exists (e.g. from an uncompleted start, locked attempt, or prior session), fresh starts are blocked with a false `"Maximum reconnect attempts reached"` message instead of an appropriate attempt policy error.
   - If an attempt was locked or closed, `canResumeSameAttempt` evaluates to `false`, causing execution to fall through to `handleFreshAttempt`, where `attemptCount >= 1` falsely triggers the 403 reconnect error.

2. **Zero-Reconnect Strict Mode & Resumption Block (`create-session.logic.ts:247-251` & `runtime-access.service.ts:89-94`)**:
   In `RuntimeAccessService.resolveExamRuntimeAccess`:

   ```typescript
   const totalReconnectAttempts = args.maxReconnectAttempts ?? 0;
   const reconnectAttemptsRemaining = Math.max(
       0,
       totalReconnectAttempts - (args.reconnectAttemptCount ?? 0),
   );
   const canResumeActiveAttempt = hasActiveAttempt && reconnectAttemptsRemaining > 0;
   ```

   - When an exam is configured with `maxReconnectAttempts = 0`, `reconnectAttemptsRemaining = 0`.
   - Consequently, `canResumeActiveAttempt` is immediately `false`.
   - In `resumeLockedAttempt`:

     ```typescript
     if (!accessOverride && !isIdempotentResume && reconnectAttemptCount >= maxReconnectAttempts) {
         throw new HTTPException(403, {
             message: 'Maximum reconnect attempts reached for this exam session.',
         });
     }
     ```

     With `maxReconnectAttempts = 0`, `reconnectAttemptCount (0) >= 0` evaluates to `true` on the very first resume call!

3. **Stage Guard False Reconnect Bounce (`_stage-resolver.ts:133-139`)**:

   ```typescript
   if (isAttemptActive) {
       if (reconnectCount >= maxReconnect && !runtimeAccess?.canResume) {
           return {
               targetStage: 'lobby',
               reasonCode: 'MAX_RECONNECT_EXCEEDED',
               shouldRedirect: requestedStage !== 'lobby',
           };
       }
   ```

   - When `runtimeAccess` is unresolved or returns placeholder `0/0`, the stage resolver calculates `reconnectCount (0) >= maxReconnect (0)` and bounces the student back to the lobby with `reasonCode: 'MAX_RECONNECT_EXCEEDED'`.
   - If the student was routed from the lobby to the attempt page but the one-time `lobbyEntry` token was already consumed in StrictMode, `SESSION_MISMATCH` redirects them back to the lobby, where their newly-created attempt now blocks them from resuming.

4. **Ephemeral Reconnect Override Consumption (`create-session.logic.ts:266-273`)**:
   - When an instructor grants a reconnect override via `POST /:id/student-overrides/reconnect-override/:studentId`, it creates a `REOPEN` override with `allowedAttempts: 1`.
   - On the very first `startExamSession` call, `StudentOverridesService.markOverrideUsed` marks the override as used (`usedAttempts: 1`), but `ea.reconnect_attempt_count` is **never reset or decremented**.
   - As a result, the very next page refresh, tab switch, or transient network hiccup immediately locks the student out again.

### Business & User Value

- Eliminates false exam lockouts for first-time students entering the lobby and attempt screens.
- Establishes a transparent, predictable reconnect quota lifecycle for students.
- Empowers instructors with explicit, one-click controls in both the Lobby and Live Monitoring dashboards to authorize re-entry and reset/extend reconnect headroom without requiring database intervention.

### Success Criteria

- Students on their initial attempt can navigate through Instruction → Privacy → Checkup → Lobby → Attempt without triggering a 403 reconnect error.
- An exam configured with `maxReconnectAttempts: 0` allows the student to complete their initial start and session navigation without being blocked by reconnect checks.
- When reconnect attempts are genuinely exhausted, the student sees clear guidance in the lobby explaining that instructor authorization is required.
- The instructor can view locked/reconnect-exhausted students in both the Lobby queue and Monitoring dashboard and authorize re-entry with a single click, granting fresh reconnect headroom and unblocking the student immediately.

---

## 2. Requirements & User Stories

### User Stories

- **US-01 (Student First-Time Entry):** As a student entering an exam for the first time, I want to proceed through the lobby and enter the examination page smoothly, so that I can begin my exam without false "max reconnect" errors.
- **US-02 (Student Legitimate Disconnect & Reconnect):** As a student taking an exam whose internet connection drops, I want to return to the lobby and resume my active attempt if I have reconnect attempts remaining.
- **US-03 (Student Reconnect Depletion):** As a student who has exhausted my reconnect limit, I want to be informed clearly in the lobby and be able to wait for my instructor to approve my re-entry.
- **US-04 (Instructor Explicit Re-entry Authorization):** As an instructor in the lobby or monitoring dashboard, I want to explicitly grant re-entry and reset or increase reconnect headroom for a locked student, so that they can re-enter their attempt immediately.

### Functional Requirements

- [ ] **FR-01 (Decouple Attempt Limits from Reconnect Limits):** Remove `maxSessionsAllowed = Math.max(1, maxReconnectAttempts + 1)` from `handleFreshAttempt` in `create-session.logic.ts`. Fresh attempt allowance must be governed strictly by exam attempt limits and explicit `MAKEUP`/`RETAKE` access overrides.
- [ ] **FR-02 (Zero-Reconnect Policy Semantic Alignment):** Clarify and align `maxReconnectAttempts = 0`. If `maxReconnectAttempts = 0`, it means zero *reconnections* after an initial session start, but must NEVER prevent the initial session start or idempotent navigation between lobby and attempt.
- [ ] **FR-03 (Durable Reconnect Headroom on Override):** When an instructor grants a reconnect override, `ea.reconnect_attempt_count` must be reset to `0` or decremented, or an explicit additional allowance (e.g. +3 attempts) must be stored on the attempt, rather than relying solely on a single-use access override record.
- [ ] **FR-04 (Unified Instructor Re-entry Action):** Provide an explicit "Authorize Re-entry / Admit" action on:
  - The Instructor Lobby Waiting Queue (`InstructorLobbyAdmissionPanel`).
  - The Instructor Live Monitoring Student Detail Drawer (`use-monitoring`).
  - Action must:
    1. Set admission status to `APPROVED`.
    2. Unlock `ea.lifecycle_state = 'IN_PROGRESS'` if locked/closed.
    3. Reset or extend `ea.reconnect_attempt_count`.
    4. Broadcast realtime event (`student:reentry_authorized`) to instantly unblock the student.
- [ ] **FR-05 (Lobby UI Accuracy):** Correct `resolveReconnectDisplay` and `LobbyStatusInfo` to reflect remaining reconnect attempts truthfully without flashing placeholder `0/0` during initial load.

---

## 3. Technical & Architectural Context

### Affected Components & Layers

- **API Flow Layer:**
  - `app/sentinel-api/src/modules/examination/flow/data/_logic/create-session.logic.ts`
  - `app/sentinel-api/src/modules/examination/flow/services/start-session.service.ts`
- **API Runtime Access & Eligibility:**
  - `app/sentinel-api/src/modules/examination/runtime-access/runtime-access.service.ts`
  - `app/sentinel-api/src/modules/examination/access/services/evaluate-student-exam-eligibility.service.ts`
  - `app/sentinel-api/src/modules/examination/access/services/resolve-student-override-access.ts`
- **API Student Overrides & Lifecycle:**
  - `app/sentinel-api/src/modules/examination/student-overrides/student-overrides.service.ts`
  - `app/sentinel-api/src/modules/examination/student-overrides/controllers/override-reconnect-limit.controller.ts`
  - `app/sentinel-api/src/modules/examination/lifecycle/services/grant-reopen-attempt-window.ts`
- **Web Student Lobby & Attempt Flow:**
  - `app/sentinel-web/src/app/(protected)/student/exam/[id]/_lib/student-exam-flow/_stage-resolver.ts`
  - `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-student-exam-stage-guard.ts`
  - `app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/_hooks/use-lobby-state.ts`
  - `app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/_hooks/use-lobby-actions.ts`
  - `app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/_utils/index.ts`
- **Web Instructor Controls:**
  - `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/lobby/_components/instructor-lobby-admission-panel.tsx`
  - `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/lobby/_hooks/use-instructor-lobby.ts`
  - `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/monitoring/_hooks/use-monitoring/use-lifecycle.ts`

---

## 4. Grilling Decision Ledger & Invariants

| ID | Decision Topic | Status | Chosen Approach | Rationale & Trade-offs |
| :--- | :--- | :--- | :--- | :--- |
| **DEC-01** | Conflation of attempt count and reconnect limits | **Approved** | Decouple completely: `handleFreshAttempt` only checks max allowed attempts (default 1) and retake/makeup overrides. Reconnect limit only checks in `handleResume`. | Prevents initial attempts from ever being blocked with reconnect errors. |
| **DEC-02** | Instructor Re-entry Mechanism | **Approved (Option A)** | **Unified 1-Click "Authorize Re-entry & Reset Reconnects":** Atomically resets `reconnect_attempt_count = 0`, unlocks attempt (`lifecycle_state = 'IN_PROGRESS'`), sets lobby admission to `APPROVED`, and broadcasts real-time event to unblock student. Available in both Lobby Queue and Monitoring Drawer. | Eliminates multi-step friction and immediately unblocks locked students without secondary failure. |
| **DEC-03** | Durable Reconnect Counter after Override | **Approved** | Mutate `exam_attempts.reconnect_attempt_count = 0` in database upon instructor authorization rather than solely consuming an ephemeral single-use override record. | Prevents immediate subsequent lockouts when student refreshes the browser after an override. |
| **DEC-04** | Zero-Reconnect Policy & Initial Grace | **Approved (Option A)** | `maxReconnectAttempts = 0` is treated as strict proctor mode (0 unapproved mid-test reconnects). Initial entry, lobby-to-attempt navigation, and idempotent resumes do NOT count as reconnects and are never blocked by 0 >= 0. Disconnects hold students in lobby awaiting instructor authorization. | Honors strict zero-disconnect exams while eliminating false launch-time lockouts. |
| **DEC-05** | Incident & Violation Clearance on Re-entry | **Approved (Option A)** | Clicking "Authorize Re-entry" atomically clears the active lock (`lifecycle_state = 'IN_PROGRESS'`), appends an audit event (`REOPENED_BY_INSTRUCTOR`), and unblocks the student while preserving all historical violation telemetry in the database for proctoring audits. | Frictionless 1-click recovery for instructors during live exams without losing violation forensics. |

---

## 5. Scope & Boundaries

### In Scope

- Fixing the false 403 max reconnect lockout in `create-session.logic.ts`, `runtime-access.service.ts`, and `_stage-resolver.ts`.
- Implementing durable reconnect counter resets/extensions when an override is granted.
- Unifying the instructor UI in the Lobby and Monitoring dashboard to provide an explicit "Authorize Re-entry" action for locked or reconnect-depleted students.
- Real-time notification and optimistic unlocking in the student lobby upon instructor authorization.

### Out of Scope / Non-Goals

- Changing the examination scoring or grading engines.
- Modifying student question shuffling or answer submission serialization.
- Altering external LMS roster sync (Google Classroom / Canvas).
