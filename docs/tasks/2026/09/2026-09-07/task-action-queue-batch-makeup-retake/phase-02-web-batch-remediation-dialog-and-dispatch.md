---
title: "Batch-capable RemediationGrantDialog and Promise.allSettled dispatch in sentinel-web"
type: phase
parent: "action queue batch makeup retake"
phase: "02"
status: completed
created: "2026-09-07"
tags: [task, phase, sentinel-web, batch-dispatch, dialog, remediation]
---

# Batch-capable RemediationGrantDialog and Promise.allSettled dispatch in sentinel-web

## Objective

Enhance `RemediationGrantDialog` to support both single-student and batch-student configurations, and implement the non-blocking batch execution flow with `Promise.allSettled`, comprehensive toast feedback, and query refetch in `use-exam-report`.

## Dependencies & Prerequisites

- Completion of Phase 01 (`phase-01-web-action-queue-multiselect-and-toolbar.md`)
- Backend endpoints: `POST /exams/:id/students/:studentId/lifecycle/grant-makeup` and `POST /exams/:id/students/:studentId/lifecycle/grant-retake`

## Impacted Files & Components

- `app/sentinel-web/src/app/(protected)/(instructor)/exams/reports/[examId]/_components/remediation-grant-dialog.tsx`: Updated to support `items: ExamReportActionItem[]` and `item`, display student count and preview badges, and handle batch form submission.
- `app/sentinel-web/src/app/(protected)/(instructor)/exams/reports/[examId]/_components/action-queue-view.tsx`: Connected `items` to `remediationTarget` and passed batch handlers to `RemediationGrantDialog`.
- `app/sentinel-web/src/app/(protected)/(instructor)/exams/reports/[examId]/_hooks/use-exam-report/_types.ts`: Updated `handleGrantOverride` type signature to accept `ExamReportActionItem | ExamReportActionItem[]`.
- `app/sentinel-web/src/app/(protected)/(instructor)/exams/reports/[examId]/_hooks/use-exam-report/index.ts`: Implemented `grantLifecycleOverridesBatch` with `Promise.allSettled`, multi-student toast notifications, and refetch.
- `app/sentinel-web/src/app/(protected)/(instructor)/exams/reports/[examId]/_components/remediation-grant-dialog.test.tsx`: Unit tests verifying single student and batch rendering, shared dates validation, and submit payloads.
- `app/sentinel-web/src/app/(protected)/(instructor)/exams/reports/[examId]/_hooks/use-exam-report/use-exam-report.test.tsx`: Unit tests verifying single and batch `handleGrantOverride` dispatch with success and partial failure scenarios.

## Implementation Tasks

- [x] Task 1 — Refactor `RemediationGrantDialog` for Batch Support:
  - Updated props to accept `items?: ExamReportActionItem[]` alongside `item?: ExamReportActionItem | null`.
  - Normalized target students array (`targetStudents = items?.length ? items : item ? [item] : []`).
  - Added dynamic dialog title and description showing candidate counts and preview list with name tags.
  - Retained shared inputs for Start Date & Time, End Date & Time, and Notes with start < end validation.
  - Disabled all inputs and buttons while `isLoading` is true.
- [x] Task 2 — Implement Batch Execution in `use-exam-report/index.ts`:
  - Added `grantLifecycleOverridesBatch` using `Promise.allSettled`.
  - Updated `handleGrantOverride` to support single student (preserving backward compatible toast messages) or batch array.
  - Reported granular results with sonner toasts (`toast.success` for full success, `toast.warning` for partial failure, `toast.error` for total failure).
  - Ensured `refetch()` is invoked upon completion.
- [x] Task 3 — Wire Batch Dialog into `ActionQueueView`:
  - Updated `remediationTarget` state to `{ items: ExamReportActionItem[]; type: 'MAKEUP' | 'RETAKE' } | null`.
  - Bound single row button to `[item]` and toolbar button to `items`.
  - Passed `items` and `item` to `RemediationGrantDialog`.

## Verification & Testing

- Automated Test: `pnpm --filter sentinel-web test src/app/\(protected\)/\(instructor\)/exams/reports/\[examId\]/`
  - Result: 6/6 test files passed, 34/34 tests passed.
  - Key suites:
    - `remediation-grant-dialog.test.tsx` (5/5 passed)
    - `use-exam-report.test.tsx` (3/3 passed)
    - `action-queue.test.tsx` (5/5 passed)
- TypeScript verification: Zero errors across all touched files in `sentinel-web`.

## Risks & Rollback

- Risk: A network timeout on one request could delay the batch response if requests are serial.
  - Mitigation: `Promise.allSettled` dispatches all override requests concurrently in parallel.
- Rollback: Revert `RemediationGrantDialog` and `use-exam-report` to single-item signature.
