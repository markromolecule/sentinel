---
title: "Fix Exam Result Score Inconsistency, Lobby Re-entry Actions, and Real-Time Student Progress Tracking"
type: context
status: ready
created: "2026-09-06"
tags: [context, bugfix, scoring, lobby, reentry, progress, realtime, monitoring]
feature: "lobby-reentry-result-score-student-progress"
---

# Fix Exam Result Score Inconsistency, Lobby Re-entry Actions, and Real-Time Student Progress Tracking Context Specification

## 1. Overview & Objective

- **Problem Statement:**
  1. **Result Page Pre- vs. Post-Turn-In Score Mismatch:** During the exam turn-in flow on the student result page (`/student/exam/[id]/result`), the score card initially displays `2 / 8` (25%). When the student clicks the "Turn In" button, the score suddenly jumps to `5 / 8` (63%) while transitioning to "Turning In...". This discrepancy is caused because the preparation endpoint (`/examination/flow/prepare`) does not run the deterministic essay rubric evaluation engine, whereas the completion endpoint (`/examination/flow/complete`) runs `evaluateEssayWithRubric` and awards 3 points to the essay.
  2. **Exam Lobby Button Redundancy for Reconnecting Students:** In the instructor's exam lobby (`/exams/[id]/lobby`), students waiting for re-entry (reconnecting after lockout or connection drop) display redundant and confusing action buttons: both the orange `Authorize Re-entry` button and the standard `Admit` and `Reject` buttons are rendered simultaneously on the student card. For reconnecting students, only `Authorize Re-entry` should be displayed, while first-time entry students should display `Admit` and `Reject`.
  3. **Student Progress Discrepancy & Low-Latency Live Tracking:** While a student has completed 4/4 questions (100% progress on the student screen), the instructor monitoring view (`/exams/[id]/monitoring/[studentId]`) remains frozen at 25% (1/4 questions answered), only jumping to 100% when the attempt is finally submitted. This occurs because:
     - The student-level monitoring detail page (`[studentId]/page.tsx`) does not subscribe to the low-latency Supabase Realtime broadcast channel (`exam:${examId}:monitoring`), unlike the overview page.
     - When a student experiences a temporary lockout or re-entry, 409 responses from `syncExamProgress` latch `isTerminallyBlockedRef` and `localBlockedMessage` on the student client, permanently suppressing subsequent debounced progress syncs to PostgreSQL until turn-in.

- **Business / User Value:**
  - Ensures reliable and trustworthy score reporting to students prior to finalizing their submission.
  - Clarifies instructor actions in the exam lobby to prevent accidental standard admission of students who require managed re-entry authorization.
  - Provides instructors with accurate, sub-50ms real-time progress visibility for individual students during live examinations without incurring heavy PostgreSQL database polling or network bottlenecks.

- **Success Criteria:**
  - The student result page displays the exact same computed score snapshot before clicking "Turn In" as it does after completion (e.g. `5 / 8` consistently).
  - In the exam lobby waiting queue:
    - Reconnecting students (active attempt / re-entry required) display ONLY the `Authorize Re-entry` action button.
    - First-time joining students display ONLY the `Admit` and `Reject` action buttons.
  - The student detail monitoring view (`/exams/[id]/monitoring/[studentId]`) subscribes to the ephemeral realtime progress broadcast and reflects the student's current progress in real time (<50ms latency) as answers are selected.
  - After re-entry authorization, student attempt state cleanly resets blocked sync latches so both realtime broadcast and debounced database progress persistence resume uninterrupted.

---

## 2. Requirements & User Stories

### User Stories / Scenarios

- **US-01 (Consistent Turn-In Preview):**
  *As a student reviewing my exam results before final submission, I want the pre-turn-in score and grade to match the finalized attempt score, so that I am not confused by sudden score jumps when clicking "Turn In".*

- **US-02 (Clear Lobby Re-entry Controls):**
  *As an instructor admitting students from the exam lobby, I want reconnecting students to show only "Authorize Re-entry" and fresh students to show "Admit" and "Reject", so that I never execute the wrong admission action for returning students.*

- **US-03 (Accurate Real-Time Progress Monitoring):**
  *As an instructor inspecting an active student's live feed and timeline, I want to see their live progress update instantaneously as they answer questions, without relying on slow database polling or experiencing frozen progress bars.*

### Functional Requirements

1. **Deterministic Essay Pre-Scoring in Session Preparation (`sentinel-api`):**
   - In `prepareSessionService` (`app/sentinel-api/src/modules/examination/flow/services/prepare-session.service.ts`):
     - Identify any questions where `type === 'ESSAY'`.
     - Execute `evaluateEssayWithRubric(studentAnswer, prompt, rubric.definition)` for each submitted essay response matching `complete-session.scoring.ts`.
     - Calculate `calculateEssayWeightedScore(evaluation.scores, question.points, rubric.definition)`.
     - Pass `evaluations: essayEvaluations` into `buildScoreSnapshot()`.
     - Verify that `prepareSession` and `completeSession` return identical score snapshots for identical answers and elapsed time.

