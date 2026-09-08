---
title: "Batch Student Selection and Rescheduling for Action Queue Makeup and Retake"
type: context
status: ready
created: "2026-09-07"
tags: [context, feature, action-queue, batch-reschedule, makeup, retake, sentinel-web, sentinel-core]
feature: "action-queue-batch-makeup-retake"
---

# Batch Student Selection and Rescheduling for Action Queue Makeup and Retake Context Specification

## 1. Overview & Objective

### 1.1 Context & Problem Statement

On the Action Queue page (`/exams/reports/[examId]?section=queue` in `sentinel-web` and `/exams/[id]/report?section=queue` in `sentinel-core`), instructors monitor students requiring remediation across three queues:

1. **Needs Review:** Flagged students with unresolved proctoring incidents.
2. **Needs Makeup:** Absent students who missed the exam and require a makeup window.
3. **Needs Retake:** Students scoring below the passing mark or requiring re-examination.

Currently, granting remediation windows for "Needs Makeup" and "Needs Retake" is strictly a single-student operation: instructors must click "Grant Makeup" or "Grant Retake" row-by-row and repeat the dialog inputs for every student. While the table footer already displays selection metadata (`0 of N row(s) selected`), there are no checkboxes in the columns, preventing bulk action. Furthermore, in `sentinel-core`, the report page currently renders a monolithic card layout (`ActionListCard`) without a dedicated tabbed `DataTable` view for `?section=queue`.

### 1.2 User & Business Value

- **High-Volume Efficiency:** Instructors can select multiple (or all) students in the Makeup or Retake queues and apply a unified exam window in one single action.
- **Scheduling Consistency:** All selected students receive identical exam start/end times and instructions.
- **Cross-Portal Parity:** Bringing the dedicated tabbed `ActionQueueView` to `sentinel-core` ensures an identical, clean user experience across both `sentinel-web` and `sentinel-core`.

### 1.3 Measurable Success Criteria

- Table header and row selection checkboxes are rendered for "Needs Makeup" and "Needs Retake" in both portals.
- Batch action controls (e.g. `Grant Makeup (N)` / `Grant Retake (N)`) appear dynamically whenever 1 or more students are checked.
- A batch-aware `RemediationGrantDialog` displays the selected student count and names, with shared Start Date/Time, End Date/Time, and Notes inputs.
- Rescheduling requests execute smoothly with loading indicators, per-student error handling, and toast feedback.
- `sentinel-core` supports the dedicated tabbed `ActionQueueView` when navigating to `?section=queue`.
- Existing single-student grant actions remain fully operational.

---

## 2. Requirements & User Stories

### User Stories & Scenarios

- **US-01 (Bulk Student Selection):**
  *As an instructor, I want to select multiple students using checkboxes in the Makeup or Retake queue (or click a header checkbox to select all students on the page), so that I can schedule exams in bulk.*
- **US-02 (Shared Window Configuration):**
  *As an instructor, I want to configure a single Start Date & Time, End Date & Time, and Notes in a modal dialog for all selected students, so that I don't have to re-enter dates repeatedly.*
- **US-03 (Execution & Resilience):**
  *As an instructor, I want visible progress during batch processing and clear toast notifications indicating how many students succeeded and whether any failed.*
- **US-04 (Cross-Portal Consistency):**
  *As an instructor using either `sentinel-web` or `sentinel-core`, I want the Action Queue page to look, feel, and function identically.*

### Functional Requirements

- [ ] **FR-01 (Table Selection Checkboxes):**
  - Add a TanStack table `select` column to `getActionQueueColumns` for `makeup` and `retake` queues.
  - Header checkbox: Selects / deselects all rows on the current page, displaying an indeterminate state when partially selected.
  - Row checkbox: Selects / deselects an individual student row.
- [ ] **FR-02 (Batch Action Toolbar in ActionQueuePanel):**
  - When `selectedCount > 0`, display a toolbar action button: `Grant Makeup ({count})` or `Grant Retake ({count})`.
  - Include a `Clear Selection` button to quickly reset selected checkboxes.
- [ ] **FR-03 (Batch RemediationGrantDialog):**
  - Update `RemediationGrantDialog` to accept either an individual student (`item`) or a collection of students (`items: ExamReportActionItem[]`).
  - Dialog description summarizes selected candidates (e.g., `Scheduling makeup for 4 students: Smith, John; Doe, Jane; ...`).
  - Preserves standard validation (valid Start Date and End Date required, Start < End).
