---
title: "Phase 4: Cross-Portal Synchronization and Verification"
type: phase
parent: "dashboard-name-score-dialog-sidebar-refinement"
phase: "04"
status: completed
created: "2026-09-06"
completed: "2026-09-06"
tags: [task, phase, synchronization, core, verification]
---

# Phase 4: Cross-Portal Synchronization and Verification

## Objective

Synchronize the refined `AttemptReportOverrideDialog` into `sentinel-core` (or export/share component) so instructors in `sentinel-core` have access to the exact same high-fidelity score adjustment interface. Execute comprehensive type checks, lint checks, and unit test suites across `sentinel-web`, `sentinel-core`, and `sentinel-support`.

## Dependencies & Prerequisites

- Requires Phase 1, Phase 2, and Phase 3 to be completed.

## Impacted Files & Components

- `app/sentinel-core/src/features/exams/reports/attempt-report-utils.ts` (new)
- `app/sentinel-core/src/features/exams/reports/_types/index.ts` (new)
- `app/sentinel-core/src/features/exams/reports/_components/attempt-report-override-dialog.tsx` (new/synchronized)
- `app/sentinel-core/src/features/exams/reports/_components/index.ts` (new)
- `app/sentinel-core/src/features/exams/reports/_components/attempt-report-override-dialog.test.tsx` (new)

## Implementation Tasks

- [x] Align `sentinel-core` score adjustment capabilities:
  - Created `AttemptReportOverrideDialog` in `sentinel-core` matching the asymmetric 2-column layout and long-essay UX established in Phase 3.
  - Implemented `attempt-report-utils.ts` and `_types/index.ts` to supply formatting and typed draft structures.
  - Fixed React rules-of-hooks call order across both `sentinel-web` and `sentinel-core` dialogs.
- [x] Add unit tests in `sentinel-core` validating the override dialog rendering, long answer handling, score change callbacks, and blank answer fallback.
- [x] Execute full verification checks across all 3 portals:
  - `sentinel-web`: 7 test files, 49 tests passed.
  - `sentinel-core`: 3 test files, 27 tests passed.
  - `sentinel-support`: 1 test file, 15 tests passed.
  - Total: 91 tests passed across 11 test files.
- [x] Execute ESLint validation across all touched files:
  - 0 errors across all three applications.

## Verification & Testing

- Automated test runs:
  - `pnpm --filter sentinel-web test src/app/(protected)/(instructor)/dashboard/_components/dashboard-greeting.test.tsx src/app/(protected)/(instructor)/exams/[id]/_components/exam-session-nav.test.tsx src/app/(protected)/(instructor)/exams/reports/[examId]/page.test.tsx src/features/exams/reports/` (PASS: 49/49)
  - `pnpm --filter sentinel-core test src/app/(protected)/dashboard/_components/dashboard-greeting.test.tsx src/app/(protected)/exams/[id]/_components/exam-session-nav.test.tsx src/features/exams/reports/_components/attempt-report-override-dialog.test.tsx` (PASS: 27/27)
  - `pnpm --filter sentinel-support test src/app/(protected)/dashboard/_components/dashboard-greeting.test.tsx` (PASS: 15/15)
- Lint validation:
  - `eslint` passed with 0 errors across all touched files in `sentinel-web`, `sentinel-core`, and `sentinel-support`.

## Risks & Rollback

- **Risk:** Type mismatches between `sentinel-web` and `sentinel-core` attempt structures.
- **Mitigation:** Shared schema definitions from `@sentinel/shared` ensure consistent field shapes and score limits.
- **Rollback:** Revert git commits for Phase 4.
