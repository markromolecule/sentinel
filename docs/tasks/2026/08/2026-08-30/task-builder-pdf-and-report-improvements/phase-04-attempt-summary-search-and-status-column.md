---
title: "Phase 4: Attempt Summary Smooth Search & Status Column Consolidation"
type: phase
parent: "docs/tasks/2026/08/2026-08-30/task-builder-pdf-and-report-improvements/README.md"
phase: "04"
status: completed
created: "2026-08-30"
tags: [task, phase, reports, search, ui, sentinel-web, packages-hooks]
---

# Phase 4: Attempt Summary Smooth Search & Status Column Consolidation

## Objective

Optimize the Attempt Summary report view to eliminate full-page unmounting on search keystrokes by providing query placeholder data and table-level skeletons, while consolidating action badges (`Review`, `Retake`, `Makeup`, `Locked`, etc.) from the Student column into the Status column for a cleaner, non-repetitive table layout.

## Dependencies & Prerequisites

- Phase 1, Phase 2, Phase 3 completed.

## Impacted Files & Components

- `packages/hooks/src/query/exams/use-exam-report-query.ts`
- `app/sentinel-web/src/app/(protected)/(instructor)/exams/reports/[examId]/_components/exam-report-page-content.tsx`
- `app/sentinel-web/src/app/(protected)/(instructor)/exams/reports/[examId]/_components/attempts-view.tsx`
- `app/sentinel-web/src/app/(protected)/(instructor)/exams/reports/[examId]/_components/columns.tsx`
- `app/sentinel-web/src/app/(protected)/(instructor)/exams/reports/[examId]/page.test.tsx`

## Implementation Tasks

- [x] Task 1: In `packages/hooks/src/query/exams/use-exam-report-query.ts`, configure `placeholderData: (previousData) => previousData` on `useQuery` to preserve cached report data during background fetching.
- [x] Task 2: In `exam-report-page-content.tsx`, modify loading guard to `if (isLoading && !report) return <ReportLoading />;` so that existing data is not replaced by the full-page spinner during search.
- [x] Task 3: In `attempts-view.tsx`, pass `isLoading={isFetching}` to `<DataTable ... />` so table skeleton rows render during search debouncing without unmounting the search input.
- [x] Task 4: In `columns.tsx`:
  - Cleaned up `Student` column cell to only display student name (`${student.lastName}, ${student.firstName}`) and student number (`student.studentNo`). Removed badges.
  - In `Status` column cell, rendered the primary status badge alongside any relevant action and lifecycle badges (`Review`, `Retake`, `Makeup`, `Locked`, `Closed`, `Superseded`, `Finalized`).
- [x] Task 5: Run and verify report unit tests in `page.test.tsx`.

## Verification & Testing

- `npm run test -- src/app/(protected)/(instructor)/exams/reports` in `app/sentinel-web` (PASS: 4/4 test files, 23/23 tests).
- Verified: Search keystrokes preserve table shell and search input focus while showing non-blocking background fetching/skeleton table states, and Status column neatly contains action badges.

## Risks & Rollback

- Low risk: Filter and pagination parameters continue functioning without state regressions.