- [ ] **FR-04 (Batch Grant Execution):**
  - Dispatch remediation grants sequentially or via `Promise.allSettled` to the existing per-student endpoint (`/exams/:id/students/:studentId/lifecycle/grant-makeup` or `grant-retake`).
  - Display progress indicator while requests are inflight (`activeActionId = 'batch'` or dedicated `isBatchSubmitting` state).
  - Toast confirmation on completion with success counts and failure details if any student fails.
  - Automatically refresh query data (`refetch()`) and reset row selection upon success.
- [ ] **FR-05 (Port ActionQueueView to sentinel-core):**
  - Implement route handling for `?section=queue` in `sentinel-core`'s exam report.
  - Port `ActionQueueView`, `ActionQueuePanel`, `action-queue-columns`, and updated `RemediationGrantDialog` to `sentinel-core`, matching `sentinel-web`.
  - Update `exam-session-nav.tsx` in `sentinel-core` so clicking "Actions" switches to the dedicated Action Queue view.

### Edge Cases & Failure Handling

- **Partial Failure:** If 4 of 5 grants succeed and 1 fails (e.g., account eligibility error), the 4 succeed, toast alerts the user of the single failure, and the remaining student stays selected for review.
- **Queue Tab Switching:** Switching between "Needs Review", "Needs Makeup", and "Needs Retake" clears current selection to prevent cross-queue state contamination.
- **Pagination Boundary:** Selection tracks selected student IDs cleanly, or limits selection to current page rows per TanStack defaults.
- **Double-Submission Prevention:** Buttons and inputs in the dialog are disabled while batch requests are processing.

---

## 3. Technical & Architectural Context

### Affected Domains & Applications

- **Frontend App 1:** `app/sentinel-web/`
  - `src/app/(protected)/(instructor)/exams/reports/[examId]/_components/action-queue-view.tsx`
  - `src/app/(protected)/(instructor)/exams/reports/[examId]/_components/action-queue-panel.tsx`
  - `src/app/(protected)/(instructor)/exams/reports/[examId]/_components/action-queue-columns.tsx`
  - `src/app/(protected)/(instructor)/exams/reports/[examId]/_components/remediation-grant-dialog.tsx`
  - `src/app/(protected)/(instructor)/exams/reports/[examId]/_hooks/use-exam-report/index.ts`
- **Frontend App 2:** `app/sentinel-core/`
  - `src/app/(protected)/exams/[id]/report/page.tsx` (Add `?section=queue` routing branch)
  - `src/app/(protected)/exams/[id]/report/_components/action-queue-view.tsx`
  - `src/app/(protected)/exams/[id]/report/_components/action-queue-panel.tsx`
  - `src/app/(protected)/exams/[id]/report/_components/action-queue-columns.tsx`
  - `src/app/(protected)/exams/[id]/report/_components/remediation-grant-dialog.tsx`
  - `src/app/(protected)/exams/[id]/report/_helpers/report-helpers.ts`

### Backend Endpoints Leveraged

- `POST /exams/:id/students/:studentId/lifecycle/grant-makeup`
- `POST /exams/:id/students/:studentId/lifecycle/grant-retake`

---

## 4. Scope & Boundaries

- **In Scope:**
  - Multi-select checkbox column in `action-queue-columns.tsx` for Makeup and Retake.
  - Batch action toolbar and batch grant flow in `ActionQueuePanel`.
  - Batch-capable `RemediationGrantDialog` across `sentinel-web` and `sentinel-core`.
  - Porting dedicated `ActionQueueView` into `sentinel-core` for `?section=queue`.
  - Comprehensive unit test coverage for row selection and batch grant execution.
- **Out of Scope / Non-Goals:**
  - Bulk actions on "Needs Review" queue (flagged incidents require individual review).
  - Modifying the underlying database schema or `createRemediationExam` transaction logic.

---

## 5. References & Decisions

- **Architectural Decision (2026-09-07):** Port the dedicated tabbed `ActionQueueView` with `DataTable` to `sentinel-core` to ensure 100% UI and UX parity with `sentinel-web`.
- `docs/context/September/6/dashboard-name-score-dialog-sidebar-refinement.md`
