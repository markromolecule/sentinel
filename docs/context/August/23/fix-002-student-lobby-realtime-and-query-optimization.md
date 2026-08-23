---
title: "Fix and Optimize Student Lobby Real-Time Admission Updates & Query Responsiveness"
type: context
status: ready
created: "2026-08-23"
tags: [context, student-lobby, realtime, optimization, supabase-realtime, react-query]
feature: "student-lobby-realtime-and-optimization"
---

# Fix and Optimize Student Lobby Real-Time Admission Updates & Query Responsiveness Context Specification

## 1. Overview & Objective

- **Problem Statement:**
  When an instructor accepts/admits students from the Exam Lobby dashboard (`https://app.sentinelph.tech/exams/[id]/lobby`), the student waiting in the student lobby (`https://app.sentinelph.tech/student/exam/[id]/lobby`) does not immediately update to allow them to proceed to the attempt page.
  The student's page remains stuck on "Waiting for Approval" and the entry button remains disabled.
  Furthermore, the student lobby synchronization logic relies on local component state instead of a unified reactive cache, suffers from a 45-second heartbeat polling fallback when WebSocket events are delayed or dropped, and initiates heavy full-exam queries (`GET /api/examination/exams/[id]?viewer=student`) on each refresh.

- **Business / User Value:**
  - **Zero-Friction Exam Entry:** Students receive immediate sub-second feedback when an instructor admits them into an exam, preventing panic and exam delays.
  - **Resilient Real-Time Sync:** If Supabase Realtime WebSockets experience network interruptions or token refresh latency, adaptive short polling (2–3 seconds) guarantees prompt admission without requiring manual page reload.
  - **Optimized Server & Database Load:** Decouples lightweight lobby admission status queries from heavy exam content fetching (questions, shuffling, sanitization), significantly reducing API response times and database load.

- **Success Criteria:**
  - When an instructor admits a student, the student's lobby status changes from "Waiting for approval" to "Approved" and the "Continue to Attempt" / "Resume Exam" button enables in `< 500ms` via Supabase Realtime, and `< 3s` under total WebSocket disconnection.
  - No manual browser refresh is required by the student.
  - Clean toast/visual feedback alerts the student when admitted.
  - The student lobby query overhead is reduced, and state is managed reactively via TanStack Query without desynchronization.

---

## 2. Root Cause Analysis (Logic & Architecture Breakdown)

1. **Disconnected State Management in Student Lobby (`use-lobby-state.ts`):**
   - `use-lobby-state.ts` manages admission status with an isolated local `useState(admissionStatus)` rather than consuming `useExamLobbyAdmissionStatusQuery`.
   - `useLobbyRealtime` calls `queryClient.invalidateQueries(EXAM_QUERY_KEYS.lobbyAdmissionStatus(examId))`, but `use-lobby-state.ts` was not subscribed to that query key, rendering query invalidation ineffective unless the imperative callback fired.
2. **Excessive 45-Second Fallback Polling Interval:**
   - In `use-lobby-state.ts`, the fallback polling interval was set to `45000` ms (45 seconds). If a Supabase Realtime WebSocket event is dropped or delayed by RLS/network, the student is stranded waiting up to 45 seconds.
3. **Silent Supabase Realtime Subscription Failures:**
   - `useLobbyRealtime` does not monitor subscription lifecycle status (e.g. `SUBSCRIBED`, `CHANNEL_ERROR`, `TIMED_OUT`, `CLOSED`). If the channel fails to connect or encounters token expiry, no error is logged or handled.
4. **Heavy Exam Refetch on Lobby Sync:**
   - When admission is detected, `use-lobby-state.ts` calls `refetchExam()`, which triggers `GET /api/examination/exams/:id?viewer=student` executing multi-table joins, question shuffling, and sanitization rather than only checking lightweight runtime access.

---

## 3. Requirements & User Stories

