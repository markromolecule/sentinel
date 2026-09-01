---
title: "Exam Lobby Synchronization, Admission State, and Attempt Anomaly Remediation"
type: context
status: ready
created: "2026-09-01"
tags: [context, grill, examination, lobby, realtime, telemetry, proctoring]
feature: "exam-lobby-and-attempt-anomaly-remediation"
---

# Exam Lobby Synchronization, Admission State, and Attempt Anomaly Remediation Context Specification

## 1. Overview & Objective

During active exam lobbies and attempt sessions, several synchronization, admission filtering, and anomaly telemetry bugs occur:

1. **Inflated Student Lobby Count:** The lobby count in the student lobby displays `2` when only `1` student is waiting.
2. **Instructor Lobby Production Realtime Sync:** In production, the instructor lobby page does not reliably show students currently in the lobby because the backend REST broadcast endpoint was posting to `lobby:${examId}` instead of the Supabase JS client's WebSocket channel topic `realtime:lobby:${examId}`.
3. **Student vs. Instructor Reconnect Count Divergence:** The student lobby displays stale reconnect counts (`0 used • 3 left`) while the instructor lobby displays the accurate count (`1/3 reconnects`).
4. **Submitted Students Misclassified in Instructor Lobby:** When a student submits their attempt, they are categorized into the `Approved` column instead of the `Submitted` column in the instructor lobby.
5. **Screenshot Anomaly Notification & Double Count:** Taking a screenshot triggers two separate `PRINT_SCREEN_ATTEMPT` events (count = 2 for 1 trigger) because both keyboard and window blur listeners fire independently, and the student attempt view lacks a dedicated visible in-attempt anomaly warning dialog matching the MediaPipe anomaly experience.

### Measurable Success Criteria
- **Student Lobby Count:** Accurately reflects only distinct active students waiting or approved in the lobby (excluding instructors, duplicate presence connections, and submitted students).
- **Instructor Lobby Live Sync (Zero Polling):** Displays newly checked-in students instantly (<50ms) via Supabase Realtime broadcast by fixing the `realtime:` topic prefix mismatch, preserving the zero-polling architecture to prevent database traffic and pool starvation.
- **Reconnect Limit & Count Accuracy:** The student lobby and instructor lobby display identical, accurate reconnect counts based on the student's latest active attempt record and exam configuration.
- **Submitted Students Partitioning:** Submitted students (`status === 'COMPLETED'` or `lifecycle_state === 'SUBMITTED'`) are strictly partitioned into the `Submitted` column in the instructor lobby and excluded from active lobby waiting counts.
- **Screenshot Telemetry & Dialog Warning:** Single physical screenshot actions emit exactly one `PRINT_SCREEN_ATTEMPT` event. An in-attempt Incident Dialog (matching the MediaPipe alert style) explicitly warns the student and requires acknowledgement, and restores fullscreen security locking if fullscreen was lost.

---

## 2. Root Cause Analysis & Technical Evidence

### Issue 1: Student Lobby Count Shows 2 for 1 User
- **Backend `getLobbyCount` (`app/sentinel-api/.../get-lobby-count.ts`):** Left-joins `exam_attempts` on `ea.status = 'IN_PROGRESS'`. For students who have submitted (`ea.status = 'COMPLETED'`), `ea.attempt_id` is null, so submitted students with `ela.status = 'APPROVED'` are falsely counted as active lobby participants.
- **Frontend Presence Tracking (`use-lobby-presence.ts` & `use-lobby-realtime.ts`):** Both hooks subscribe to `lobby:${examId}` and track presence. Furthermore, instructors on the lobby page track presence with `user.id`, causing `presenceCount` to count instructors and duplicate channels.

### Issue 2: Instructor Lobby in Production Not Showing Students
- **Realtime Topic Prefix Mismatch:** In Supabase Realtime Phoenix protocol, `@supabase/supabase-js` clients subscribe to `realtime:${channelName}` (`realtime:lobby:${examId}`). The backend `broadcastLobbyEvent` helper was POSTing to `${SUPABASE_URL}/realtime/v1/api/broadcast` with `topic: 'lobby:${examId}'` without the `realtime:` prefix. The Supabase server delivered to Phoenix topic `lobby:...`, which client WebSockets never received.

### Issue 3: Reconnect Count Desynchronization
- **Student Lobby `runtimeAccess` Refresh:** `useLobbyState` reads `runtimeAccess` from exam details. When student is in the lobby or resumes, `evaluateStudentExamEligibility` calculates reconnect limits based on `latestAttempt.reconnect_attempt_count`. If exam query is not refetched upon admission status changes or if `resolveReconnectDisplay` falls back to placeholder defaults, the UI displays `0 used` instead of the actual `reconnect_attempt_count`.

### Issue 4: Submitted Students Shown Under Approved Column
- **Column / Status Mismatch in `get-waiting-list.ts` vs `lobby-admission-filters.ts`:**
  - `get-waiting-list.ts` selects `ea.status` (which is `'COMPLETED'`), not `'SUBMITTED'`.
  - `getLobbyAdmissionGroups` in `lobby-admission-filters.ts` filters `submittedStudents` where `student.attemptStatus === 'SUBMITTED'` and `approvedStudents` where `student.attemptStatus !== 'SUBMITTED'`.
  - Because `'COMPLETED' !== 'SUBMITTED'`, submitted students bypass the submitted filter and land in `approvedStudents`.

