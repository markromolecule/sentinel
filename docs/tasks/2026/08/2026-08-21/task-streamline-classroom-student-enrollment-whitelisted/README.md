---
title: "Streamline Classroom Student Enrollment with Whitelisted Accounts and Dynamic Claimed Status"
type: task
status: completed
created: "2026-08-21"
tags: [task, classroom, student-enrollment, student-whitelist, onboarding, dynamic-status, tanstack-table]
---

# Streamline Classroom Student Enrollment with Whitelisted Accounts and Dynamic Claimed Status

## Outcome

Streamline the classroom student enrollment process so instructors only need to upload their class list once. All students found in the institutional `student_whitelist` are enrolled into the classroom immediately—even if they have not yet claimed their accounts. When unclaimed students later register and complete onboarding, their account status dynamically updates and seamlessly connects to their existing classroom enrollments without requiring instructors to re-upload or re-enroll.

---

## Pre-planning record

### Actors and goals

- **Instructor**: Uploads an entire section/subject class list once. Enrolls all valid whitelisted students immediately (both claimed and unclaimed), sees the current claim status in the classroom roster, and avoids repetitive uploads as students claim accounts over time.
- **Student**: Signs up and onboards at any point during the term, and is immediately and automatically linked to all pre-enrolled classrooms and exams without manual instructor intervention.
- **Academic Admin / Platform**: Prevents duplicate student entries across `students` and `enrollments` tables, maintains strict foreign-key integrity between `student_whitelist`, `students`, `auth.users`, and `class_groups`.

### Domain language

- **Student Whitelist (`student_whitelist`)**: Institutional pre-registration roster containing `student_number`, name, `department_id`, `course_id`, and optional `claimed_user_id` once claimed.
- **Academic Student Record (`students`)**: The internal academic identity entity (`student_id`, `user_id`, `student_number`, `institution_id`, `department_id`, `course_id`). If the student has not yet claimed their account, `user_id` is `NULL`.
- **Classroom Enrollment (`enrollments`)**: The link between a class group (`class_groups`) and an academic student (`students`).
- **Claimed Student**: A student whose `student_whitelist` and `students` rows are linked to an active `auth.users` record (`user_id !== null`).
- **Unclaimed Student**: A student on the institutional whitelist who is enrolled in the classroom but has not yet completed account registration (`user_id === null`).

### Scenario coverage

| ID | Actor and situation | Preconditions | Expected outcome | Failure/recovery | Status |
|---|---|---|---|---|---|
| SC-01 | Instructor uploads classlist containing claimed and unclaimed students | Instructor is managing a classroom (`/classrooms/[id]`); classlist contains valid whitelisted student numbers | All whitelisted students (both claimed and unclaimed) are parsed, previewed, and enrolled in a single click | Students not found in the whitelist are flagged with reason `NOT_WHITELISTED` | Planned |
| SC-02 | Instructor uploads classlist containing already-enrolled students | Some students in the spreadsheet are already in the classroom | Duplicate enrollments are safely skipped and reported as `ALREADY_ENROLLED` without breaking the batch | `ON CONFLICT (class_group_id, student_id) DO NOTHING` prevents duplicate DB entries | Planned |
| SC-03 | Instructor views classroom roster | Classroom has both claimed and unclaimed enrolled students | Roster displays all enrolled students with their student number, name (from whitelist or profile), course, department, and a distinct Claim Status badge (`Claimed` / `Unclaimed`) | Fallback to whitelisted name if user profile does not exist yet | Planned |
| SC-04 | Unclaimed enrolled student completes onboarding | Student was enrolled while unclaimed (`user_id = null`); student registers and finishes onboarding | `completeStudentOnboarding` links existing `students` record to `user_id`. Student instantly sees their classrooms on `/student` without instructor re-upload | Upsert on `(institution_id, student_number)` updates `user_id` without creating duplicates | Planned |
| SC-05 | Instructor adds a student via Manual Entry | Instructor inputs student number for an unclaimed whitelisted student | Student is verified against `student_whitelist`, `students` row is created/reused, and `enrollments` row is inserted successfully | Rejects only if not found on institutional whitelist | Planned |

