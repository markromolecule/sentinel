---
title: "Phase 2: Exam Session Sidebar Label Refinement"
type: phase
parent: "dashboard-name-score-dialog-sidebar-refinement"
phase: "02"
status: completed
created: "2026-09-06"
completed: "2026-09-06"
tags: [task, phase, sidebar, navigation]
---

# Phase 2: Exam Session Sidebar Label Refinement

## Objective

Streamline the exam session sidebar navigation items across `sentinel-web` and `sentinel-core` by renaming "Attempt Summary" to "Summary" and "Action Queue" to "Actions", while preserving exact route mapping and active section detection.

## Dependencies & Prerequisites

- Independent of Phase 1.

## Impacted Files & Components

- `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/_components/exam-session-nav.tsx`
- `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/_components/exam-session-nav.test.tsx`
- `app/sentinel-web/src/app/(protected)/(instructor)/exams/reports/[examId]/page.test.tsx`
- `app/sentinel-core/src/app/(protected)/exams/[id]/_components/exam-session-nav.tsx`
- `app/sentinel-core/src/app/(protected)/exams/[id]/_components/exam-session-nav.test.tsx`

## Implementation Tasks

- [x] In `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/_components/exam-session-nav.tsx`:
  - In `showReportSectionSidebar` items array:
    - Change `{ id: 'report', label: 'Attempt Summary', ... }` to `label: 'Summary'`.
    - Change `{ id: 'queue', label: 'Action Queue', ... }` to `label: 'Actions'`.
  - In regular runtime items array:
    - Change `{ id: 'report', label: 'Attempt Summary', ... }` to `label: 'Summary'`.
    - Change `{ id: 'queue', label: 'Action Queue', ... }` to `label: 'Actions'`.
- [x] In `app/sentinel-core/src/app/(protected)/exams/[id]/_components/exam-session-nav.tsx`:
  - In `showReportSectionSidebar` items array:
    - Change `{ id: 'report', label: 'Attempt Summary', ... }` to `label: 'Summary'`.
    - Change `{ id: 'queue', label: 'Action Queue', ... }` to `label: 'Actions'`.
  - In regular runtime items array:
    - Change `{ id: 'report', label: 'Attempt Summary', ... }` to `label: 'Summary'`.
    - Change `{ id: 'queue', label: 'Action Queue', ... }` to `label: 'Actions'`.
- [x] Update unit tests in `sentinel-web`:
  - Update `exam-session-nav.test.tsx` to search for role links named `'Summary'` and `'Actions'`.
  - Update `exams/reports/[examId]/page.test.tsx` to query role links named `'Summary'` and `'Actions'`.
- [x] Update unit tests in `sentinel-core`:
  - Update `exam-session-nav.test.tsx` to assert role links named `'Summary'` and `'Actions'`.

## Verification & Testing

- `pnpm --filter sentinel-web test src/app/(protected)/(instructor)/exams/[id]/_components/exam-session-nav.test.tsx src/app/(protected)/(instructor)/exams/reports/[examId]/page.test.tsx`
  - Output: 2 test files passed, 19 tests passed (13 nav tests + 6 report tests)
- `pnpm --filter sentinel-core test src/app/(protected)/exams/[id]/_components/exam-session-nav.test.tsx`
  - Output: 1 test file passed, 8 tests passed

## Risks & Rollback

- **Risk:** Breaking URL query parameters or active item highlighting.
- **Mitigation:** The active section calculation (`resolveActiveSection`) uses the `id` field (`'report'`, `'queue'`) and search params (`?section=attempts`, `?section=queue`), which remain 100% untouched.
- **Rollback:** Revert modifications to `exam-session-nav.tsx` and associated test files in git.
