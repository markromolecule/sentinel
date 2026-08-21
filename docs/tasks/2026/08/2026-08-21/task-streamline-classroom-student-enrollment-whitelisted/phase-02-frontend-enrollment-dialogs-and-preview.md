---
title: "Phase 2: Frontend Enrollment Dialogs, Parsing Helpers, and Single-Upload Flow"
type: phase
parent: "docs/tasks/2026/08/2026-08-21/task-streamline-classroom-student-enrollment-whitelisted/README.md"
phase: "02"
status: completed
created: "2026-08-21"
tags: [task, phase, frontend, react, enrollment-dialogs, file-upload]
---

# Phase 2: Frontend Enrollment Dialogs, Parsing Helpers, and Single-Upload Flow

## Objective

Update the frontend student enrollment hooks, helper functions, and modal dialogs to support the single-upload workflow: allow enrolling all whitelisted students (both claimed and unclaimed) in a single action, update button copy and validation, and provide clear preview breakdowns.

## Dependencies & Prerequisites

- Phase 1 completed (backend API accepts both claimed and unclaimed whitelisted students).

## Impacted Files & Components

- `app/sentinel-web/src/app/(protected)/(instructor)/students/_hooks/student-enrollment/student-enrollment-result.ts`: Added `getImportableStudents` and `getUnclaimedStudents`, fixed reason preservation on preview mapping.
- `app/sentinel-web/src/app/(protected)/(instructor)/students/_hooks/use-student-enrollment.ts`: Enrolls all valid whitelisted students and shows toast feedback with claimed and unclaimed counts.
- `app/sentinel-web/src/app/(protected)/(instructor)/classrooms/_components/classroom-student-enrollment-dialog.tsx`: Updated modal copy, helper text, and import button (`Import X Students (Y Claimed, Z Unclaimed)`).
- `app/sentinel-web/src/app/(protected)/(instructor)/students/_components/dialogs/student-enrollment-dialog.tsx`: Updated modal copy and import button logic.
- `app/sentinel-web/src/app/(protected)/(instructor)/students/_components/views/enrollment/enrollment-preview.tsx`: Updated filter tabs and status labels (Ready to Import, Claimed, Unclaimed, Already Enrolled, Not Whitelisted).
- `app/sentinel-web/src/app/(protected)/(instructor)/students/_components/views/enrollment/enrollment-summary.tsx`: Updated summary statistics banner with detailed breakdown.

## Implementation Tasks

- [x] Task 2.1 — Update `student-enrollment-result.ts`:
  - Added `getImportableStudents(students: StudentImportRow[])` returning all students whose `claimStatus` is either `'CLAIMED'` or `'UNCLAIMED'`.
  - Retained `getClaimedStudents` and `getNonClaimedStudents` for breakdown reporting.
- [x] Task 2.2 — Update `use-student-enrollment.ts`:
  - In `enrollStudents`, send all `importableStudents` (`CLAIMED` + `UNCLAIMED`) to `enrollStudentNumbers`.
  - Provide informative success toast detailing how many were enrolled (and how many are pending student claim).
- [x] Task 2.3 — Update `ClassroomStudentEnrollmentDialog`:
  - Updated Dialog description to reflect that all whitelisted student accounts can be enrolled.
  - In Manual Entry tab: updated helper text and allow submitting any whitelisted student number.
  - In Import File tab: enable the import button when `importableStudents.length > 0`, with label `Import ${importableCount} Students (${claimedCount} Claimed, ${unclaimedCount} Unclaimed)`.
- [x] Task 2.4 — Update `StudentEnrollmentDialog` similarly for general student enrollment.
- [x] Task 2.5 — Update `EnrollmentPreview` and `EnrollmentSummary` components to cleanly render the status of claimed vs unclaimed candidates.
- [x] Task 2.6 — Add unit tests for `student-enrollment-result.ts`.

## Verification & Testing

- `pnpm --filter sentinel-web test src/app/(protected)/(instructor)/students/_hooks/student-enrollment/student-enrollment-result.test.ts`: Passed 5/5 tests.

## Risks & Rollback

- **Risk**: Instructor confusion if they expect only claimed accounts.
- **Mitigation**: Clear badges and helper text in the preview and roster stating "Unclaimed accounts will automatically activate when students complete registration".
- **Rollback**: Revert `student-enrollment-result.ts` and dialog components.
