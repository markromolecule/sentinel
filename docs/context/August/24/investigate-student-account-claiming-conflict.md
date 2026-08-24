---
title: "Investigate Student Account Claiming Conflict & Lifecycle Sync"
type: context
status: ready
created: "2026-08-24"
tags: [context, identity, onboarding, student-whitelist, classrooms]
feature: "student-account-claiming-and-onboarding"
---

# Investigate Student Account Claiming Conflict & Lifecycle Sync

## 1. Overview & Objective

- **Problem Statement:** 
  Students attempting to claim their accounts during academic onboarding reported encountering false-positive blocking errors stating that their student record was already claimed or registered to another account, even though they were first-time users and had not claimed it.
- **Root Cause Identified:** 
  When instructors enroll students into a classroom using either manual student number entry or spreadsheet bulk import, the system creates placeholder student records in the `students` table with `user_id: null` to allow foreign-key linkage with the `enrollments` table. During onboarding, the eligibility check in [`assertStudentOnboardingEligibility`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/identity/onboarding/services/assert-student-onboarding-eligibility.ts) historically checked `conflictingStudent && conflictingStudent.user_id !== userId`. Because `null !== userId` evaluates to `true`, pre-enrolled students were rejected with `"Student number \"...\" is already registered to another account."` which the frontend displayed as `"That whitelist record has already been claimed by another account"`.
- **Business / User Value:** 
  Ensures seamless student onboarding for both pre-enrolled (placeholder) and non-pre-enrolled students, preventing friction during student registration while preserving strict protection against unauthorized cross-account claiming.
- **Success Criteria:** 
  - Students whose records were pre-enrolled into classrooms by instructors can complete onboarding without false conflict errors.
  - Onboarding completes and atomically binds the student's `userId` to the existing placeholder row in `students` (preserving classroom enrollments) and records `claimed_user_id` in `student_whitelist`.
  - Legitimate conflicts (where `conflictingStudent.user_id` belongs to another real user or `student_whitelist.claimed_user_id` belongs to another user) continue to be strictly blocked.

---

## 2. Requirements & User Stories

### User Stories / Scenarios
- *As a student pre-enrolled by an instructor in a classroom*, I want to complete my onboarding registration with my student number and academic details, so that my account becomes active and I immediately see my enrolled classrooms.
- *As an instructor*, I want to import student rosters into my classroom before students have registered, so that the classroom roster is ready ahead of time and automatically activates when students sign up.
- *As an administrator*, I want institutional whitelist records and student database records to stay synchronized across import, enrollment, onboarding, and account deletion lifecycles.

### Decision Ledger

| ID | Decision | Rationale | Alternatives Rejected |
|---|---|---|---|
| DEC-01 | When deleting or purging an unclaimed whitelist entry (`student_whitelist.claimed_user_id IS NULL`), delete any corresponding `students` placeholder row where `user_id IS NULL` (cascading its pending enrollments). | Prevents accumulating stale placeholder rows in `students` table and eliminates phantom roster records for withdrawn or erroneously added students. | Keeping orphan placeholder rows indefinitely in `students` without an active whitelist entry. |
| DEC-02 | Dual-layer claim verification: allow onboarding when `conflictingStudent.user_id IS NULL` or matches `userId`. | Allows legitimate pre-enrolled students to claim their accounts while strictly blocking cross-account claiming when `user_id` belongs to another real user. | Rejecting all existing `student_number` rows regardless of `user_id` nullability. |

### Functional Requirements
- [ ] **Dual-Layer Claim Verification:**
  - Layer 1 (`student_whitelist`): Must ensure `claimed_user_id` is either `null` or matches the current authenticated `userId`.
  - Layer 2 (`students` table): Must ensure `conflictingStudent.user_id` is either `null` (placeholder) or matches the current authenticated `userId`.
- [ ] **Atomic Claim Upsert:**
  - Upon successful onboarding validation, `completeStudentOnboarding` upserts `students` on `(institution_id, student_number)`, setting `user_id = userId`, thereby claiming the placeholder row without breaking existing foreign-key relations in `enrollments`.
  - Updates `student_whitelist` with `claimed_user_id = userId`, `claimed_at = now()`, `updated_by = userId`.
- [ ] **Classroom Roster Claim Status Resolution:**
  - In `getClassroomStudents`, compute `is_claimed = (st.user_id IS NOT NULL)` and `claim_status = CASE WHEN st.user_id IS NOT NULL THEN 'CLAIMED' ELSE 'UNCLAIMED' END`.
  - In instructor classroom detail pages, display claimed students as `"Claimed"` (green) and placeholder students as `"Pending Claim"` (amber).
- [ ] **Stale Orphan Cleanup & Cascade Management:**
  - When users are deleted via user management, `prepareUserForAuthDeletion` resets `student_whitelist.claimed_user_id = null` and deletes corresponding `students` rows.
  - When whitelists are purged/deleted, ensure orphan placeholder records with `user_id: null` do not create blocking integrity anomalies.

### Edge Cases & Failure Modes
- **Edge Case 1: Whitelist deleted while classroom enrollment placeholder exists.**
  - *Behavior:* If a whitelist row is deleted but an instructor had previously enrolled that student into a classroom, a placeholder row (`user_id = null`) exists in `students`. If a student attempts to onboard, onboarding will fail with `"Student number is not approved for onboarding in the selected institution"` because `whitelistRecord` is missing.
  - *Recovery:* Admin must add/re-import the student to `student_whitelist`. Once whitelisted, onboarding claims the existing placeholder smoothly.
