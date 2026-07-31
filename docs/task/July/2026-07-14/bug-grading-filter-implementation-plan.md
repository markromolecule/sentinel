# Implementation Plan - Grading Page Filtering Bug Fix

## Goal

Replace the general sections filter dropdown with a client-side facet filter derived dynamically from the assigned sections of the available exams. Clean up header spacing and breadcrumbs in the grading layouts.

## Pre-Planning

- [x] Read and summarize the task input in one sentence: Resolve grading list filtering issues by using dynamic section facets derived from fetched exams, and clean up headers and breadcrumbs.
- [x] Scan relevant source files to understand existing patterns.
- [x] Identify all files, services, and DB tables the task will touch.
- [x] Determine if a Prisma migration is needed: No migration is required.

---

## Phase 1: Column Definitions & Hook Alignments

**Goal:** Define the hidden filtering column and align hooks for client-side filtering.

- [ ] Add hidden `sectionName` filter column with a custom `filterFn` in [columns.tsx](<file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/(protected)/(instructor)/exams/grading/_components/columns.tsx>)
- [ ] Update unit tests for the grading columns if applicable
- [ ] Run `pnpm test` and confirm all tests pass

**Migration required:** No

---

## Phase 2: Grading List Component

**Goal:** Implement dynamic section extraction and replace the dropdown with a faceted filter.

- [ ] Modify [grading-list.tsx](<file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/(protected)/(instructor)/exams/grading/_components/grading-list.tsx>) to fetch all exams, extract unique sections, and render a faceted filter.
- [ ] Write unit tests for [grading-list.tsx](<file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/(protected)/(instructor)/exams/grading/_components/grading-list.tsx>) if needed
- [ ] Run `pnpm test` and confirm all tests pass

**Migration required:** No

---

## Phase 3: Layout Spacing and Breadcrumbs Clean Up

**Goal:** Remove breadcrumbs and add separators to the grading and grading/[id] headers.

- [ ] Add `<Separator />` after the page header in [page.tsx](<file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/(protected)/(instructor)/exams/grading/page.tsx>)
- [ ] Add `<Separator />` after the page header in [grading-view.tsx](<file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/(protected)/(instructor)/exams/dashboard/_views/grading-view.tsx>)
- [ ] Remove breadcrumbs and add `<Separator />` in [page.tsx](<file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/(protected)/(instructor)/exams/grading/[examId]/page.tsx>)
- [ ] Run build verification `pnpm build` to check for type-safety and syntax issues

**Migration required:** No

---

## Done Criteria

- Every task references a concrete file or function.
- Each phase has at least one test task or validation script.
- All client-side facet operations filter exams correctly.
- Separation lines and clean headers are visible and correctly spaced.
