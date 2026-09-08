---
title: "action queue batch makeup retake"
type: task
status: completed
created: "2026-09-07"
tags: [task, feature, action-queue, batch-reschedule, makeup, retake, sentinel-web, sentinel-core]
feature: "action-queue-batch-makeup-retake"
---

# action queue batch makeup retake

## Outcome

Enable instructors to select multiple students concurrently via checkboxes in the "Needs Makeup" and "Needs Retake" Action Queues to configure and grant batch remediation exam windows in a single, resilient workflow across both `sentinel-web` and `sentinel-core`. Furthermore, achieve 100% UI and UX parity by porting the dedicated tabbed `ActionQueueView` with `DataTable` into `sentinel-core` (`/exams/[id]/report?section=queue`).

## Pre-planning record

### Actors and goals

- **Primary Actor:** Instructor / Exam Administrator.
- **Goal:** Rapidly grant makeup or retake exam windows to cohorts of students without repeating tedious per-student dialog inputs, with immediate visibility into progress, batch execution outcome, and failure isolation.

### Domain language

- **Action Queue:** Remediation triage views categorized into Needs Review (proctoring incidents), Needs Makeup (absent students), and Needs Retake (failed students).
- **Remediation Grant:** Creation of a cloned, time-bound examination instance linking student, allowed window, and optional instructor notes.
- **Batch Override Dispatch:** Client-side non-blocking orchestration using `Promise.allSettled` to existing lifecycle endpoints.

### Scenario coverage

| ID | Actor and situation | Preconditions | Expected outcome | Failure/recovery | Status |
| --- | --- | --- | --- | --- | --- |
| SC-01 | Instructor selects all absent students on the current page | On "Needs Makeup" queue tab with 5 students | Header checkbox selects all 5 students; batch toolbar appears with "Grant Makeup (5)" | Deselecting header unchecks all 5 | Verified |
| SC-02 | Instructor selects an arbitrary subset of students | On "Needs Retake" queue tab | Individual row checkboxes toggle; header enters indeterminate state; toolbar shows "Grant Retake (N)" | Unchecking all hides batch toolbar | Verified |
| SC-03 | Instructor configures shared remediation window | 3 students selected, clicks "Grant Makeup (3)" | Modal dialog displays count (3) and names; date/time and notes applied to all | Dialog inputs disabled during submission; validation stops empty/inverted dates | Verified |
| SC-04 | Batch execution partial failure | 4 of 5 grants succeed, 1 fails (e.g. backend validation error) | 4 grants applied; toast notifies "Granted 4 of 5. 1 failed"; table refreshes; failed student remains flagged | Failed item unselected or inspectable | Verified |
| SC-05 | Queue tab switching | 2 students checked in "Needs Makeup", user clicks "Needs Retake" | Selection state resets automatically; no cross-queue state contamination | Clear selection on tab switch | Verified |
| SC-06 | Instructor navigates to Action Queue in `sentinel-core` | Clicks "Actions" in exam runtime nav | `/exams/[id]/report?section=queue` renders tabbed `ActionQueueView` with full batch capabilities | Invalid section falls back gracefully | Verified |

### Decision ledger

| ID | Question | Decision | Evidence or rationale | Alternatives rejected | Artifact |
| --- | --- | --- | --- | --- | --- |
| DEC-01 | How to execute batch grants without API schema churn? | Orchestrate calls via client `Promise.allSettled` targeting existing `POST /exams/:id/students/:studentId/lifecycle/grant-makeup` & `grant-retake` | Zero backend breaking changes, immediate deployment, per-student failure isolation | Batch endpoint on API requiring DB schema changes | `docs/context/September/7/action-queue-batch-makeup-retake.md` |
| DEC-02 | How to reconcile `sentinel-core` report page discrepancy? | Port full `ActionQueueView` with `DataTable` to `sentinel-core` for `?section=queue` | `exam-session-nav.tsx` already points to `?section=queue`; guarantees 100% feature parity | Keeping minimal card-based layout in core | `docs/context/September/7/action-queue-batch-makeup-retake.md` |
| DEC-03 | Should "Needs Review" support batch remediation? | No; flagged proctoring incidents require individualized instructor scrutiny | Audit integrity and academic fairness requirements | Enabling bulk actions on flagged incidents | `docs/context/September/7/action-queue-batch-makeup-retake.md` |

### Unknowns and blockers

- None. All endpoints, types (`ExamReportActionItem`), and UI components (`DataTable`, `Checkbox`, `Dialog`) are verified in the codebase.

## Acceptance criteria

