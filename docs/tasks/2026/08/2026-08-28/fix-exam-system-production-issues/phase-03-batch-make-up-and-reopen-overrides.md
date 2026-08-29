---
title: "Phase 3: Batch Make-up Provisioning & Instructor Reopen Overrides"
type: phase
parent: "docs/tasks/2026/08/2026-08-28/fix-exam-system-production-issues/README.md"
phase: "3"
status: completed
created: "2026-08-28"
tags: [task, phase, overrides, makeup, reopen, lifecycle]
---

# Phase 3: Batch Make-up Provisioning & Instructor Reopen Overrides (ISSUE-04, ISSUE-04b, ISSUE-05)

## Objective

Implement batch make-up exam scheduling directly attached to the parent exam (creating batch `StudentExamAccessOverride` records with `overrideType: 'MAKEUP'`) so make-up attempts naturally merge into the original exam's grade sheet without duplicating exam entities, and provide 1-click tools for instructors to reopen/unlock locked students.

## Dependencies & Prerequisites

- Phase 2 completed.

## Impacted Files & Components

- **Modified & New:**
  - `packages/shared/src/schema/exams/student-overrides-schema.ts`: Define schema `batchCreateStudentExamAccessOverrideSchema` accepting `studentIds: string[]`, `availableFrom`, `availableUntil`, `notes`.
  - `app/sentinel-api/src/modules/examination/student-overrides/student-overrides.service.ts`: Add `batchCreateStudentExamAccessOverrides` executing atomic multi-row insert.
  - `app/sentinel-api/src/modules/examination/student-overrides/controllers/batch-create-overrides.controller.ts`: Create OpenAPI endpoint `POST /exams/:id/overrides/batch-makeup`.
  - `packages/services/src/api/exams/student-overrides.ts`: Add client SDK `batchCreateStudentExamAccessOverrides()`.
  - `app/sentinel-web/src/app/(protected)/(instructor)/exams/reports/[examId]/_components/batch-makeup-dialog.tsx`: Add batch make-up dialog in Attempt Summary Report.
  - `app/sentinel-web/src/features/exams/monitoring/_components/locked-students-panel.tsx`: Add locked students panel with 1-click unlock / reopen action.

## Implementation Tasks

- [x] Task 3.1 — Schema & Validation in `packages/shared`:
  - Add `batchCreateStudentExamAccessOverrideSchema` with `studentIds: z.array(z.string().uuid()).min(1)`, `availableFrom: z.string()`, `availableUntil: z.string()`, `notes: z.string().optional()`.
- [x] Task 3.2 — Backend Service & Endpoint:
  - In `student-overrides.service.ts`, implement `batchCreateStudentExamAccessOverrides` using database batch transaction.
  - Register OpenAPI endpoint `POST /exams/:id/overrides/batch-makeup` in `student-overrides.routes.ts`.
- [x] Task 3.3 — Client SDK & Hooks:
  - Add `batchCreateStudentExamAccessOverrides` to `packages/services/src/api/exams/student-overrides.ts`.
  - Add `useBatchCreateExamOverridesMutation` hook in `packages/hooks`.
- [x] Task 3.4 — Instructor UI Components:
  - In Attempt Summary Report, add multi-select student checkboxes and a "Schedule Group Make-up" button opening `BatchMakeupDialog`.
  - In Monitoring view, add `LockedStudentsPanel` displaying locked or disconnected students with a 1-click "Unlock / Grant 15m Window" action invoking `grantReopenAttemptWindow`.

## Verification & Testing

- Run student overrides tests:

  ```bash
  pnpm --filter sentinel-api test student-overrides
  # PASS: 1/1 test file passed, 2/2 tests passed
  pnpm --filter @sentinel/shared test student-override-schema
  # PASS: 1/1 test file passed, 5/5 tests passed
  ```

- Run web reports & monitoring component tests:

  ```bash
  pnpm --filter sentinel-web test reports
  # PASS: 7/7 test files passed, 33/33 tests passed
  pnpm --filter sentinel-web test monitoring
  # PASS: 20/20 test files passed, 119/119 tests passed
  ```


## Risks & Rollback

- **Risk:** Concurrent make-up overrides might conflict if an active override already exists for a student.
- **Mitigation:** The batch service handles upsert or supersedes previous unused overrides cleanly.
