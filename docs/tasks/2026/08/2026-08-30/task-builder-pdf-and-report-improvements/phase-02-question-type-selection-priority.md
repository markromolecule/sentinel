---
title: "Phase 2: Blank Section Question Type Priority & Action Suppression"
type: phase
parent: "docs/tasks/2026/08/2026-08-30/task-builder-pdf-and-report-improvements/README.md"
phase: "02"
status: completed
created: "2026-08-30"
tags: [task, phase, builder, questions, sections]
---

# Phase 2: Blank Section Question Type Priority & Action Suppression

## Objective

Prioritize question type selection on untyped/blank question sections by placing the question type selection dropdown on the right side of the section header, and suppressing `Import from Bank` and `Add Question` action buttons until a question type has been chosen.

## Dependencies & Prerequisites

- Phase 1 completed.

## Impacted Files & Components

- `app/sentinel-web/src/features/exams/builder/_components/question-bucket-table/question-section-card.tsx`
- `app/sentinel-web/src/features/exams/builder/_components/question-bucket-table/shared.tsx`
- `app/sentinel-web/src/features/exams/builder/_components/question-bucket-table/sectioned-question-bucket-table.tsx`
- `app/sentinel-web/src/features/exams/builder/_components/question-bucket-table/question-section-card.test.tsx`
- `app/sentinel-core/src/features/exams/builder/_components/question-bucket-table/question-section-card.tsx`
- `app/sentinel-core/src/features/exams/builder/_components/question-bucket-table/shared.tsx`
- `app/sentinel-core/src/features/exams/builder/_components/question-bucket-table/sectioned-question-bucket-table.tsx`
- `app/sentinel-core/src/features/exams/builder/_components/question-bucket-table/question-section-card.test.tsx`

## Implementation Tasks

- [x] Task 1: Update `QuestionSectionCard` in `sentinel-web`:
  - When `!section.questionType` (untyped): Render the question type `<select>` on the right side next to Delete Section (if present). Hide `Import from Bank` and `Add Question` buttons.
  - When `section.questionType` is set: Display the section title, and render the `Import from Bank` and `Add Question` buttons on the right.
- [x] Task 2: Update `EmptySectionState` in `shared.tsx` (web and core) to accept `isTyped`. If untyped, render explanatory helper text directing the user to pick a question type first, without showing dead-end buttons.
- [x] Task 3: Mirror the changes in `sentinel-core` (`QuestionSectionCard.tsx`, `shared.tsx`, `sectioned-question-bucket-table.tsx`).
- [x] Task 4: Update test suites in `question-section-card.test.tsx` to assert that untyped sections position the selector on the right and hide question addition buttons.

## Verification & Testing

- `npm run test -- src/features/exams/builder/_components/question-bucket-table/question-section-card.test.tsx` in `app/sentinel-web` (PASS: 3/3 tests).
- `npm run test -- src/features/exams/builder/_components/question-bucket-table/question-section-card.test.tsx` in `app/sentinel-core` (PASS: 3/3 tests).
- Full builder test suites:
  - `sentinel-web`: 17 passed test files, 56 passed tests.
  - `sentinel-core`: 15 passed test files, 52 passed tests.

## Risks & Rollback

- Low risk: Typed behavior seamlessly engages once question type is chosen in the dropdown.
