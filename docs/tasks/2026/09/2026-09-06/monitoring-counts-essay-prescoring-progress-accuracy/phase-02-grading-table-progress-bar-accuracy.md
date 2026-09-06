---
title: "Phase 2: Grading Table Progress Bar & Visual Cohort Accuracy"
type: phase
parent: "monitoring-counts-essay-prescoring-progress-accuracy"
phase: "02"
status: completed
created: "2026-09-06"
tags: [task, phase, grading, progress-bar, ui]
---

# Phase 2: Grading Table Progress Bar & Visual Cohort Accuracy

## Objective

Fix the progress bar calculation on the instructor grading list (`/exams?view=grade`), eliminating the bug where 1 graded student out of 46 enrolled students renders a 100% full bar.

## Dependencies & Prerequisites

- None.

## Impacted Files & Components

- [`app/sentinel-web/src/app/(protected)/(instructor)/exams/grading/_components/columns.tsx`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/(protected)/(instructor)/exams/grading/_components/columns.tsx): Correct progress calculation and implement a dual-layer or cohort-accurate visual progress indicator.
- [`app/sentinel-web/src/app/(protected)/(instructor)/exams/grading/_components/columns.test.tsx`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/(protected)/(instructor)/exams/grading/_components/columns.test.tsx): Unit / Component tests for grading columns.

## Implementation Tasks

- [x] **Task 2.1 (Cohort-Accurate Calculation):**
  - In `columns.tsx`, inspect:

    ```ts
    const total = row.original.totalStudents;
    const submitted = row.original.submittedCount;
    const graded = row.original.gradedCount;
    ```

  - Replace `progressBase = submitted > 0 ? submitted : total` with a clear, dual-layer presentation:
    - **Graded Progress relative to Total Class:** `gradedPercentage = total > 0 ? Math.round((graded / total) * 100) : 0;`
    - **Submitted Progress relative to Total Class:** `submittedPercentage = total > 0 ? Math.round((submitted / total) * 100) : 0;`
- [x] **Task 2.2 (Dual-Layer Visual Progress Bar):**
  - Render a stacked progress track:

    ```tsx
    <div className="bg-secondary relative h-2 w-full max-w-[100px] overflow-hidden rounded-full">
        {/* Submitted progress (lighter tint) */}
        <div
            className="bg-primary/30 absolute top-0 left-0 h-full transition-all"
            style={{ width: `${submittedPercentage}%` }}
        />
        {/* Graded progress (solid primary) */}
        <div
            className="bg-primary absolute top-0 left-0 h-full transition-all"
            style={{ width: `${gradedPercentage}%` }}
        />
    </div>
    ```

  - Clear text indicator:

    ```tsx
    <span className="text-muted-foreground text-xs">
        {graded}/{submitted} graded • {submitted}/{total} submitted
    </span>
    ```

- [x] **Task 2.3 (Zero-Division & Edge Cases):**
  - If `total === 0` and `submitted === 0`, render 0% gracefully.
  - If `submitted === 0`, display `0/0 graded • 0/{total} submitted`.

## Verification & Testing

- **Grading Test Suite:**
  - Command: `vitest run --passWithNoTests src/app/(protected)/(instructor)/exams/grading`
  - Result: **PASS** (8 test files passed, 22/22 tests passed, 0 failures)
  - Verified `columns.test.tsx` (9 tests passed):
    - 1 submitted / 1 graded out of 46: `2%` width bar, text `1/1 graded • 1/46 submitted`.
    - Partial submissions / grading (25/50 submitted, 10/50 graded): `50%` submitted bar, `20%` graded bar, text `10/25 graded • 25/50 submitted`.
    - Zero division (`total === 0`): `0%` width bar, text `0/0 graded • 0/0 submitted`.
    - Edge case (`submitted === 0` with `total === 46`): `0%` width bar, text `0/0 graded • 0/46 submitted`.
    - Clamp boundary (`submitted/graded > total`): Clamped to `100%`.
    - Column headers, date formatting, navigation link, and section facet filtering verified.
- **Lint & Type Safety:**
  - `eslint`: 0 errors, 0 warnings.
  - `tsc`: 0 errors in touched files.

## Risks & Rollback

- **Low Risk:** Purely presentational in `columns.tsx`.
- **Rollback:** Revert changes to `columns.tsx` and delete `columns.test.tsx`.
