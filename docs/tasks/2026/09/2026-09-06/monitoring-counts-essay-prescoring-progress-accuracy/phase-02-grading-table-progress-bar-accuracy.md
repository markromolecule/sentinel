---
title: "Phase 2: Grading Table Progress Bar & Visual Cohort Accuracy"
type: phase
parent: "monitoring-counts-essay-prescoring-progress-accuracy"
phase: "02"
status: planned
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
- Unit / Component tests for grading columns.

## Implementation Tasks

- [ ] **Task 2.1 (Cohort-Accurate Calculation):**
  - In `columns.tsx`, inspect:

    ```ts
    const total = row.original.totalStudents;
    const submitted = row.original.submittedCount;
    const graded = row.original.gradedCount;
    ```

  - Replace `progressBase = submitted > 0 ? submitted : total` with a clear, dual-layer presentation:
    - **Graded Progress relative to Total Class:** `gradedPercentage = total > 0 ? Math.round((graded / total) * 100) : 0;`
    - **Submitted Progress relative to Total Class:** `submittedPercentage = total > 0 ? Math.round((submitted / total) * 100) : 0;`
- [ ] **Task 2.2 (Dual-Layer Visual Progress Bar):**
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

- [ ] **Task 2.3 (Zero-Division & Edge Cases):**
  - If `total === 0` and `submitted === 0`, render 0% gracefully.
  - If `submitted === 0`, display `0/0 graded • 0/{total} submitted`.

## Verification & Testing

- Run Web grading tests:

  ```bash
  pnpm --filter sentinel-web test src/app/\(protected\)/\(instructor\)/exams/grading
  ```

- Visual inspection via browser subagent or dev preview verifying that 1/46 submitted renders a ~2% bar instead of 100%.

## Risks & Rollback

- **Low Risk:** Purely presentational in `columns.tsx`.
- **Rollback:** Revert changes to `columns.tsx`.
