---
title: "Phase 4: Instructor Lobby & Live Monitoring Re-Entry UI"
type: phase
parent: "docs/tasks/2026/09/2026-09-03/fix-002-student-reconnect-and-instructor-reentry-fixes/README.md"
phase: "4"
status: completed
created: "2026-09-03"
tags: [task, phase, examination, web, instructor, monitoring, lobby]
---

# Phase 4: Instructor Lobby & Live Monitoring Re-Entry UI

## Objective

Provide instructors with an immediate, high-visibility 1-click "Authorize Re-entry" action in both the **Lobby Waiting Queue** (`InstructorLobbyAdmissionPanel`) and the **Live Monitoring Student Drawer**, enabling them to easily unblock locked or reconnect-exhausted students.

## Dependencies & Prerequisites

- Phase 2 complete (backend re-entry authorization endpoint and mutation hook available).

## Impacted Files & Components

- `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/lobby/_components/instructor-lobby-admission-panel.tsx`:
  - Upgraded student row actions in the "Waiting" and "In Attempt" columns to show 1-click "Authorize Re-entry" button for candidates with active attempts, locked lifecycles, or exhausted reconnect limits.
- `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/lobby/_hooks/use-instructor-lobby.ts`:
  - Wired `useAuthorizeStudentReentryMutation` to `handleAuthorizeReentry`.
- `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/lobby/page.tsx`:
  - Forwarded `authorizingReentryStudentId` and `onAuthorizeReentry` to `InstructorLobbyAdmissionPanel`.
- `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/monitoring/_hooks/use-monitoring/use-lifecycle.ts`:
  - Added `handleAuthorizeReentry` into monitoring lifecycle actions using `useAuthorizeStudentReentryMutation`.
- `app/sentinel-web/src/features/exams/monitoring/_components/locked-students-panel.tsx`:
  - Upgraded action buttons to provide primary 1-click "Authorize Re-entry" button that atomically resets reconnects and unlocks attempt, and fixed zero-reconnect filtering logic.
- `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/monitoring/page.tsx`:
  - Connected `handleAuthorizeReentry` to student list reconnect actions.
- Tests updated and added:
  - `instructor-lobby-admission-panel.test.tsx`
  - `use-instructor-lobby.test.tsx`
  - `lobby/page.test.tsx`
  - `use-monitoring.test.tsx`
  - `locked-students-panel.test.tsx`

## Implementation Tasks

- [x] **Task 4.1 — Lobby Admission Panel Re-Entry Action:**
  - In `InstructorLobbyAdmissionPanel`: renders prominent "Authorize Re-entry" button for students in waiting queue or in-attempt column who need re-entry authorization.
- [x] **Task 4.2 — Lobby Hook Integration:**
  - In `use-instructor-lobby.ts`: wired `useAuthorizeStudentReentryMutation` with pending student state tracking, toast confirmation, and automatic lobby refresh.
- [x] **Task 4.3 — Monitoring Student Drawer & Panel Integration:**
  - In `use-lifecycle.ts` and `locked-students-panel.tsx`: single-click invokes mutation, lifts locks, resets reconnect count, and shows toast.
- [x] **Task 4.4 — Component Tests:**
  - Added test coverage in `instructor-lobby-admission-panel.test.tsx`, `use-instructor-lobby.test.tsx`, `use-monitoring.test.tsx`, and `locked-students-panel.test.tsx`.

## Verification & Testing

```bash
pnpm --filter sentinel-web test src/app/\(protected\)/\(instructor\)/exams/\[id\]/lobby/ src/app/\(protected\)/\(instructor\)/exams/\[id\]/monitoring/ src/features/exams/monitoring/_components/locked-students-panel.test.tsx
```
**Output:**
```
✓ src/app/(protected)/(instructor)/exams/[id]/lobby/_lib/lobby-admission-filters.test.ts (9 tests) 9ms
✓ src/app/(protected)/(instructor)/exams/[id]/lobby/_hooks/use-instructor-lobby.test.tsx (5 tests) 14ms
✓ src/app/(protected)/(instructor)/exams/[id]/monitoring/_hooks/use-monitoring.test.tsx (9 tests) 26ms
✓ src/app/(protected)/(instructor)/exams/[id]/monitoring/page.test.tsx (2 tests) 92ms
✓ src/app/(protected)/(instructor)/exams/[id]/lobby/page.test.tsx (3 tests) 101ms
✓ src/features/exams/monitoring/_components/locked-students-panel.test.tsx (3 tests) 122ms
✓ src/app/(protected)/(instructor)/exams/[id]/lobby/_components/instructor-lobby-admission-panel.test.tsx (8 tests) 232ms

Test Files  7 passed (7)
     Tests  39 passed (39)
```

## Risks & Rollback

- **Risk:** Button cluttering the student row in the lobby queue.
- **Mitigation:** Only shown when the student actually needs re-entry authorization (reconnects exhausted, active attempt, or lifecycle locked).
