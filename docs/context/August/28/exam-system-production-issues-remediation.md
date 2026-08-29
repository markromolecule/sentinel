---
title: "Exam System Production Issues Remediation"
type: context
status: ready
created: "2026-08-28"
tags: [context, fixes, examination, scoring-integrity, session-management, lifecycle, monitoring, ui-ux]
feature: "exam-system-production-issues-remediation"
---

# Exam System Production Issues Remediation Context Specification

## 1. Overview & Objective

### Problem Statement

Production testing and QA have surfaced 9 critical and operational issues across the examination pipeline:

1. **Choice Randomization Scoring Discrepancy (ISSUE-01 - P0):** Student answer submissions on randomized exams risk score corruption due to choice label prefix collisions (e.g. baked-in `(A)`, `(B)` strings shifted during shuffle) and seed mismatches between initial exam fetch and attempt snapshot scoring.
2. **False Max-Attempt Lockout (ISSUE-02 - P0):** Students experiencing transient network drops, page refreshes, or zero-reconnect default configurations are falsely locked out with `Maximum reconnect attempts reached` (HTTP 403) on legitimate first attempts.
3. **Premature [CLOSED] State on Submission (ISSUE-03 - P0):** Submitting an exam transitions the attempt to `COMPLETED` / `SUBMITTED`, but frontend runtime access resolution incorrectly classifies the ended active attempt as a closed exam window, displaying an alarming `[CLOSED]` banner instead of a confirmed submission receipt.
4. **Student Lifecycle Reopen & Locked Student Visibility (ISSUE-04 & ISSUE-05 - P1):** Instructors lack an intuitive way to view locked/disconnected students in real time and grant a seamless attempt resume window with preserved partial answers.
5. **Group-Based Make-up Exams without Entity Duplication (ISSUE-04b - P1):** Currently, offering a make-up exam to absent or excused cohorts requires cloning the exam entity, which duplicates question configurations and splinters grade sheets across multiple exams.
6. **Monitoring Counter & Control Cleanups (ISSUE-06, ISSUE-07 - P2):** The instructor live monitoring stats confuse `lobbyAdmissions.approved` with submitted attempts, and an obsolete `Force Submit` action remains in the student integrity card.
7. **Reporting & Lobby UX Glitches (ISSUE-08, ISSUE-09 - P2/P3):** The Attempt Summary Report search triggers an unnecessary full page reload or unprevented form submission, and the Lobby refresh action lacks visual loading feedback.

### Business & User Value

- **Grading & Academic Integrity:** 100% deterministic grading accuracy where a student's chosen option always maps to the intended answer key regardless of shuffle order or option formatting.
- **Student Reliability & Confidence:** Zero false-positive lockouts on first-time test takers; clear, instant submission confirmations with verifiable receipts.
- **Instructor Operational Agility:** Single-pane visibility of locked students, instant batch make-up provisioning under the same grade sheet, and reliable live monitoring metrics.

### Success Criteria

- [x] All 9 production issues are systematically documented with verified reproduction causes, technical boundaries, and acceptance criteria.
- [x] Choice randomization preserves exact option identity across storage, rendering, and grading.
- [x] Student reconnects and page reloads never consume fresh attempt slots or block valid sessions.
- [x] Completed submissions immediately display positive submission confirmation.
- [x] Batch make-up creation attaches directly to the parent exam without entity duplication.

---

## 2. Requirements & User Stories

### User Stories & Scenarios

#### Scenario 1: Randomized Choice Integrity (ISSUE-01)

- *As a student taking an exam with randomized choices,* I want my selected answer (e.g., option text or token) to accurately evaluate against the correct answer key, so that my grade is completely accurate regardless of option display order.
- *Edge Case / Boundary:* Questions with baked-in prefix labels (e.g. `"A. First option"`, `"(B) Second option"`) are stripped and sanitized before deterministic shuffling so label letters are not mistakenly parsed as original array indices during scoring.

#### Scenario 2: Robust Reconnection & First-Attempt Session Initialization (ISSUE-02)