2. **Conditional Action Rendering in Instructor Lobby (`sentinel-web`):**
   - In `InstructorLobbyAdmissionPanel` (`app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/lobby/_components/instructor-lobby-admission-panel.tsx`):
     - Check `needsReentry` (`isLockedOrExhausted || student.hasActiveAttempt`).
     - When `needsReentry && onAuthorizeReentry` is true: render ONLY the `Authorize Re-entry` button.
     - When `needsReentry` is false: render the `Admit` and `Reject` buttons.

3. **Student Detail Monitoring Real-Time Subscription (`sentinel-web`):**
   - In `StudentMonitoringPage` (`app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/monitoring/[studentId]/page.tsx`):
     - Integrate `useMonitoringRealtime({ examId, onProgressUpdate, onStudentSubmitted })`.
     - When `student:progress` broadcast is received matching the active student (`payload.studentId === student.id || payload.studentId === student.studentRecordId`):
       - Update the student's live progress state immediately with zero DB latency.
     - When `student:submitted` broadcast is received:
       - Immediately update the student's status and lifecycle state to `submitted` / `SUBMITTED` and progress to `100%`.

4. **Lifecycle Unblock on Re-entry & Resume (`sentinel-web`):**
   - In `useAttemptSync` / `useAttemptSyncCoordinator` / `useAttemptBlockedState`:
     - When an attempt transition resumes active state (e.g. re-entry authorization acknowledged, or fresh session resumption), clear `localBlockedMessage` and reset `isTerminallyBlockedRef.current = false`.
     - Ensure debounced progress sync continues to update `answered_question_count` in PostgreSQL for persistent history.

### Edge Cases & Failure Modes

- **Zero Answers Selected:** Pre-scoring handles empty strings or nulls safely (assigning Level 0 across rubric criteria with 0 awarded points).
- **Exam without Essay Questions:** All-objective exams continue to score identically in both `prepare` and `complete`.
- **WebSocket Disconnection:** If Supabase Realtime channel drops, the monitoring page's existing 8-second HTTP query (`refetchInterval: 8000`) serves as a durable fallback.
- **Multiple Reconnects / Re-entries:** Authorizing re-entry repeatedly resets reconnect counts and cleanly unlocks client sync each time.

---

## 3. Technical & Architectural Context

### Affected Domains & Packages

- **`app/sentinel-api`:**
  - `src/modules/examination/flow/services/prepare-session.service.ts`: Add essay rubric evaluation to build matching `scoreSnapshot`.
- **`app/sentinel-web`:**
  - `src/app/(protected)/(instructor)/exams/[id]/lobby/_components/instructor-lobby-admission-panel.tsx`: Render only `Authorize Re-entry` when `needsReentry`.
  - `src/app/(protected)/(instructor)/exams/[id]/monitoring/[studentId]/page.tsx`: Subscribe to `useMonitoringRealtime` for instant progress & turn-in updates.
  - `src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/use-attempt-sync-coordinator.ts`: Enable clean unblocking upon session resumption.
  - `src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/use-attempt-blocked-state.ts`: Expose reset mechanism for `localBlockedMessage`.

### Security & Authorization Boundaries

- `prepareSessionService` runs within the student's authenticated session context and verifies attempt ownership (`assertAttemptCanBePrepared`).
- Real-time broadcasts use existing authorized Supabase presence/broadcast channels scoped to `exam:${examId}:monitoring`.
- Re-entry authorization remains strictly restricted to authorized exam instructors/admins.

---

## 4. UI/UX & Interaction Guidelines

- **Result Score Hero & Metrics:** Displays consistent score and grade without sudden jumps during the "Turning In..." button transition.
- **Exam Lobby Queue Cards:**
  - Reconnecting students: single full-width high-visibility button `Authorize Re-entry` (amber).
  - New students: split dual buttons `Admit` (primary) and `Reject` (outline).
- **Student Monitoring Detail:** Progress bar and percentage animate smoothly to latest student progress with zero lag.

---

## 5. Scope & Boundaries

- **In Scope:**
  - Parity between `prepareSessionService` and `completeSessionService` for essay rubric scoring.
  - Gating lobby buttons based on `needsReentry`.
  - Adding `useMonitoringRealtime` to the student monitoring detail view.
  - Unblocking student sync coordinators upon re-entry resumption.
- **Out of Scope:**
  - Modifying rubric evaluation criteria heuristics or weights.
  - Changes to grading workspace override functionality.

---

## 6. References & External Context

- Context Spec: `docs/context/September/6/essay-rubric-prescoring.md`
- Context Spec: `docs/context/September/6/monitoring-counts-essay-prescoring-progress-accuracy.md`
- Implementation Task: `docs/tasks/2026/09/2026-09-06/essay-rubric-prescoring/`
- Implementation Task: `docs/tasks/2026/09/2026-09-06/monitoring-counts-essay-prescoring-progress-accuracy/`