### Issue 5: Screenshot Anomaly Double Count & Warning Dialog
- **Double Event Emission:** `useKeyboardListener` captures the key combination and updates `lastCaptureModifierAtRef`. The OS screenshot tool causes window blur, triggering `useFocusListener`, which sees `captureModifierDetected = true` and emits a second `PRINT_SCREEN_ATTEMPT` event.
- **Missing Anomaly Warning Dialog:** While MediaPipe incidents display `MediaPipeIncidentDialog`, screenshot incidents only trigger a toast notification (which is hidden under HTML5 fullscreen) and security lock.

---

## 3. Requirements & User Stories

### User Stories
- **As an instructor**, I want to see students appear in the lobby queue immediately upon check-in via instant Realtime broadcasts without requiring background polling or manual refreshes.
- **As an instructor**, I want submitted students to appear exclusively under the `Submitted` column, so that I have an accurate overview of student progress.
- **As a student in the lobby**, I want to see the accurate lobby count and my exact remaining reconnect attempts, so that I understand my session status.
- **As a student in an active exam**, I want clear and accurate in-attempt warnings when a screenshot attempt is detected, and I want single physical actions to produce exactly one incident record.

### Functional Requirements
- [ ] **Lobby Count:** Fix `getLobbyCount` in backend to count distinct active students (`COUNT(DISTINCT ela.student_id)`) with `ela.status IN ('WAITING', 'APPROVED')` excluding any students who have completed/submitted attempts (`lifecycle_state = 'SUBMITTED'` or `status = 'COMPLETED'`).
- [ ] **Presence Deduplication:** Ensure instructor presence is excluded from student lobby count, and eliminate duplicate presence tracking in student lobby hooks.
- [ ] **Instructor Lobby Realtime Broadcast Fix:** In `broadcast-lobby-event.ts`, format the broadcast topic with `realtime:` prefix (`realtime:lobby:${examId}`) so messages are delivered directly to client WebSockets with 0 background polling.
- [ ] **Lobby Admission Partitioning:** In `get-waiting-list.ts`, select `lifecycle_state` and normalize `attemptStatus` to `'SUBMITTED'` for both `'COMPLETED'` and `'SUBMITTED'`. Update `lobby-admission-filters.ts` to recognize both `'COMPLETED'` and `'SUBMITTED'` as submitted.
- [ ] **Reconnect Sync:** Ensure `useLobbyState` and `evaluateStudentExamEligibility` return and display the actual attempt `reconnect_attempt_count` in both student and instructor views.
- [ ] **Screenshot Deduplication:** Synchronize `lastPrintScreenIncidentAtRef` and `lastCaptureModifierAtRef` across keyboard and focus listeners with a shared debounce lock to prevent duplicate `PRINT_SCREEN_ATTEMPT` emissions for a single screenshot action.
- [ ] **In-Attempt Screenshot Warning Dialog:** Implement a dedicated in-attempt Incident Dialog (matching `MediaPipeIncidentDialog`) that explicitly informs the student that a screenshot attempt was detected and logged, while preserving fullscreen security locking.

---

## 4. Technical & Architectural Context

- **Affected Layers:**
  - `app/sentinel-api`: `broadcast-lobby-event.ts`, `lobby.service.ts`, `get-lobby-count.ts`, `get-waiting-list.ts`, `evaluate-student-exam-eligibility.service.ts`
  - `packages/hooks`: `use-lobby-realtime.ts`
  - `app/sentinel-web`: `lobby-admission-filters.ts`, `use-instructor-lobby.ts`, `use-lobby-presence.ts`, `use-keyboard-listener.ts`, `use-focus-listener.ts`, `AttemptView.tsx`, `IncidentDialog`

---

## 5. Scope & Boundaries

### In Scope
- Fixing database queries for lobby count and waiting list partition states.
- Correcting Supabase Realtime broadcast topic formatting for instant live delivery with 0 polling.
- Deduplicating screenshot incident triggers and adding fullscreen-compatible warning dialog feedback.

### Non-Goals
- Altering exam grading or submission persistence logic.
- Adding background HTTP polling to active lobbies.

---

## 6. Decision Ledger

| ID | Decision Question | Selected Option | Rationale |
|---|---|---|---|
| D-01 | How should submitted students be handled in lobby queries? | Exclude from active lobby count; place in `Submitted` column in instructor lobby. | Submitted students are finished with the exam and should never appear as waiting or approved for entry. |
| D-02 | How should instructor lobby ensure production reliability? | **Pure Supabase Realtime Broadcast (Zero Polling):** Fix the backend `realtime:` topic prefix in `broadcastLobbyEvent`. | Confirmed by user. Avoids performance/traffic regressions on PostgreSQL connection pool while delivering instant <50ms updates to connected instructor browsers. |
| D-03 | How should screenshot incidents notify the student on the attempt page? | **Dedicated in-attempt Incident Dialog** (similar to MediaPipe alert) stating "Screenshot attempt detected" with acknowledgement button + fullscreen security lock. | Confirmed by user. Ensures high-visibility feedback inside HTML5 fullscreen mode with explicit student confirmation. |