- *As a student experiencing a momentary Wi-Fi drop or browser reload,* I want to resume my existing in-progress session without triggering a "maximum attempt reached" error, so that I can finish my exam without interruption.
- *Failure & Recovery:* If a student opens the exam with zero prior attempts, the system must distinguish between starting attempt #1 vs reconnecting to attempt #1, enforcing reconnect limits only on distinct new sessions.

#### Scenario 3: Authoritative Submission Receipt (ISSUE-03)

- *As a student submitting my final exam,* I want to see a clear "Exam Submitted Successfully" screen with my submission timestamp and receipt details, rather than an ambiguous `[CLOSED]` error.
- *Lifecycle Transition:* When `completeSessionService` returns success, frontend navigation redirects to `/student/exam/[id]/result` and suppresses `BLOCKED_CLOSED` guards for completed attempts.

#### Scenario 4 & 5: Instructor Locked Student Visibility & Single-Student Reopen (ISSUE-04, ISSUE-05)

- *As an instructor monitoring an exam,* I want to see students who have been locked out due to network dropouts or security incidents, and be able to grant an instant unlock or 15-minute reopen window directly from the monitoring dashboard.
- *Audit Requirement:* All instructor overrides log actor ID, target student ID, timestamp, and previous/next lifecycle state.

#### Scenario 6: Group-Based Make-up Provisioning on Parent Exam (ISSUE-04b)

- *As an instructor with 5 absent students,* I want to select those 5 students from the Attempt Summary Report or Lobby and schedule a make-up window directly on the existing exam, so that their make-up scores automatically appear in the original exam's grade sheet without creating duplicate exam records.
- *Data Integrity:* Make-up attempts link to the parent `exam_id` with `attempt_kind = 'MAKEUP'` and are authorized via batch `StudentExamAccessOverride` records.

#### Scenario 7: Accurate Monitoring Status Counters (ISSUE-06)

- *As an instructor reviewing live stats,* I want "Submitted" to show the number of completed student attempts and "Approved" to reflect lobby admission status, eliminating count cross-contamination.

#### Scenario 8: Removal of Obsolete Force Submit (ISSUE-07)

- *As an instructor,* I should not see deprecated or unsupported "Force Submit" buttons in the monitoring view.

#### Scenario 9: Smooth In-Place Search Filtering in Reports (ISSUE-09)

- *As an instructor typing a student name in the Attempt Summary Report,* I want the table to filter in-place with debounced querying without triggering a full page reload or form navigation.

#### Scenario 10: Visual Feedback on Lobby Refresh (ISSUE-08)

- *As an instructor clicking "Refresh Lobby",* I want the button icon to spin and disable during active fetch, providing clear feedback that fresh data is loading.

---

## 3. Decision Ledger

| Decision ID | Area | Decision Summary | Rationale & Trade-offs | Status |
| :--- | :--- | :--- | :--- | :--- |
| **DEC-01** | Randomization | **Option Token & Prefix Normalization:** Strip choice prefix letters (`A.`, `(B)`) before shuffle and use deterministic option tokens for grading lookup. | Eliminates regex label-index collision where `(B)` was mistakenly interpreted as original index 1. | **Approved** |
| **DEC-02** | Session Init | **Count Only Completed/Non-superseded Attempts:** `countAttempts` and `maxSessionsAllowed` must allow initial session startup even when `maxReconnectAttempts` is 0. | Prevents false HTTP 403 lockouts on first exam join while still capping abuse. | **Approved** |
| **DEC-03** | Submission UI | **Suppress BLOCKED_CLOSED for Completed Attempts:** Completed attempts (`status === 'COMPLETED'`) bypass schedule cutoff banners and route directly to the `/result` page. | Fixes confusing `[CLOSED]` alert after successful exam turn-in. | **Approved** |
| **DEC-04** | Group Make-up | **Direct Batch Overrides on Parent Exam:** Instructors specify a custom `availableFrom`/`availableUntil` window for selected student IDs, generating batch `StudentExamAccessOverride` (`overrideType: 'MAKEUP'`). | Preserves single grade sheet uniformity and avoids duplicate exam records in database. | **Approved** |
| **DEC-05** | Locked Students | **Lobby & Monitoring Quick-Action:** Display locked/reconnect-depleted students with a 1-click "Unlock / Extend Window" action that invokes `grantReopenAttemptWindow`. | Streamlines instructor recovery without manual database intervention. | **Approved** |
| **DEC-06** | Monitoring Stats | **Separate Exam Attempt vs Lobby Counters:** "Submitted" reflects completed attempts; "Approved" strictly reflects lobby admission state. | Eliminates confusing duplicate metrics on the live monitoring dashboard. | **Approved** |
| **DEC-07** | Cleanup | **Remove Force Submit:** Eliminate the dead `Force Submit` button from `integrity-timeline-card.tsx` in `sentinel-web` and `sentinel-core`. | Clean UX without broken or deprecated backend endpoints. | **Approved** |
| **DEC-08** | Lobby UX | **Active Loading Spinner on Refresh:** Expose `isFetching` in `useInstructorLobby` and animate `RefreshCw` during active fetch. | Clear visual feedback preventing duplicate clicks. | **Approved** |
| **DEC-09** | Report Search | **Prevent Form Reload & In-Place Debounce:** Prevent default submission on Enter and debounce filter queries in `attempt-summary-table.tsx`. | Instant, smooth table search without full page refresh. | **Approved** |