### Decision ledger

| ID | Question | Decision | Evidence or rationale | Alternatives rejected | Artifact |
|---|---|---|---|---|---|
| DEC-01 | How should unclaimed students be stored in `students` and `enrollments`? | Create or reuse a `students` record with `user_id: null` transferring metadata from `student_whitelist`, and create `enrollments` linking `class_group_id` and `student_id` | `model students` already supports nullable `user_id` with `@@unique([institution_id, student_number])`. `enrollments` references `student_id`. This allows full relational integrity before user account creation. | Requiring `user_id` for all enrollments (forced instructors to re-upload multiple times). | Phase 1 |
| DEC-02 | How to ensure idempotency and prevent duplicate records during enrollment? | Look up existing `students` by `(institution_id, student_number)` and check `enrollments` for `(class_group_id, student_id)` using unique constraints | Prevents duplicate student rows and duplicate enrollment rows even on repeated uploads. | Creating duplicate `students` entries per classroom upload. | Phase 1 |
| DEC-03 | How should student onboarding link to pre-created unclaimed `students` records? | Update `createStudentData` to perform an upsert on `(institution_id, student_number)`: if row exists, set `user_id = userId` and update timestamps | All prior classroom enrollments (`enrollments`) already reference that `student_id`, so linking `user_id` instantly activates all classrooms for the student. | Deleting pre-existing enrollments and requiring re-enrollment. | Phase 1 |
| DEC-04 | What should the frontend import button and preview behavior be? | Enable importing all whitelisted students (`CLAIMED` + `UNCLAIMED`), showing count breakdown (e.g. `Import 40 Students (35 Claimed, 5 Unclaimed)`) | Meets user requirement: upload once and enroll everyone on the class list who is whitelisted. | Restricting enrollment strictly to claimed accounts. | Phase 2 |
| DEC-05 | How should the classroom roster reflect claim status? | Add a `Status` column in `/classrooms/[id]` with visual badges: `Claimed` (green) and `Unclaimed` (amber with tooltip) | Gives instructors immediate visibility into which students have logged in and which are pending onboarding. | Hiding unclaimed students from the roster view. | Phase 3 |

### Unknowns and blockers

- *None.* All schema models, data access functions, API controllers, TanStack Query hooks, and UI components have been inspected.

---

## Acceptance criteria

| ID | Source goal/scenario/decision | Criterion | Implementation | Verification | Status |
|---|---|---|---|---|---|
| AC-01 | SC-01, DEC-01, DEC-04 | `previewStudentEnrollmentData` treats both `CLAIMED` and `UNCLAIMED` whitelisted students as valid import candidates | Update `preview-student-enrollment.ts` to flag `CLAIMED` vs `UNCLAIMED` without rejecting unclaimed students | Vitest unit test / preview endpoint test | Planned |
| AC-02 | SC-01, SC-02, DEC-01, DEC-02 | `enrollStudentsData` successfully enrolls all whitelisted students (claimed and unclaimed) without duplicate entries | Update `enroll-students.ts` to create/reuse `students` (`user_id: null` if unclaimed) and insert into `enrollments` | Vitest unit test with mixed claimed/unclaimed batch | Planned |
| AC-03 | SC-04, DEC-03 | `completeStudentOnboarding` upserts `students` row, linking `user_id` to existing unclaimed `students` records | Update `create-student.ts` with `onConflict` update on `(institution_id, student_number)` | Vitest onboarding unit test | Planned |
| AC-04 | SC-03, DEC-05 | Classroom student query returns `is_claimed` / `claim_status` and falls back to whitelist names for unclaimed students | Update `classroom-students-query.service.ts` and `classroom-mappers.ts` | Vitest query test / API route test | Planned |
| AC-05 | SC-01, DEC-04 | Frontend `useStudentEnrollment` and `ClassroomStudentEnrollmentDialog` enable importing both claimed and unclaimed whitelisted students | Update `use-student-enrollment.ts`, `student-enrollment-result.ts`, and dialog components | React Testing Library component test | Planned |
| AC-06 | SC-03, DEC-05 | Classroom roster page (`/classrooms/[id]`) displays `Status` column with `Claimed` / `Unclaimed` badges | Update `buildStudentColumns` in `classrooms/[id]/page.tsx` | Vitest component test / visual inspection | Planned |

