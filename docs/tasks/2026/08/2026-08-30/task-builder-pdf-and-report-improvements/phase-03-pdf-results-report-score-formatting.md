---
title: "Phase 3: PDF Examination Results Report Score Formatting (Format A)"
type: phase
parent: "docs/tasks/2026/08/2026-08-30/task-builder-pdf-and-report-improvements/README.md"
phase: "03"
status: completed
created: "2026-08-30"
tags: [task, phase, pdf, reports, sentinel-api]
---

# Phase 3: PDF Examination Results Report Score Formatting (Format A)

## Objective

Fix the student score representation in the Examination Results Report PDF generator in `sentinel-api`. Ensure student scores are rendered in Format A (`score / totalScore` e.g., `14 / 30`) instead of appending a misleading `%` symbol to raw points, and evaluate failing score highlighting based on student percentage against the passing score threshold.

## Dependencies & Prerequisites

- Context specification confirmed Format A preference (`14 / 30`).

## Impacted Files & Components

- `app/sentinel-api/src/modules/general/pdf-documents/rendering/exam-results-report-view-model.ts`
- `app/sentinel-api/src/modules/general/pdf-documents/rendering/exam-results-report-renderer.ts`
- `app/sentinel-api/src/modules/general/pdf-documents/rendering/fixtures/exam-results-report.ts`
- `app/sentinel-api/src/modules/general/pdf-documents/rendering/tests/exam-results-report-view-model.test.ts`
- `app/sentinel-api/src/modules/general/pdf-documents/rendering/tests/exam-results-report-renderer.test.ts`

## Implementation Tasks

- [x] Task 1: Update `StudentAttemptRow` interface and `mapSourceToViewModel` in `exam-results-report-view-model.ts` to include `totalScore: number | null` and `percentage: number | null` mapped from the source report data.
- [x] Task 2: Update `exam-results-report-renderer.ts`:
  - Student score cell: Format string as `student.score !== null ? `${student.score} / ${student.totalScore ?? '—'}` : '—'`.
  - Pass/Fail styling: Apply red highlighting only when `studentPct !== null && studentPct < data.passingScore`.
  - Adjusted `studentCols` column widths (`Score: 60`, `Section: 75`, `Student Name: 135`) to cleanly accommodate `14 / 30`.
- [x] Task 3: Update and execute automated tests in `exam-results-report-renderer.test.ts` and `exam-results-report-view-model.test.ts` to verify the updated view model and score rendering.

## Verification & Testing

- `npm run test -- src/modules/general/pdf-documents/rendering/tests` in `app/sentinel-api` (PASS: 6/6 test files, 17/17 tests).
- `npm run test -- src/modules/general/pdf-documents/queue src/modules/general/pdf-documents/services src/modules/general/pdf-documents/rendering` in `app/sentinel-api` (PASS: 18/18 test files, 87/87 tests).
- Verified: Student score outputs `85 / 100` (Format A), failing threshold uses percentage calculation, and absent/in-progress students display `—` safely.

## Risks & Rollback

- Low risk: Null/undefined `totalScore` values fallback to `—` without runtime errors.