---

## 4. Functional Requirements Checklist

### A. Exam Integrity & Randomization (ISSUE-01)

- [ ] **FR-01.1 (Option Token / Index Normalization):** Ensure `attempt-snapshot.service.ts` generates deterministic option tokens and that `score-exam-attempt-answer-resolvers.ts` resolves choices by option token / sanitized text value before index fallback.
- [ ] **FR-01.2 (Prefix Sanitization):** Strip hardcoded choice prefixes (`A.`, `B)`, `(C)`) prior to deterministic shuffle in `randomizeQuestionChoices`, rendering dynamic UI labels based on current presentation index.
- [ ] **FR-01.3 (Snapshot Seed Alignment):** Ensure `get-exam-detail.service.ts` uses the persisted `assessment_snapshot` seed rather than dynamic seeds that diverge from the graded attempt.

### B. Student Access & Session Lifecycle (ISSUE-02, ISSUE-03)

- [ ] **FR-02.1 (Attempt Count vs Session Reconnect):** In `create-session.logic.ts`, fix `countAttempts` and `handleFreshAttempt` to count only completed or non-superseded attempts against `maxReconnectAttempts`. First-time attempt creation must never fail due to zero reconnect configurations.
- [ ] **FR-02.2 (Idempotent Resume Keying):** Ensure reconnect requests from the same client session utilize stable `resumeRequestId` or attempt ID, avoiding double-incrementing `reconnect_attempt_count`.
- [ ] **FR-03.1 (Submitted State Frontend Routing):** Update `_stage-resolver.ts` and `use-student-exam-data.ts` so that attempts with `status === 'COMPLETED'` or `lifecycle_state === 'SUBMITTED'` immediately resolve to the `result` stage without rendering `BLOCKED_CLOSED`.
- [ ] **FR-03.2 (Submission Confirmation Screen):** Standardize submission response to return authoritative receipt metadata (`attemptId`, `submittedAt`, `scoreSummary`).

### C. Instructor Overrides & Group Make-up (ISSUE-04, ISSUE-04b, ISSUE-05)

- [ ] **FR-04.1 (Individual Reopen Action):** Wire instructor UI in Monitoring and Report views to invoke `grantReopenAttemptWindow` with custom duration (e.g. +15 mins, +30 mins).
- [ ] **FR-04.2 (Batch Group Make-up Creation):** Implement backend endpoint `POST /exams/:id/overrides/batch-makeup` that creates batch `StudentExamAccessOverride` records (`overrideType: 'MAKEUP'`) for a list of `studentIds` with custom `availableFrom` and `availableUntil`.
- [ ] **FR-04.3 (Unified Grade Sheet Aggregation):** Ensure `getExamReport` queries fetch attempts across all `attempt_kind` values (`NORMAL`, `MAKEUP`, `RETAKE`) grouped per student under the parent exam.
- [ ] **FR-05.1 (Instructor Locked Student Card/Panel):** Display real-time list of students with `lifecycleState === 'LOCKED'` or `reconnectAttemptsRemaining === 0` in the Instructor Lobby & Monitoring header with single-click "Unlock / Grant Reconnect" action.

