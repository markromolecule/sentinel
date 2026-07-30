# Context: Student Exam Reconnect and Instructor Re-Admission Lifecycle

## Overview

This document describes the context, issues, and a detailed technical roadmap to resolve issues with the student exam reconnect/re-entry lifecycle and instructor re-admission. It is designed to be fed to an LLM to generate a precise implementation plan.

---

## 1. Background & Target Use Cases

Assume a student is already authenticated, has passed preflight checkups, has been admitted to the exam, and has started writing their attempt. We need to handle three re-entry scenarios cleanly:

1. **Student refreshes their browser** while on the attempt page.
2. **Student closes their browser/tab** for a short period (e.g., 1 minute) and returns.
3. **Student loses internet connectivity** for a short period (e.g., 1 minute) and reconnects.

In all three cases, the student is redirected to the `/lobby` page.

- **For Instructor-Gated Exams:** The student must wait in the lobby to be re-admitted by the instructor before they can click "Resume Exam" to re-enter.
- **For Automatic-Admit Exams:** The student is auto-approved and can click "Resume Exam" immediately.
- **Reconnect Attempt Limits:** Each successful resume/re-entry consumes one reconnect attempt. If a student reaches the maximum reconnect attempts configured for the exam, they must be blocked in the lobby (with the "Resume Exam" button disabled) until the instructor manually grants a reconnect override.

---

## 2. Identified Issues & Code Root Causes

### Issue A: Reconnecting Student Bypasses Re-Admission

When a student returns to the lobby page during an active attempt, they bypass the instructor admission gate and are shown as "Writing" on the instructor's dashboard.

- **Root Cause 1: Lack of Check-In & Polling on Reconnect**
  In [use-lobby-state.ts](<file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/_hooks/use-lobby-state.ts>), when a student has a resumable active attempt, `hasResumableAttempt` is `true`. The code contains the following early return:
    ```typescript
    if (hasResumableAttempt) {
        return () => {
            isMounted = false;
        };
    }
    ```
    This prevents `checkIntoExamLobby` and the 5-second polling loop (`syncAdmission`) from running when a student returns to the lobby page to reconnect. As a result, the student is never registered as checked into the lobby on the server.
- **Root Cause 2: Admission Status is Not Reset to WAITING**
  Even if the client checks in, [check-in-lobby.ts](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/lobby/services/check-in-lobby.ts) does not reset the admission status of an existing approved student. It returns the existing `APPROVED` status, so they remain approved and can resume immediately without instructor re-admission.
- **Root Cause 3: Lobby Queue Filter Mismatch**
  In [lobby-admission-filters.ts](<file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/lobby/_lib/lobby-admission-filters.ts>), the instructor's lobby partitions students based on whether they have an active attempt:
    ```typescript
    waitingStudents: admissions.filter(
        (student) => student.status === 'WAITING' && !student.hasActiveAttempt,
    ),
    inAttemptStudents: admissions.filter((student) => student.hasActiveAttempt),
    ```
    Since the reconnecting student has `hasActiveAttempt = true` (because their exam attempt is still `IN_PROGRESS`), they are filtered out of `waitingStudents` and placed in `inAttemptStudents` (showing as "Writing" / In Attempt), even if their admission status is `WAITING`.
- **Root Cause 4: Monitoring Stats Mismatch**
  In [get-exam-monitoring-overview.ts](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/monitoring/services/get-exam-monitoring-overview.ts), the `lobbyAdmissions` sub-query counts any student with an active attempt under `in_attempt` regardless of lobby status:
    ```typescript
    sql<number>`count(distinct ea.attempt_id) filter (
        where ea.attempt_id is not null
    )::int`.as('in_attempt');
    ```
    It should only count them in `in_attempt` if their lobby admission is `APPROVED`. If they are checked into the lobby and waiting, they should count as `waiting` and not `in_attempt`.

---

### Issue B: Reconnect Limit and Override Counting Bugs

- **Root Cause 1: Reconnect Limit is Not Blocked on Client**
  In [runtime-access.service.ts](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/runtime-access/runtime-access.service.ts), `resolveExamRuntimeAccess` resolves `canResume` purely as `hasActiveAttempt`. It does not verify if `reconnectAttemptsRemaining > 0`. Therefore, even if the student is out of attempts, `canResume` remains `true` on the frontend, showing the "Resume Exam" button which fails with a 403 on submit.
- **Root Cause 2: Override API Missing Attempt ID Mapping**
  In [student-overrides.service.ts](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/student-overrides/student-overrides.service.ts), `createReconnectLimitOverride` creates a student override with `sourceAttemptId: null`:
    ```typescript
    sourceAttemptId: null;
    ```
    However, in [evaluate-student-exam-eligibility.service.ts](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/access/services/evaluate-student-exam-eligibility.service.ts), `hasValidReopenOverride` requires that the override's `sourceAttemptId` matches `latestAttempt.attempt_id`. Because it is `null`, the override is evaluated as invalid, locking the student out.
- **Root Cause 3: Override Resolution Condition Mismatch**
  In [resolve-student-override-access.ts](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/access/services/resolve-student-override-access.ts), student override checks only apply if both `!scheduledRuntimeAccess.canStart && !scheduledRuntimeAccess.canResume` are true. If the exam is scheduled as open (`canStart` is `true`), but the student has reached their reconnect limit (`canResume` is `false`), the override is ignored.
