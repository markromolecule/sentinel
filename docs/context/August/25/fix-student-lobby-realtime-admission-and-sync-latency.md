---
title: "Fix Student Lobby Realtime Admission Sync Latency and Gating Bottlenecks"
type: context
status: ready
created: "2026-08-25"
tags: [context, fix, lobby, realtime, supabase, railway, latency, student-experience]
feature: "student-lobby-realtime-admission"
---

# Fix Student Lobby Realtime Admission Sync Latency and Gating Bottlenecks Context Specification

## 1. Overview & Objective

- **Problem Statement:**
  1. **Lobby Admission Realtime Lag / Inaction (Single Student & Bulk Admit):** When an instructor approves or rejects a student (e.g. from `sentinel-web` Exam Lobby), the student's lobby interface (both web and mobile) does not update in real time to unlock the "Continue to Attempt" / "Enter Exam" button, or takes excessively long to update. This occurs on **single-student admission** as well as **bulk ("Admit All") admissions**.
  2. **Admission-to-Runtime Access Deadlock in Client State:** In `use-lobby-state.ts`, `canEnterExam` strictly gates on `runtimeAccess.state === 'lobby_approved'` or `canStart/canResume`. Before approval, `runtimeAccess.state` is `'lobby_waiting'`, so `isApprovedRuntimeAccess` is `false`. Because `runtimeAccess` is only refreshed via an asynchronous HTTP round-trip (`refetchExam()`) while setting `isAdmissionPendingRefresh = true`, the UI button remains disabled even after the admission status transitions to `APPROVED`.
  3. **Fragile Single-Point-of-Failure (No Adaptive Polling Fallback):** On August 24 (`phase-02-deduplicate-session-status-and-lobby-polling.md`), polling was completely eliminated (`refetchInterval: false`) in `useExamLobbyAdmissionStatusQuery`. If the Supabase WebSocket connection experiences packet drops, RLS evaluation latency, or reconnection jitter, a single waiting student remains stranded on "Waiting for Approval" until a manual page refresh.
  4. **Unscoped Cache Mutation in `useLobbyRealtime`:** `useLobbyRealtime` blindly executed `setQueryData` on any student's postgres change event matching `exam_id`, without scoping to the current student's ID.
  5. **Heavy Database RLS on Supabase Realtime Logical Replication:** Postgres CDC (`postgres_changes`) evaluates multi-table JOINs (`students`, `user_roles`, `exams`, `exam_assignees`) for every connected websocket subscriber during admissions.

- **Business & User Value:**
  - Guarantees instant (< 100ms) student admission unlocking upon instructor decision (single or batch).
  - Eliminates student confusion, anxiety, and delays during high-stakes exam launches.
  - Keeps server traffic and database connections minimal (zero ongoing polling once admitted).

- **Success Criteria:**
  - Student lobby unlocks to "Continue to Attempt" within < 100ms when approved by instructor (for single-student or bulk admission).
  - Resilient dual-channel delivery: Direct Supabase Broadcast (`broadcast`) + Postgres CDC (`postgres_changes`) + Adaptive 3-second fallback polling while waiting.
  - Zero polling once `admissionStatus === 'APPROVED'` or during exam attempt.
  - Optimistic client-side unlock: If `admissionStatus === 'APPROVED'` and exam is open, button enables immediately without blocking on secondary HTTP queries.

---

## 2. Requirements & User Stories

### User Stories / Scenarios

- *As a single student waiting in the exam lobby,* I want the "Waiting for Approval" button to immediately transition to "Continue to Attempt" / "Resume Exam" the instant my instructor clicks admit on my profile, so I can start my exam without refreshing or experiencing lag.
- *As an instructor managing a multi-student exam lobby,* I want clicking "Admit" or "Admit All" to instantly propagate to student devices without overloading the database or dropping websocket events.
- *As a student with unstable Wi-Fi,* I want the lobby to automatically detect my admission within 3 seconds even if my WebSocket momentarily drops and reconnects.

### Functional Requirements