### D. Monitoring, Reporting & UI Polishing (ISSUE-06, ISSUE-07, ISSUE-08, ISSUE-09)

- [ ] **FR-06.1 (Monitoring Stat Labels):** In `monitoring-stats.tsx`, separate Exam Attempt counts (`Active`, `Submitted`, `Flagged`, `Disconnected`) from Lobby Admission counts (`Waiting`, `Lobby Approved`, `In Attempt`).
- [ ] **FR-07.1 (Remove Force Submit):** Remove `Force Submit` button from `integrity-timeline-card.tsx` in `sentinel-web` and `sentinel-core`.
- [ ] **FR-08.1 (Lobby Refresh Loading State):** In `useInstructorLobby`, expose `isFetching` and add `animate-spin` to `RefreshCw` on `lobby/page.tsx` with disabled state while fetching.
- [ ] **FR-09.1 (Attempt Summary Report In-Place Search):** Ensure the search input in `attempt-summary-table.tsx` and `DataTable` prevents form submission on Enter (`e.preventDefault()`) and applies debounced filtering in-place.

---

## 5. Technical & Architectural Context

### Affected Domains & Layers

- **Backend API (`apps/sentinel-api`):**
  - `examination/flow/data/_logic/create-session.logic.ts`: Attempt count logic and first-attempt safety.
  - `examination/flow/services/attempt-snapshot.service.ts`: Randomization tokens and snapshot stability.
  - `examination/access/services/evaluate-student-exam-eligibility.service.ts`: Handling of completed vs closed states.
  - `examination/student-overrides/`: Batch make-up creation endpoint and service.
  - `examination/lifecycle/services/grant-reopen-attempt-window.ts`: Individual attempt reopen logic.
- **Web Frontend (`apps/sentinel-web` & `apps/sentinel-core`):**
  - `student/exam/[id]/_lib/student-exam-flow/_stage-resolver.ts`: Stage resolution for submitted attempts.
  - `student/exam/[id]/_hooks/use-student-exam-data.ts`: Lifecycle block mapping.
  - `(instructor)/exams/[id]/lobby/page.tsx`: Refresh button loading spinner and disabled state.
  - `(instructor)/exams/[id]/monitoring/_components/monitoring-stats.tsx`: Stat counter corrections.
  - `(instructor)/exams/[id]/monitoring/_components/integrity-timeline-card.tsx`: Force submit removal.
  - `(instructor)/exams/reports/[examId]/_components/`: In-place search and batch make-up trigger dialog.
- **Shared Library (`packages/shared`):**
  - `src/exams/shuffle-exam.ts`: Prefix-aware choice shuffling.
  - `src/exams/score-exam-attempt-answer-resolvers.ts`: Deterministic token/choice matching.
  - `src/schema/exams/student-overrides-schema.ts`: Batch make-up schema definitions.

---

## 6. Scope & Boundaries

### In Scope

- Complete resolution of all 9 listed issues (ISSUE-01 through ISSUE-09).
- Unit and integration regression tests for choice randomization scoring, attempt resumption, submission flow, batch make-up overrides, and monitoring counters.
- Updating both `sentinel-web` and `sentinel-core` where shared monitoring and report components exist.

### Out of Scope / Non-Goals

- Altering core database tables (existing `student_exam_access_overrides`, `exam_attempts`, and `exams` schema already support all required fields).
- Redesigning the entire grading UI or question authoring pipeline.

---

## 7. References & External Context

- [[docs/context/August/28/scale-concurrency-surge-root-cause-and-optimization|Concurrency Surge RCA]]
- [[docs/context/August/25/fix-admission-502-and-stateless-realtime-broadcast|Lobby Admission Architecture]]
- [[docs/context/July/July 1 - 10/solidify-exam-lifecyle|Exam Lifecycle & Overrides]]