| ID | Source goal/scenario/decision | Criterion | Implementation | Verification | Status |
| --- | --- | --- | --- | --- | --- |
| AC-01 | SC-01, SC-02 | Table renders multi-select checkboxes for "Needs Makeup" and "Needs Retake" in `sentinel-web` | `action-queue-columns.tsx` conditional select column | Unit test & UI inspection | Verified |
| AC-02 | SC-01, SC-02 | Dynamic batch action toolbar displays `Grant Makeup/Retake ({N})` and `Clear Selection` | `action-queue-panel.tsx` row selection state | Unit test & UI inspection | Verified |
| AC-03 | SC-03 | `RemediationGrantDialog` accepts multiple students and shows student count and names preview | `remediation-grant-dialog.tsx` `items: ExamReportActionItem[]` | Unit test & UI inspection | Verified |
| AC-04 | SC-04 | Batch grant executes with progress state, toast notifications, query refetch, and selection reset | `use-exam-report/index.ts` `grantLifecycleOverridesBatch` | Mock API tests | Verified |
| AC-05 | SC-05 | Tab switching clears selection state | `action-queue-view.tsx` tab handler | State assertion test | Verified |
| AC-06 | SC-06, DEC-02 | `sentinel-core` renders full `ActionQueueView` with multi-select and batch grant at `?section=queue` | `sentinel-core/src/app/(protected)/exams/[id]/report/page.tsx` | Route & UI verification | Verified |
| AC-07 | General | Single-student grant actions remain fully backward compatible | `action-queue-columns.tsx` & single `onAction` triggers | Regression tests | Verified |

## Scope

- Multi-select checkbox column in `action-queue-columns.tsx` for Makeup and Retake queues.
- Selection management, dynamic batch toolbar, and count indicators in `ActionQueuePanel`.
- Enhanced `RemediationGrantDialog` supporting both single and multi-student contexts.
- Batch dispatch handler using `Promise.allSettled` in `use-exam-report` and `sentinel-core`.
- Porting `ActionQueueView`, `ActionQueuePanel`, `action-queue-columns`, and dialogs to `sentinel-core`.
- Comprehensive automated unit tests and type checks across `sentinel-web` and `sentinel-core`.

## Non-goals

- Bulk actions on "Needs Review" queue (flagged incidents must be reviewed individually).
- Modifying backend database schemas or `createRemediationExam` transaction logic.
- Altering the student exam experience or attempt execution engine.

## Constraints and decisions

- Retain clean design tokens and aesthetics matching `@sentinel/ui`.
- Never block all students if one student fails: report granular success and error counts.
- Strict phase execution with evidence gathering before progressing.

## Phases

- [x] `phase-01-web-action-queue-multiselect-and-toolbar.md` — Multi-select checkbox column, row selection state, and batch toolbar in `sentinel-web`
- [x] `phase-02-web-batch-remediation-dialog-and-dispatch.md` — Batch-capable RemediationGrantDialog and Promise.allSettled dispatch in `sentinel-web`
- [x] `phase-03-core-action-queue-parity-and-batch-remediation.md` — Port ActionQueueView, DataTable, and batch remediation to `sentinel-core`
- [x] `phase-04-testing-verification-and-edge-cases.md` — Automated test suites, edge case verification, and cross-portal release checks

## Verification

- `pnpm --filter sentinel-web test src/app/\(protected\)/\(instructor\)/exams/reports/` (PASS: 7/7 suites, 38/38 passed).
  - `action-queue.test.tsx` (5 tests)
  - `remediation-grant-dialog.test.tsx` (6 tests)
  - `use-exam-report.test.tsx` (4 tests)
  - `index.test.tsx` (6 tests)
  - `page.test.tsx` (6 tests)
  - `exam-report-pdf-export.test.tsx` (9 tests)
  - `reports/page.test.tsx` (2 tests)
- `pnpm --filter sentinel-core test src/app/\(protected\)/exams/\[id\]/report/` (PASS: 5/5 suites, 30/30 passed).
  - `action-queue.test.tsx` (6 tests)
  - `remediation-grant-dialog.test.tsx` (6 tests)
  - `report-helpers.test.ts` (6 tests)
  - `page.test.tsx` (5 tests)
  - `exam-report-pdf-export.test.tsx` (7 tests)
- Zero TypeScript errors in touched files across both `sentinel-web` and `sentinel-core`.

## Deviations

- None. Implementation fully adhered to zero-backend-schema-change decision via client-side `Promise.allSettled` concurrency and isolated per-student error handling.

## Result

Successfully completed and verified all 4 phases. Instructors can now multi-select absent students or students needing a retake, configure a shared remediation examination schedule with candidate badges, and dispatch batch grants seamlessly with resilient partial-failure handling across both `sentinel-web` and `sentinel-core`.