- **Root Cause 4: Max Reconnect Exceeded Redirects to Instructions**
  In [_stage-resolver.ts](<file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/(protected)/student/exam/[id]/_lib/student-exam-flow/_stage-resolver.ts>), a student exceeding reconnects is redirected to `'instruction'` instead of staying in `'lobby'` to wait for an instructor's manual override:
    ```typescript
    if (reconnectCount >= maxReconnect && !runtimeAccess?.canResume) {
        return {
            targetStage: 'instruction',
            reasonCode: 'MAX_RECONNECT_EXCEEDED',
            shouldRedirect: requestedStage !== 'instruction',
        };
    }
    ```

---

### Issue C: Missing Reconnect Override Controls on the Lobby Screen

Instructors can only grant reconnect overrides from the live monitoring page. The Lobby screen does not display the "Override Limit" action for checked-in students who have exhausted their reconnect limits.

---

## 3. Detailed Fix Architecture

### 1. API & Database Changes (sentinel-api)

- **Reset Admission Status on Re-Check-In**
  In `checkInLobby` ([check-in-lobby.ts](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/lobby/services/check-in-lobby.ts)), if the exam admission mode is `INSTRUCTOR_GATED` and there is an active `IN_PROGRESS` attempt for this student, reset their lobby admission status to `WAITING` and clear `decided_at` and `decided_by` upon check-in.
- **Return Max Reconnect Attempts in Lobby Waiting List**
  In `getWaitingList` ([get-waiting-list.ts](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/lobby/services/get-waiting-list.ts)), fetch the exam's `max_reconnect_attempts` from `exam_configurations` and include it as `maxReconnectAttempts` in each mapped student object in the response.
- **Correct Lobby admissions Counts in Monitoring Overview**
  In `getExamMonitoringOverview` ([get-exam-monitoring-overview.ts](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/monitoring/services/get-exam-monitoring-overview.ts)), modify the `lobbyAdmissions` sub-query so that `in_attempt` is counted as:
    ```sql
    count(distinct ea.attempt_id) filter (
        where ea.attempt_id is not null and ela.status = 'APPROVED'
    )::int
    ```
- **Enforce Reconnect Limits in Runtime Access**
  In `resolveExamRuntimeAccess` ([runtime-access.service.ts](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/runtime-access/runtime-access.service.ts)), set:
    ```typescript
    canResume: hasActiveAttempt && reconnectAttemptsRemaining > 0;
    ```
- **Fix Reconnect Override Attempt Association**
  In `createReconnectLimitOverride` ([student-overrides.service.ts](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/student-overrides/student-overrides.service.ts)), pass `sourceAttemptId: latestAttempt.attempt_id` to link the reopen override to the active attempt.
- **Fix Override Resolution Trigger**
  In `resolveStudentOverrideAccess` ([resolve-student-override-access.ts](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/access/services/resolve-student-override-access.ts)), check:
    ```typescript
    if (
        accessOverride &&
        persistedRuntimeAccess?.state !== 'closed' &&
        (!scheduledRuntimeAccess.canStart || !scheduledRuntimeAccess.canResume)
    ) { ... }
    ```

### 2. Frontend Changes (sentinel-web)

- **Keep Maxed Out Students in Lobby**
  In `_stage-resolver.ts` ([_stage-resolver.ts](<file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/(protected)/student/exam/[id]/_lib/student-exam-flow/_stage-resolver.ts>)), when `MAX_RECONNECT_EXCEEDED` is hit, return targetStage: `'lobby'` instead of `'instruction'`.
- **Ensure Reconnecting Students Check-In and Poll**
  In `useLobbyState.ts` ([use-lobby-state.ts](<file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/_hooks/use-lobby-state.ts>)):
    - Remove `&& !runtimeAccess?.canResume` from `requiresInstructorAdmission` definition.
    - In `useEffect`, only return early if `hasResumableAttempt && !requiresInstructorAdmission`.
- **Fix Lobby Admission Group Filtering**
  In `lobby-admission-filters.ts` ([lobby-admission-filters.ts](<file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/lobby/_lib/lobby-admission-filters.ts>)), update `getLobbyAdmissionGroups` and `filterLobbyAdmissions` so:
    - `waitingStudents` only checks `student.status === 'WAITING'`.
    - `inAttemptStudents` checks `student.hasActiveAttempt && student.status === 'APPROVED'`.
- **Add Override Limit Actions to Instructor Lobby**
    - In `use-instructor-lobby.ts` ([use-instructor-lobby.ts](<file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/lobby/_hooks/use-instructor-lobby.ts>)), use the `useOverrideReconnectLimitMutation` hook. Implement `handleOverrideReconnect` and return it.
    - In `page.tsx` ([page.tsx](<file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/lobby/page.tsx>)), pass `handleOverrideReconnect` to the panel.
    - In `instructor-lobby-admission-panel.tsx` ([instructor-lobby-admission-panel.tsx](<file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/lobby/_components/instructor-lobby-admission-panel.tsx>)), accept `onOverrideReconnect` and pass it to `StudentLobbyRow`.
    - In `StudentLobbyRow`, calculate if the student has reached their reconnect limit (`student.reconnectCount >= maxReconnectAttempts`) and render an "Override Limit" button next to their information.