### User Stories / Scenarios
- *As a Student waiting in the exam lobby, I want my screen to immediately unlock and enable the "Continue to Attempt" button as soon as my instructor approves my admission, so that I can begin my exam without delays or refreshing.*
- *As a Student with an unstable internet connection or strict firewall where WebSockets might disconnect, I want the lobby to automatically poll the database every 2–3 seconds so I am admitted promptly even without WebSockets.*
- *As an Instructor admitting 50+ students in bulk, I want the backend and database to handle lightweight admission checks efficiently without spiking CPU or database connection pool limits.*

### Functional Requirements
- [ ] **FR-01 (Reactive Admission Query):** Refactor `use-lobby-state.ts` to utilize `useExamLobbyAdmissionStatusQuery` with active caching, automatic invalidation, and smart adaptive polling (`refetchInterval: 2500ms` when waiting, disabled when approved).
- [ ] **FR-02 (Robust Supabase Realtime & Optimistic Cache Mutation):** Enhance `useLobbyRealtime` to inspect subscription state, support student-specific payload matching, optimistically update query cache on `APPROVED`, and invalidate both admission and details query keys.
- [ ] **FR-03 (Instant UI & Visual Feedback):** When admission transitions from `WAITING` to `APPROVED`, display a success toast ("You have been admitted to the exam!"), update the header state badge, and enable the entry button immediately.
- [ ] **FR-04 (Lightweight Status Synchronization):** Separate frequent lobby admission polling from heavy exam payload fetches, only refetching exam details when admission is confirmed or when entering the attempt.

### Edge Cases & Failure Modes
- **WebSocket Disconnection / Reconnection:** Fast polling fallback (2.5s) seamlessly handles admission even if WebSocket is dropped.
- **Multiple Tabs / Windows:** React Query cache syncs admission across all open student tabs for the same exam.
- **Instructor Rejection:** If the instructor rejects the student admission, the UI immediately reflects "Waiting for Re-approval" and informs the student.

---

## 4. Technical & Architectural Context

- **Affected Layers:**
  - `sentinel-web`: `app/(protected)/student/exam/[id]/lobby/` (`page.tsx`, `_hooks/use-lobby-state.ts`, `_components/lobby-footer-actions.tsx`)
  - `@sentinel/hooks`: `use-lobby-realtime.ts`, `use-exam-lobby-admission-status-query.ts`, `use-update-exam-lobby-admissions-mutation.ts`
  - `@sentinel/services`: `getExamLobbyAdmissionStatus`, `checkIntoExamLobby`
  - `sentinel-api`: `modules/examination/lobby/` (`get-admission-status.ts`, `update-admissions.ts`)
- **Database Tables & Indexes:**
  - `exam_lobby_admissions` (`admission_id`, `exam_id`, `student_id`, `status`, `checked_in_at`, `decided_at`)
  - Index: `exam_lobby_admissions_exam_status_idx` on `(exam_id, status, checked_in_at ASC)`

---

## 5. Scope & Boundaries

- **In Scope:**
  - Resolving student lobby real-time update failure.
  - Implementing reactive TanStack Query integration in `use-lobby-state.ts`.
  - Adding short adaptive polling fallback (2–3 seconds while waiting).
  - Improving `useLobbyRealtime` resilience and instant query cache mutation.
  - Adding student toast notification upon instructor approval.
  - Comprehensive unit and integration test coverage.
- **Out of Scope / Non-Goals:**
  - Modifying exam question builder or grading calculations.
  - Altering instructor monitoring layout or LiveKit video streams.

---

## 6. Grill Discovery & Decision Ledger

| ID | Topic | Decision | Rationale |
| :--- | :--- | :--- | :--- |
| **DEC-01** | Admission Polling Strategy | Adaptive polling (2.5s while waiting / rejected, 0s once approved) alongside Supabase Realtime | Provides instant sub-second unlock on WebSockets while guaranteeing < 3s unlock on dropped/unsupported WebSocket connections. |
| **DEC-02** | State Management in `use-lobby-state` | Migrate from isolated `useState` to `useExamLobbyAdmissionStatusQuery` | Aligns with monorepo TanStack Query pattern and allows `useLobbyRealtime` invalidations to immediately trigger UI re-renders. |
| **DEC-03** | User Feedback on Approval | Display instant success toast + badge transition | Provides clear confirmation to the student that the instructor took action. |