---

## Scope

- **Backend API (`sentinel-api`)**:
  - `app/sentinel-api/src/modules/identity/enrollments/data/preview-student-enrollment.ts`
  - `app/sentinel-api/src/modules/identity/enrollments/data/enroll-students.ts`
  - `app/sentinel-api/src/modules/identity/onboarding/data/create-student.ts`
  - `app/sentinel-api/src/modules/identity/onboarding/services/complete-student-onboarding.ts`
  - `app/sentinel-api/src/modules/core/classroom/services/classroom-students-query.service.ts`
  - `app/sentinel-api/src/modules/core/classroom/helper/classroom-mappers.ts`
  - `app/sentinel-api/src/modules/core/classroom/helper/classroom.types.ts`
  - `app/sentinel-api/src/modules/core/classroom/classroom.dto.ts`
- **Shared Schemas & Types (`@sentinel/shared`)**:
  - `packages/shared/src/types/classroom.ts`
  - `packages/shared/src/schema/admin/classrooms/classroom-schema.ts`
- **Frontend Web (`sentinel-web`)**:
  - `app/sentinel-web/src/app/(protected)/(instructor)/classrooms/_components/classroom-student-enrollment-dialog.tsx`
  - `app/sentinel-web/src/app/(protected)/(instructor)/students/_components/dialogs/student-enrollment-dialog.tsx`
  - `app/sentinel-web/src/app/(protected)/(instructor)/students/_hooks/use-student-enrollment.ts`
  - `app/sentinel-web/src/app/(protected)/(instructor)/students/_hooks/student-enrollment/student-enrollment-result.ts`
  - `app/sentinel-web/src/app/(protected)/(instructor)/students/_components/views/enrollment/enrollment-preview.tsx`
  - `app/sentinel-web/src/app/(protected)/(instructor)/students/_components/views/enrollment/enrollment-summary.tsx`
  - `app/sentinel-web/src/app/(protected)/(instructor)/classrooms/[id]/page.tsx`

---

## Non-goals

- Modifying student whitelist CSV bulk ingestion for administrators (`/admin/whitelist`).
- Changing student authentication providers or SSO flows.
- Modifying exam delivery or grading logic outside standard roster visibility.

---

## Constraints and decisions

- Maintain strict uniqueness: Never create duplicate records in `students` (`institution_id`, `student_number`) or `enrollments` (`class_group_id`, `student_id`).
- Backward compatibility: Ensure all existing student records, exams, and grading queries continue to work seamlessly.

---

## Phases

- [x] `phase-01-api-student-enrollment-and-onboarding-sync.md` — Phase 1: API Data Layer, Onboarding Upsert, and Classroom Student Query
- [x] `phase-02-frontend-enrollment-dialogs-and-preview.md` — Phase 2: Frontend Enrollment Dialogs, Parsing Helpers, and Single-Upload Flow
- [x] `phase-03-classroom-roster-status-and-verification.md` — Phase 3: Classroom Roster Status Display and Full End-to-End Verification

---

## Verification

Checklist of verification commands:
- `pnpm --filter sentinel-api test src/modules/identity/enrollments src/modules/identity/onboarding src/modules/core/classroom` (35 test files, 105 passed)
- `pnpm --filter sentinel-web test src/app/(protected)/(instructor)/students/_hooks/student-enrollment/student-enrollment-result.test.ts` (5 passed)
- `pnpm --filter @sentinel/shared build` (clean)
- `pnpm --filter @sentinel/services build` (clean)
- `pnpm --filter @sentinel/hooks build` (clean)
- `pnpm build` (10/10 tasks successful, 0 errors)

---

## Deviations

---

## Result

