---
title: "Automated test suites, edge case verification, and cross-portal release checks"
type: phase
parent: "action queue batch makeup retake"
phase: "04"
status: completed
created: "2026-09-07"
tags: [task, phase, tests, verification, release-readiness]
---

# Automated test suites, edge case verification, and cross-portal release checks

## Objective

Validate all batch selection and remediation grant capabilities through unit tests, edge-case analysis, and end-to-end verification across both `sentinel-web` and `sentinel-core`.

## Dependencies & Prerequisites

- Completion of Phases 01, 02, and 03.

## Impacted Files & Components

- `app/sentinel-web/src/app/(protected)/(instructor)/exams/reports/[examId]/_components/action-queue.test.tsx`
- `app/sentinel-web/src/app/(protected)/(instructor)/exams/reports/[examId]/_components/remediation-grant-dialog.test.tsx`
- `app/sentinel-web/src/app/(protected)/(instructor)/exams/reports/[examId]/_hooks/use-exam-report/use-exam-report.test.tsx`
- `app/sentinel-core/src/app/(protected)/exams/[id]/report/_components/action-queue.test.tsx`
- `app/sentinel-core/src/app/(protected)/exams/[id]/report/_components/remediation-grant-dialog.test.tsx`
- `app/sentinel-core/src/app/(protected)/exams/[id]/report/_helpers/report-helpers.test.ts`
- `app/sentinel-core/src/app/(protected)/exams/[id]/report/page.test.tsx`

## Implementation Tasks

- [x] Task 1 — Unit Tests for Action Queue Columns & Multi-Select:
  - Test header select-all toggles all rows on page.
  - Test header indeterminate state when partial rows are checked.
  - Test individual row checkbox toggles single row.
  - Test `isSelectable: false` omits select checkbox column (Needs Review).
- [x] Task 2 — Unit Tests for Batch Remediation Dialog:
  - Test renders singular vs plural copy based on student array length.
  - Test validation prevents submit when Start Date >= End Date or fields are empty.
  - Test submit dispatches expected payload (ISO strings, notes).
  - Test disabled states while `isLoading` is true.
- [x] Task 3 — Batch Execution & Partial Failure Handling Tests:
  - Test `Promise.allSettled` resolves all successes and triggers success toast.
  - Test partial failure triggers warning toast with failure count and error message.
  - Test total failure triggers error toast.
  - Test table data refetch and row selection reset after submission.
- [x] Task 4 — Static Quality & Build Gates:
  - Run type checking in `sentinel-web` and `sentinel-core`.
  - Verify zero TypeScript errors in all modified report files.

## Verification & Testing

- `pnpm --filter sentinel-web test src/app/(protected)/(instructor)/exams/reports/` (PASS: 7/7 suites, 38/38 tests)
- `pnpm --filter sentinel-core test src/app/(protected)/exams/[id]/report/` (PASS: 5/5 suites, 30/30 tests)
- TypeScript validation: 0 errors in touched files.

## Risks & Rollback

- Risk: Mocking API clients or next/navigation in test suites.
  - Mitigation: Follow existing mock patterns established in `@sentinel/testing` or local test files.
- Rollback: Remove test files if they fail to link or block CI.
