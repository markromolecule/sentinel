---
title: "Phase 1: Expand Add Student Modal Widths in sentinel-web and sentinel-core"
type: phase
parent: "docs/tasks/2026/08/2026-08-21/task-expand-student-enrollment-modal-width/README.md"
phase: "01"
status: completed
created: "2026-08-21"
tags: [task, phase, frontend, dialog, modal, tailwind, responsive]
---

# Phase 1: Expand Add Student Modal Widths in sentinel-web and sentinel-core

## Objective

Update the `DialogContent` max-width container classes across both `sentinel-web` and `sentinel-core` to provide a wide, clean layout (`w-[calc(100vw-2rem)] sm:max-w-4xl lg:max-w-5xl`) for the student enrollment and classlist import dialogs.

## Dependencies & Prerequisites

- None.

## Impacted Files & Components

- `app/sentinel-web/src/app/(protected)/(instructor)/classrooms/_components/classroom-student-enrollment-dialog.tsx`: Updated `DialogContent` from `max-w-3xl` to `w-[calc(100vw-2rem)] sm:max-w-4xl lg:max-w-5xl`.
- `app/sentinel-web/src/app/(protected)/(instructor)/students/_components/dialogs/student-enrollment-dialog.tsx`: Updated `DialogContent` from `w-[calc(100vw-2rem)] max-w-[56rem]` to `w-[calc(100vw-2rem)] sm:max-w-4xl lg:max-w-5xl`.
- `app/sentinel-core/src/features/administration/classrooms/_components/classroom-student-enrollment-dialog.tsx`: Updated `DialogContent` from `max-w-3xl` to `w-[calc(100vw-2rem)] sm:max-w-4xl lg:max-w-5xl`.

## Implementation Tasks

- [x] Task 1.1 — Update `ClassroomStudentEnrollmentDialog` in `sentinel-web`:
  - Modified `DialogContent` className in `app/sentinel-web/src/app/(protected)/(instructor)/classrooms/_components/classroom-student-enrollment-dialog.tsx` to use `w-[calc(100vw-2rem)] sm:max-w-4xl lg:max-w-5xl`.
- [x] Task 1.2 — Update `StudentEnrollmentDialog` in `sentinel-web`:
  - Modified `DialogContent` className in `app/sentinel-web/src/app/(protected)/(instructor)/students/_components/dialogs/student-enrollment-dialog.tsx` to use `w-[calc(100vw-2rem)] sm:max-w-4xl lg:max-w-5xl`.
- [x] Task 1.3 — Update `ClassroomStudentEnrollmentDialog` in `sentinel-core`:
  - Modified `DialogContent` className in `app/sentinel-core/src/features/administration/classrooms/_components/classroom-student-enrollment-dialog.tsx` to use `w-[calc(100vw-2rem)] sm:max-w-4xl lg:max-w-5xl`.
- [x] Task 1.4 — Build verification:
  - `pnpm --filter sentinel-web build` (58/58 routes generated, 0 errors)
  - `pnpm --filter sentinel-core build` (49/49 routes generated, 0 errors)

## Verification & Testing

- `pnpm --filter sentinel-web build`: Completed successfully with 0 errors.
- `pnpm --filter sentinel-core build`: Completed successfully with 0 errors.

## Risks & Rollback

- **Risk**: Modal overflowing screen on ultra-small viewports.
- **Mitigation**: `w-[calc(100vw-2rem)]` preserves a mandatory 1rem margin on all screen sizes, while `sm:max-w-4xl lg:max-w-5xl` ensures controlled growth on tablets and desktop monitors.
- **Rollback**: Revert the `className` on the three `DialogContent` elements.
