---
title: "Phase 03: Monorepo Vitest Suite and Next.js Build Verification"
type: phase
parent: "task-fix-react-error-185-max-update-depth"
phase: "03"
status: completed
created: "2026-08-22"
tags: [task, phase, verification, build, testing]
---

# Phase 03: Monorepo Vitest Suite and Next.js Build Verification

## Objective

Execute regression tests and production build checks across `sentinel-web` and `sentinel-core` to verify that all infinite re-render loops and filter errors are eliminated with zero regressions.

## Dependencies & Prerequisites

- Phase 01 Completed: [`phase-01-fix-question-bank-import-hooks.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/tasks/2026/08/2026-08-22/task-fix-react-error-185-max-update-depth/phase-01-fix-question-bank-import-hooks.md)
- Phase 02 Completed: [`phase-02-fix-assignment-builder-room-query.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/tasks/2026/08/2026-08-22/task-fix-react-error-185-max-update-depth/phase-02-fix-assignment-builder-room-query.md)

## Implementation Tasks

- [x] **Task 1 (Targeted Vitest Suite):**
  - Run all question bank selection and modal test files in `sentinel-web` and `sentinel-core`.
  - Run all assignment builder and room combobox test files in `sentinel-web` and `sentinel-core`.
- [x] **Task 2 (Next.js Production Build):**
  - Run `pnpm --filter sentinel-web build` to verify Turbopack bundling, TypeScript typecheck, and static page generation.
- [x] **Task 3 (Documentation & Evidence):**
  - Record execution artifacts, logs, and completion status across task documentation.

## Verification & Testing Evidence

- `pnpm --filter sentinel-web test use-question-bank-import-selection.test.ts` (PASS: 2/2 tests in 9ms)
- `pnpm --filter sentinel-web test use-question-bank-import-modal.test.ts` (PASS: 1/1 test in 7ms)
- `pnpm --filter sentinel-core test use-question-bank-import-selection.test.ts` (PASS: 2/2 tests in 9ms)
- `pnpm --filter sentinel-core test use-question-bank-import-modal.test.ts` (PASS: 1/1 test in 8ms)
- `pnpm --filter sentinel-web test new-assignments-builder.test.tsx row-room-combobox.test.tsx` (PASS: 9/9 tests in 4.51s)
- `pnpm --filter sentinel-core test new-assignments-builder.test.tsx row-classroom-combobox.test.tsx` (PASS: 6/6 tests in 3.69s)
- `pnpm --filter sentinel-web test src/features/exams/config/_hooks/use-exam-edit-form.test.ts` (PASS: 3/3 tests in 13ms)
- `pnpm --filter sentinel-web test use-exam-session.test.tsx` (PASS: 9/9 tests in 139ms)
- `pnpm --filter sentinel-web build` (PASS: 58/58 static pages generated in 10.9s Turbopack build)
