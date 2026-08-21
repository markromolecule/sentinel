---
title: "Phase 1: API Data Layer, Onboarding Upsert, and Classroom Student Query"
type: phase
parent: "docs/tasks/2026/08/2026-08-21/task-streamline-classroom-student-enrollment-whitelisted/README.md"
phase: "01"
status: completed
created: "2026-08-21"
tags: [task, phase, backend, api, student-enrollment, onboarding, kysely]
---

# Phase 1: API Data Layer, Onboarding Upsert, and Classroom Student Query

## Objective

Refactor the API enrollment data layer so that any student present on the institutional `student_whitelist` can be enrolled into a classroom (creating or reusing `students` records with `user_id: null` if unclaimed). Update onboarding student creation to upsert on `(institution_id, student_number)` so that when an unclaimed enrolled student registers, their account is dynamically linked to their pre-existing classroom enrollments. Expose `is_claimed` and `claim_status` in classroom student responses.

## Dependencies & Prerequisites

- Master task plan defined. No external blockers.

## Impacted Files & Components

- `app/sentinel-api/src/modules/identity/enrollments/data/preview-student-enrollment.ts`: Updated preview logic to check existing enrollments against all `students` records (claimed and unclaimed) while classifying candidates as `CLAIMED`, `UNCLAIMED`, `ALREADY_ENROLLED`, or `NOT_WHITELISTED`.
- `app/sentinel-api/src/modules/identity/enrollments/data/enroll-students.ts`: Refactored enrollment logic to create or reuse `students` records for all whitelisted student numbers and insert into `enrollments`.
- `app/sentinel-api/src/modules/identity/onboarding/data/create-student.ts`: Added `onConflict` update on `(institution_id, student_number)` to link `user_id` to existing unclaimed student rows during onboarding.
- `app/sentinel-api/src/modules/core/classroom/services/classroom-students-query.service.ts`: Selected `is_claimed` and `claim_status` (`CASE WHEN st.user_id IS NOT NULL THEN 'CLAIMED' ELSE 'UNCLAIMED' END`).
- `app/sentinel-api/src/modules/core/classroom/helper/classroom-mappers.ts`: Passed `is_claimed` and `claim_status` in `buildClassroomStudentResponse`.
- `app/sentinel-api/src/modules/core/classroom/helper/classroom.types.ts` & `classroom.dto.ts`: Updated type and response schemas.
- `packages/shared/src/types/classroom.ts` & `packages/shared/src/schema/admin/classrooms/classroom-schema.ts`: Updated shared student types with `isClaimed` and `claimStatus`.

## Implementation Tasks

- [x] Task 1.1 — Update `previewStudentEnrollmentData` in `preview-student-enrollment.ts`:
  - Query all matching whitelist records for the provided student numbers.
  - Query existing `students` records for those student numbers and check `enrollments` for `classGroupId`.
  - For each student number, mark `ALREADY_ENROLLED` if already in the classroom, `CLAIMED` if whitelist has `claimed_user_id`, `UNCLAIMED` if whitelist has no `claimed_user_id`, or `NOT_WHITELISTED` if missing from whitelist.
- [x] Task 1.2 — Update `enrollStudentsData` in `enroll-students.ts`:
  - Verify each student against `student_whitelist` (and section department/course if specified).
  - Find or create `students` row for each valid whitelist record:
    - If `students` row doesn't exist, insert `{ student_number, institution_id, department_id, course_id, user_id: whitelist.claimed_user_id ?? null }`.
    - If `students` row exists, use its `student_id` (and link `user_id` if missing).
  - Insert into `enrollments` for `(class_group_id, student_id)` using `onConflict().doNothing()` to prevent duplicate entries.
  - Return `{ enrolledCount, failedCount, results }`.
- [x] Task 1.3 — Update `createStudentData` in `create-student.ts`:
  - Implemented `.insertInto('students').values(values).onConflict((oc) => oc.columns(['institution_id', 'student_number']).doUpdateSet({ user_id: values.user_id, department_id: values.department_id, course_id: values.course_id, updated_at: new Date() })).returning(...)`.
- [x] Task 1.4 — Update `getClassroomStudents` in `classroom-students-query.service.ts`:
  - Select `sql<boolean>`(st.user_id IS NOT NULL)`.as('is_claimed')` and `sql<string>`CASE WHEN st.user_id IS NOT NULL THEN 'CLAIMED' ELSE 'UNCLAIMED' END`.as('claim_status')`.
  - Ensure student name resolves to `COALESCE(up.first_name, sw.first_name)` and `COALESCE(up.last_name, sw.last_name)`.
- [x] Task 1.5 — Update shared types in `@sentinel/shared` and DTO schemas in `classroom.dto.ts`.
- [x] Task 1.6 — Add unit tests in `sentinel-api` verifying:
  - Enrollment of unclaimed whitelisted students.
  - Onboarding linking `user_id` to existing unclaimed student record.
  - Classroom student query returning claim status.

## Verification & Testing

- `pnpm --filter @sentinel/shared build`: Exited 0 (clean compilation).
- `pnpm --filter sentinel-api test src/modules/identity/enrollments`: Passed 16 test files (34/34 tests).
- `pnpm --filter sentinel-api test src/modules/identity/onboarding`: Passed 2 test files (9/9 tests including upsert assertion).
- `pnpm --filter sentinel-api test src/modules/core/classroom`: Passed 17 test files (62/62 tests).

## Risks & Rollback

- **Risk**: Potential conflict on `students` table if multiple concurrent enrollment requests target the same student number.
- **Mitigation**: Rely on database-level unique constraint `(institution_id, student_number)` and atomic upsert operations.
- **Rollback**: Revert `preview-student-enrollment.ts`, `enroll-students.ts`, and `create-student.ts` to previous versions.