- [ ] **FR-01 (Dual Realtime Delivery - Broadcast + CDC):**
  - Update `updateAdmissions` in `sentinel-api` (and instructor lobby mutations) to emit a lightweight Supabase Realtime Broadcast message on channel `lobby:admissions:${examId}` with `{ event: 'admission:updated', studentIds, status }`.
  - Update `useLobbyRealtime` to listen to both `broadcast` events and `postgres_changes` events.
- [ ] **FR-02 (Scoped Realtime Cache Updates):**
  - In `useLobbyRealtime`, inspect `payload.studentIds` or `payload.new.student_id`. Only update `lobbyAdmissionStatus(examId)` if the event corresponds to the current logged-in student (or if it's a global reset).
  - Invalidate `lobbyWaitingList` and `lobbyCount` queries so instructor queues and counters sync smoothly.
- [ ] **FR-03 (Immediate Client-Side Admission Gating):**
  - In `use-lobby-state.ts`, decouple button enablement from `runtimeAccess.state === 'lobby_approved'`.
  - When `admissionStatus === 'APPROVED'` and the exam is not in a hard-blocked state (`closed`, `locked`, `before_start`), immediately set `canEnterExam = true` without waiting for `refetchExam()` to finish.
- [ ] **FR-04 (Adaptive Fallback Polling While Waiting):**
  - In `useExamLobbyAdmissionStatusQuery`, implement smart adaptive polling: `refetchInterval: (query) => query.state.data?.status === 'APPROVED' ? false : 3000`.
  - As soon as the status is `APPROVED`, polling automatically ceases (0 req/min).

---

## 3. Technical & Architectural Context

### Affected Files

- **Sentinel Web (`app/sentinel-web`):**
  - [`src/app/(protected)/student/exam/[id]/lobby/_hooks/use-lobby-state.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/_hooks/use-lobby-state.ts)
  - [`src/app/(protected)/student/exam/[id]/lobby/_components/lobby-footer-actions.tsx`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/_components/lobby-footer-actions.tsx)
  - [`src/app/(protected)/(instructor)/exams/[id]/lobby/_hooks/use-instructor-lobby.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/lobby/_hooks/use-instructor-lobby.ts)
- **Shared Packages (`packages/hooks`):**
  - [`src/use-lobby-realtime.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/packages/hooks/src/use-lobby-realtime.ts)
  - [`src/query/exams/use-exam-lobby-admission-status-query.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/packages/hooks/src/query/exams/use-exam-lobby-admission-status-query.ts)
- **Sentinel Mobile (`app/sentinel-mobile`):**
  - [`features/exam/hooks/use-exam-lobby.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/features/exam/hooks/use-exam-lobby.ts)
- **Sentinel API (`app/sentinel-api`):**
  - [`src/modules/examination/lobby/services/update-admissions.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/lobby/services/update-admissions.ts)
  - [`src/modules/examination/lobby/services/check-in-lobby.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/lobby/services/check-in-lobby.ts)

---

## 4. Decision Ledger & Scenarios

| ID | Topic | Decision | Rationale | Status |
| :--- | :--- | :--- | :--- | :--- |
| **DEC-01** | Dual Realtime Transport | Use Supabase Realtime Broadcast alongside Postgres CDC | Broadcast bypasses PostgreSQL WAL & RLS query overhead, guaranteeing < 50ms delivery across all connected students during single or mass admissions | Approved |
| **DEC-02** | Adaptive Polling Fallback | Reactivate 3s adaptive polling in `useExamLobbyAdmissionStatusQuery` exclusively while `status === 'WAITING'`, automatically disabling when `status === 'APPROVED'` | Completely eliminates stuck state if WebSocket drops, while introducing zero network traffic once approved | Approved |
| **DEC-03** | Immediate Optimistic Client Unlocking | In `use-lobby-state.ts`, evaluate `canEnterExam = true` immediately when `admissionStatus === 'APPROVED'` (as long as exam is not closed/locked/before_start), without waiting on `refetchExam()` | Removes the UI freeze / waiting loop caused by async `refetchExam()` network round-trips for single students | Approved |
| **DEC-04** | Student-Scoped Realtime Filtering | Extract current student ID and ensure `setQueryData` only mutates when the broadcast/CDC event targets the current user | Prevents race conditions and cross-student cache contamination | Approved |
