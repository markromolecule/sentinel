---
title: "Phase 3: Classroom Roster Status Display and Full End-to-End Verification"
type: phase
parent: "docs/tasks/2026/08/2026-08-21/task-streamline-classroom-student-enrollment-whitelisted/README.md"
phase: "03"
status: completed
created: "2026-08-21"
tags: [task, phase, frontend, roster, tanstack-table, verification, regression]
---

# Phase 3: Classroom Roster Status Display and Full End-to-End Verification

## Objective

Enhance the classroom roster table on `/classrooms/[id]` with a clear Account / Claim Status column displaying `Claimed` (green badge) vs `Unclaimed` (amber badge: "Pending Claim"), and perform comprehensive end-to-end verification across the monorepo.

## Dependencies & Prerequisites

- Phase 1 & Phase 2 completed.

## Impacted Files & Components

- `app/sentinel-web/src/app/(protected)/(instructor)/classrooms/[id]/page.tsx`: Added `Account Status` column in `buildStudentColumns` with `Claimed` (green) vs `Pending Claim` (amber) badges.
- `packages/services/src/api/classrooms.ts`: Mapped `isClaimed` and `claimStatus` from backend to frontend models.
- Monorepo packages & applications verified via automated test suites and full Turborepo production build.

## Implementation Tasks

- [x] Task 3.1 — Update `buildStudentColumns` in `classrooms/[id]/page.tsx`:
  - Added a `status` column accessor:
    - If `row.original.isClaimed` (or `row.original.userId !== null`), renders emerald `Claimed` badge with dot.
    - If `!row.original.isClaimed`, renders amber `Pending Claim` badge with tooltip: *"Account exists on whitelist; student has not completed registration yet. It will activate automatically upon student login."*
  - Retained `select`, `studentNumber`, `fullName`, `course`, `department`, `enrolledAt`, and `actions` columns.
- [x] Task 3.2 — Ensured classroom student action cell and bulk delete logic seamlessly support both claimed and unclaimed student rows.
- [x] Task 3.3 — Executed test suites across backend and frontend packages:
  - `pnpm --filter sentinel-api test src/modules/identity/enrollments` (16 files, 34 tests passed)
  - `pnpm --filter sentinel-api test src/modules/identity/onboarding` (2 files, 9 tests passed)
  - `pnpm --filter sentinel-api test src/modules/core/classroom` (17 files, 62 tests passed)
  - `pnpm --filter sentinel-web test src/app/(protected)/(instructor)/students/_hooks/student-enrollment/student-enrollment-result.test.ts` (5 tests passed)
- [x] Task 3.4 — Verified Next.js production build (`pnpm --filter sentinel-web build`): 58/58 static & dynamic pages generated successfully.
- [x] Task 3.5 — Verified full Turborepo workspace build (`pnpm build`): 10/10 tasks successful.

## Verification & Testing

- `pnpm build`: 10/10 packages and applications built cleanly (0 errors).
- `pnpm --filter sentinel-api test src/modules/identity/enrollments src/modules/identity/onboarding src/modules/core/classroom`: 35 test files passed (105 tests).
- `pnpm --filter sentinel-web test src/app/(protected)/(instructor)/students/_hooks/student-enrollment/student-enrollment-result.test.ts`: 5/5 tests passed.

## Risks & Rollback

- **Risk**: Visual clutter on narrower screen sizes.
- **Mitigation**: Compact badge component with subtle ring borders and badge dot matching the Sentinel UI design system.
- **Rollback**: Revert `buildStudentColumns` in `classrooms/[id]/page.tsx`.
