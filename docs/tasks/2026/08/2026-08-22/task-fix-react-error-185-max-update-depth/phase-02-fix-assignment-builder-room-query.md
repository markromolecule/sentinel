---
title: "Phase 02: Fix Assignment Builder Room Query & Filter Handling"
type: phase
parent: "task-fix-react-error-185-max-update-depth"
phase: "02"
status: completed
created: "2026-08-22"
tags: [task, phase, react, bugfix, assignments]
---

# Phase 02: Fix Assignment Builder Room Query & Filter Handling

## Objective

Resolve the `Uncaught TypeError: S.filter is not a function` on the Assignment page (`/exams/assign`) by fixing the room query data consumption and adding defensive array normalization in `new-assignments-builder.tsx`.

## Dependencies & Prerequisites

- Prior context: [`docs/context/August/22/production-react-error-185-resolution.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/context/August/22/production-react-error-185-resolution.md)

## Impacted Files & Components

- `app/sentinel-web/src/app/(protected)/(instructor)/exams/assign/_components/new-assignments-builder.tsx`
- `app/sentinel-web/src/app/(protected)/(instructor)/exams/assign/_components/row-room-combobox.tsx`
- `app/sentinel-web/src/app/(protected)/(instructor)/exams/assign/_components/new-assignments-builder.test.tsx`
- `app/sentinel-core/src/app/(protected)/exams/assign/_components/new-assignments-builder.tsx`
- `app/sentinel-core/src/app/(protected)/exams/assign/_components/assignment-builder-row.tsx`

## Implementation Tasks

- [x] **Task 1 (`new-assignments-builder.tsx` in `sentinel-web`):**
  - Switch `useRoomsQuery({ limit: 25, page: 1 })` to unpaginated `useRoomsQuery()`.
  - Add defensive array extraction: `const roomList = Array.isArray(rooms) ? (rooms as Room[]) : ((rooms as any)?.data ?? []);`.
  - Add defensive array extraction for `classrooms` in `filteredClassrooms`.
- [x] **Task 2 (`row-room-combobox.tsx`):**
  - Ensure `filteredRooms`, `selectedRoom`, and effects in `RowRoomCombobox` defensively handle non-array `rooms` or `searchedRooms` props.
- [x] **Task 3 (Core Parity):**
  - Apply the same defensive protections in `app/sentinel-core` assignment builder components (`new-assignments-builder.tsx` and `assignment-builder-row.tsx`).

## Verification & Testing

- `pnpm --filter sentinel-web test new-assignments-builder.test.tsx row-room-combobox.test.tsx` (PASS: 9/9 tests in 4.51s)
- `pnpm --filter sentinel-core test new-assignments-builder.test.tsx row-classroom-combobox.test.tsx` (PASS: 6/6 tests in 3.69s)

## Risks & Rollback

- Zero breaking API changes to exam assignment workflow.