- **Edge Case 2: Direct deletion of Auth user in Supabase without API cascade.**
  - *Behavior:* If a user is deleted directly in Supabase Auth instead of through the Sentinel API, `student_whitelist.claimed_user_id` remains set to the deleted UUID.
  - *Recovery:* Provide admin / support action or automated maintenance to reset `claimed_user_id` when the referenced auth user does not exist.
- **Edge Case 3: Admin manually creating a student user in User Management.**
  - *Behavior:* `createUserData` inserts into `students` with `onConflict(user_id)`. If a placeholder row already exists for `(institution_id, student_number)`, inserting would conflict on the unique index.
  - *Mitigation:* Ensure `createUserData` and `updateUserData` handle the compound unique constraint `(institution_id, student_number)`.

---

## 3. Technical & Architectural Context

### Affected Domains / Layers
- **Backend API (`app/sentinel-api`)**:
  - `identity/onboarding`: [`assertStudentOnboardingEligibility`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/identity/onboarding/services/assert-student-onboarding-eligibility.ts), [`loadStudentOnboardingContext`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/identity/onboarding/services/load-student-onboarding-context.ts), [`completeStudentOnboarding`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/identity/onboarding/services/complete-student-onboarding.ts), [`createStudentData`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/identity/onboarding/data/create-student.ts).
  - `identity/student-whitelist`: [`bulk-import-student-whitelist`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/identity/student-whitelist/services/bulk-import-student-whitelist.ts), [`purge-student-whitelist`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/identity/student-whitelist/services/purge-student-whitelist.ts), [`delete-student-whitelist`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/identity/student-whitelist/services/delete-student-whitelist.ts).
  - `identity/enrollments`: [`enroll-students.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/identity/enrollments/data/enroll-students.ts), [`preview-student-enrollment.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/identity/enrollments/data/preview-student-enrollment.ts).
  - `identity/users`: [`delete-user.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/identity/users/data/delete-user.ts), [`create-user.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/identity/users/data/create-user.ts).
  - `core/classroom`: [`classroom-students-query.service.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/core/classroom/services/classroom-students-query.service.ts), [`classroom-write.service.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/core/classroom/services/classroom-write.service.ts).
- **Web Frontend (`app/sentinel-web`)**:
  - `(protected)/onboarding`: [`use-onboarding-form.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/(protected)/onboarding/_hooks/use-onboarding-form.ts), [`onboarding-form.tsx`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/(protected)/onboarding/_components/onboarding-form.tsx).
  - `(protected)/(instructor)/classrooms/[id]`: Classroom roster table showing Claimed / Pending Claim badges.
  - `(protected)/(instructor)/classrooms/_components/classroom-student-enrollment-dialog.tsx`: Roster import dialog with claim preview.
- **Database (`packages/db`)**:
  - `student_whitelist` table: `whitelist_id`, `institution_id`, `department_id`, `course_id`, `student_number`, `last_name`, `first_name`, `status`, `claimed_user_id`, `claimed_at`.
  - `students` table: `student_id`, `user_id` (nullable UUID, unique), `student_number`, `institution_id`, `department_id`, `course_id`. Unique on `(institution_id, student_number)`.
  - `enrollments` table: `enrollment_id`, `class_group_id`, `student_id`.

---

## 4. UI/UX & Interaction Guidelines

- **Classroom Enrollment Dialog:**
  - Displays preview breakdown: e.g. `"Import 35 Students (10 Claimed, 25 Unclaimed)"`.
  - Informs instructor that unclaimed whitelisted accounts will automatically activate when students claim their account during login/onboarding.
- **Classroom Roster Table:**
  - **Claimed:** Green badge (`"Claimed"`).
  - **Unclaimed:** Amber badge (`"Pending Claim"`) with tooltip explaining that the student has not completed registration yet and the row will automatically activate upon onboarding.
- **Student Onboarding Page:**
  - In the event of a genuine conflict (different user already claimed the number), display helpful actionable error guidance:
    - Title: `"This student record is already linked"`
    - Description: `"That whitelist record has already been claimed by another account, so onboarding cannot continue from this one."`
    - Hints: `"Try signing in with the account that originally completed onboarding."`

---

## 5. Scope & Boundaries

- **In Scope:**
  - Complete lifecycle investigation across onboarding, whitelist, classroom pre-enrollment, and user deletion.
  - Validation of dual-layer claim checks (`Boolean(conflictingStudent?.user_id) && conflictingStudent.user_id !== userId`).
  - Automated test verification for placeholder claiming and true conflict rejections.
  - Verification of classroom roster claim status queries.
- **Out of Scope / Non-Goals:**
  - Altering the database schema or foreign key cascade definitions.
  - Auto-generating user accounts without student authentication.
  - Bypassing academic metadata verification (department/course/last name match).

---

## 6. References & External Context

- Historical task doc: [`docs/tasks/2026/08/2026-08-24/fix-student-onboarding-unclaimed-conflict/README.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/tasks/2026/08/2026-08-24/fix-student-onboarding-unclaimed-conflict/README.md)
- Unit tests: [`app/sentinel-api/src/modules/identity/onboarding/tests/onboarding.service.test.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/identity/onboarding/tests/onboarding.service.test.ts)
