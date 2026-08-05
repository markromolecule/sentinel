# Production patch issues — analysis for implementation planning

This document converts the reported production symptoms into implementation-ready investigation items. The root causes below are hypotheses based on the current repository and should be confirmed against the production reproduction, browser console/network logs, and API logs before implementation.

## Scope and sequencing

Recommended order:

1. Fix the assignment crash and notification foreign-key failure first. Both can prevent staff workflows from completing and may be related.
2. Fix grading data/actions and the student closed-attempt exit path.
3. Fix MediaPipe false multi-face detections on mobile.
4. Normalize student loading states and add regression coverage.

Do not combine the changes into one large refactor. Each item should have an isolated regression test and a production verification scenario.

## Issue 1 — Closed exam/attempt has no way back to the classroom

### Observed behavior

After an attempt is closed, the student sees the terminal state but cannot navigate back to the classroom page.

### Current code signals

- Closed lifecycle state is already resolved in `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-active-attempt-lifecycle.ts`.
- The API exposes terminal status/message data through `app/sentinel-api/src/modules/examination/flow/services/get-session-status.service.ts` and `app/sentinel-api/src/modules/examination/flow/flow.dto.ts`.
- The student classroom route is `app/sentinel-web/src/app/(protected)/student/classroom/[id]/page.tsx`.
- `app/sentinel-web/src/app/(protected)/student/exam/details/_components/exam-sidebar.tsx` currently starts an exam and does not provide a closed-state return action. This component may be a separate exam-details path and should be checked against the actual closed-attempt screen before changing it.

### Possible root cause

The closed-attempt branch renders a terminal/error state without an exit action, or it loses the originating `classroomId`/classroom route while transitioning into the attempt. This is primarily a missing UI state/action, not an API lifecycle problem.

### Possible files affected

- `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/page.tsx`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-active-attempt-lifecycle.ts`
- The closed/terminal state component used by the attempt page, if separate from `page.tsx`
- `app/sentinel-web/src/app/(protected)/student/classroom/[id]/page.tsx` only if the required classroom identifier is not currently passed through
- Relevant attempt page tests and `use-active-attempt-lifecycle` tests

### Possible fix

Add a visible `Back to classroom`/`Return to classroom` action to the closed terminal state. Resolve its destination from the attempt/exam context where possible; otherwise fall back to `/student/classroom`. Preserve the existing closed-attempt semantics and do not offer resume/submit actions for `CLOSED`.

### Acceptance and validation

- A closed attempt caused by each supported close reason renders the action.
- The action navigates to the correct classroom when a classroom context exists.
- The fallback route works when the classroom is unavailable.
- `LOCKED`, `SUBMITTED`, and `COMPLETED` states are not accidentally changed.

## Issue 2 — MediaPipe reports multiple faces repeatedly on mobile after recalibration

### Observed behavior

On mobile devices, the face check intermittently or continuously reports multiple faces even after recalibration.

### Current code signals

- Checkup detection and calibration are implemented in `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-checkup-mediapipe.ts`.
- Attempt-time MediaPipe is implemented in `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-attempt-mediapipe-monitoring/` and rendered through `app/sentinel-web/src/app/(protected)/student/exam/[id]/_components/student-exam-mediapipe-provider.tsx`.
- Shared frame classification is in `packages/shared/src/mediapipe/analysis.ts`; runtime/calibration behavior is in `packages/shared/src/mediapipe/runtime.ts` and `packages/shared/src/mediapipe/calibration/`.
- The detector is created with a `numFaces` option in the checkup/attempt implementation; confirm the exact option and whether mobile creates a second detector or processes stale frames.

### Possible root causes

1. Mobile camera frames are lower resolution, mirrored, noisy, or exposed during autofocus/orientation changes, causing one face to produce unstable duplicate detections.
2. The analysis pipeline treats a single transient second detection as a current `multiple-faces` state without temporal hysteresis/debouncing.
3. Recalibration resets the profile but not all detector/frame-loop state, allowing an old result or overlapping `detectForVideo` loop to remain active.
4. The MediaPipe model/runtime is loaded more than once during mobile route/provider transitions.

### Possible files affected

- `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-checkup-mediapipe.ts`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-attempt-mediapipe-monitoring/index.ts`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/_components/student-exam-mediapipe-provider.tsx`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-student-checkup-manager.ts`
- `packages/shared/src/mediapipe/analysis.ts`
- `packages/shared/src/mediapipe/runtime.ts`
- Existing MediaPipe tests under the student attempt/checkup components and shared MediaPipe tests; add mobile-like low-resolution and duplicate-frame fixtures where practical

### Possible fix

First instrument and reproduce the issue with per-frame face count, video dimensions, timestamp, detector instance, and route/stage. Then apply the smallest confirmed fix, likely a combination of:

- enforce one detector/frame loop per stage and cancel/close it before reinitialization;
- discard stale results when the video timestamp or session token is no longer current;
- normalize mobile video orientation/mirroring and use a stable input size where supported;
- debounce `multiple-faces` over consecutive frames, while retaining an immediate safety response for a clearly persistent second face;
- reset calibration and detection state atomically when recalibration begins.

Do not simply ignore all multi-face results or force `numFaces: 1`; that could hide a real proctoring event.

### Acceptance and validation

- One person on a mobile camera does not remain in `multiple-faces` after a successful calibration.
- A clearly visible second person is still detected after the configured confirmation window.
- Recalibration cannot leave two active detection loops.
- Test at least iOS Safari and Android Chrome with portrait orientation, autofocus, camera permission transitions, and route remounts.

## Issue 3 — Grading page: export is missing the student section

### Observed behavior

The exported grade/result spreadsheet does not include the student’s section.

### Current code signals

- Grading list data already selects `sectionId` and `sectionName` in `app/sentinel-api/src/modules/examination/grading/data/get-grading-students.ts`.
- Report data types and mapping already include section fields in `packages/services/src/api/exams/types.ts` and `packages/services/src/api/exams/mappers.ts`.
- The current report route contains PDF export UI at `app/sentinel-web/src/app/(protected)/(instructor)/exams/reports/[examId]/_components/exam-report-pdf-export.tsx`; no obvious XLSX exporter was found in the current report route. Confirm whether the spreadsheet is generated by another production-only/legacy path before selecting files.

### Possible root cause

The query has section data but the export projection/column definition omits it, or the export consumes a legacy response where `sectionName` is not mapped. A second possibility is that a student can be joined through multiple classroom/section records and the export drops or ambiguously collapses the section.

### Possible files affected

- The actual spreadsheet/export route and serializer, to be located from the production network request or deployment revision
- `app/sentinel-api/src/modules/examination/grading/data/get-grading-students.ts`
- `app/sentinel-api/src/modules/examination/grading/services/get-grading-students.service.ts`
- `app/sentinel-api/src/modules/examination/grading/grading.dto.ts`
- `packages/services/src/api/grading.ts` if the frontend API contract omits the field
- Report/export column definitions in `app/sentinel-web/src/app/(protected)/(instructor)/exams/reports/[examId]/_components/` or the legacy grading page

### Possible fix

Trace the export request end-to-end, add `sectionId` and human-readable `sectionName` to the export contract and column list, and define deterministic behavior for students associated with multiple sections (one row per section or a stable joined label). Reuse the existing section join rather than deriving the section from display text.

### Acceptance and validation

- Spreadsheet headers include `Section`.
- Every exported student row has the same section shown in the grading UI.
- Multiple-section assignments do not silently overwrite data.
- Add an export fixture/test covering a student with a section and a student with multiple section assignments.

## Issue 4 — Grading page: “View submission”/grade actions are absent

### Observed behavior

The grading page does not expose the expected action button(s) for viewing a submission and grading it.

### Current code signals

- Attempt detail and update endpoints exist under `app/sentinel-api/src/modules/examination/grading/controllers/`.
- Frontend action rendering is centralized in `app/sentinel-web/src/features/exams/reports/_components/attempt-report-actions.tsx`; it returns `null` when `editable` or `hasSubmitHandler` is false.
- `app/sentinel-web/src/features/exams/reports/attempt-report-view.tsx` supplies those action props and is therefore a likely integration point.
- The detailed route is `app/sentinel-web/src/app/(protected)/(instructor)/exams/reports/[examId]/[attemptId]/page.tsx`.

### Possible root causes

- The attempt detail route does not pass a save/finalize handler, making `hasSubmitHandler` false.
- The UI marks attempts as non-editable based on an incorrect status/finalization mapping.
- The list row links to the wrong route or does not include `attemptId`.
- Backend visibility or grading permissions prevent the detail query/mutation from being usable, so the UI hides the actions as a precaution.

### Possible files affected

- `app/sentinel-web/src/features/exams/reports/attempt-report-view.tsx`
- `app/sentinel-web/src/features/exams/reports/_components/attempt-report-actions.tsx`
- `app/sentinel-web/src/features/exams/reports/_hooks/use-attempt-report/index.ts`
- `app/sentinel-web/src/app/(protected)/(instructor)/exams/reports/[examId]/[attemptId]/page.tsx`
- `app/sentinel-web/src/app/(protected)/(instructor)/exams/reports/[examId]/_components/attempts-view.tsx`
- `app/sentinel-api/src/modules/examination/grading/controllers/get-grading-attempt-detail.controller.ts`
- `app/sentinel-api/src/modules/examination/grading/controllers/update-grading-attempt.controller.ts`
- `app/sentinel-api/src/modules/examination/grading/services/get-grading-attempt-detail.service.ts`
- `app/sentinel-api/src/modules/examination/grading/services/update-grading-attempt.service.ts`

### Possible fix

Trace the action from the student row to the attempt route, then ensure the detail view receives the actual mutation handler and the correct editability/finalization state. Render `View submission` for attempts with a valid `attemptId`; render grading/save actions only when the attempt is editable and the current user has the required permission. Surface an API error instead of silently hiding a valid action.

### Acceptance and validation

- A row with an attempt opens the correct submission.
- The detail view displays the expected grading controls for editable attempts.
- Save override and save/finalize use the existing endpoint and invalidate the report query.
- Finalized attempts remain read-only with an explicit explanation.
- Add/extend tests for missing attempt, editable attempt, and finalized attempt.

## Issue 5 — Student loading states use a boxed message instead of the standard spinner

### Observed behavior

Student pages show wrappers such as `Loading exam details...`; the desired pattern is a simple spinner with text below, without the boxed loading treatment. This should be applied consistently across student pages.

### Current code signals

- `app/sentinel-web/src/app/(protected)/student/exam/details/_components/exam-loading.tsx` is a confirmed non-standard loading component: it renders text only inside a full-screen wrapper.
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/_components/student-exam-loading-state.tsx` already demonstrates the desired `Loader2` plus text pattern.
- Other student routes should be inventoried before changing them; avoid changing instructor/core loading states under this issue.

### Possible root cause

The student exam details path predates the shared loading convention and has no reusable student loading primitive, so individual pages implemented inconsistent wrappers.

### Possible files affected

- `app/sentinel-web/src/app/(protected)/student/exam/details/_components/exam-loading.tsx`
- Student loading components discovered by searching `app/sentinel-web/src/app/(protected)/student` for `Loading` and loading branches
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/_components/student-exam-loading-state.tsx` as the reference implementation
- Associated student page tests

### Possible fix

Standardize on a small student loading component or shared primitive that renders a spinner and optional text in a simple vertical layout. Replace the boxed `ExamLoading` implementation and audit all student-only loading branches for equivalent wrappers. Preserve full-screen height where needed for layout stability.

### Acceptance and validation

- Student loading states show a spinner with text below and no card/box wrapper.
- No student page still renders the old `Loading exam details...` wrapper pattern.
- Loading states remain accessible with an `aria-label` or equivalent status text.
- Existing page tests continue to verify loading behavior.

## Issue 6 — Assigning an examination crashes the instructor and Sentinel Core assign pages

### Observed behavior

Assigning an examination can produce: `Application error: a client-side exception has occurred while loading app.sentinelph.tech`. It affects the instructor assign page and the Sentinel Core administrator assign page.

### Current code signals

- The two parallel assign surfaces are under:
    - `app/sentinel-web/src/app/(protected)/(instructor)/exams/assign/`
    - `app/sentinel-core/src/app/(protected)/exams/assign/`
- Shared API/query code is in `packages/services/src/api/exam-section-assignments.ts` and `packages/hooks/src/query/`.
- Backend assignment routes are registered under `app/sentinel-api/src/modules/examination/exams/exam.routes.ts`, with assignment resolution in `app/sentinel-api/src/modules/examination/exams/services/resolve-classroom-assignment.service.ts` and writes in the exam/section-assignment services.

### Possible root causes

- The two apps pass different assignment payloads or assume different response shapes.
- A selected classroom/section/instructor/room is undefined after a combobox change and a component dereferences it.
- The API returns an error or nullable assignment record that the list/builder does not guard against.
- Assignment creation triggers notification creation; the notification foreign-key failure in Issue 7 may make the mutation fail and leave the client in an unhandled error state.
- Cache invalidation returns stale/partial assignment data that violates a component assumption.

### Possible files affected

- `app/sentinel-web/src/app/(protected)/(instructor)/exams/assign/_components/new-assignments-builder.tsx`
- `app/sentinel-web/src/app/(protected)/(instructor)/exams/assign/_components/add-exam-section-assignment-dialog.tsx`
- `app/sentinel-web/src/app/(protected)/(instructor)/exams/assign/_components/assignment-content.tsx`
- Matching files under `app/sentinel-core/src/app/(protected)/exams/assign/_components/`
- `packages/hooks/src/query/` assignment query/mutation hooks
- `packages/services/src/api/exam-section-assignments.ts`
- `app/sentinel-api/src/modules/examination/exams/services/resolve-classroom-assignment.service.ts`
- `app/sentinel-api/src/modules/examination/section-assignments/` data/services/routes
- Assignment tests in both apps and API service tests

### Possible fix

Capture the browser stack trace and failed request first. Align both app payloads with the shared service contract, validate required selections before submit, and make the mutation error path render a recoverable message/toast instead of allowing a render exception. If the notification error is the trigger, apply the Issue 7 fix and add an assignment test that verifies the assignment remains successful when notification delivery is unavailable.

### Acceptance and validation

- Create, update, and delete assignment work in both web instructor and Sentinel Core admin surfaces.
- Invalid/incomplete selections are blocked with field-level feedback.
- API failures do not cause a Next.js client-side exception page.
- Assignment list/query caches refresh correctly after mutation.
- Test the exact production payload and response shape in both apps.

## Issue 7 — Notification insert fails on `notifications_actor_user_id_fkey` (`23503` / `P2010`)

### Observed behavior

The API fails while inserting a notification because `notifications.actor_user_id` references a user that does not exist:

```text
23503: insert or update on table "notifications" violates foreign key constraint "notifications_actor_user_id_fkey"
P2010 from prisma-extension-kysely
createNotificationData(.../app/sentinel-api/src/modules/general/notification/data/create-notification.ts:42)
```

### Current code signals

- `createNotificationData` writes `actor_user_id: actorUserId ?? null` without checking that the referenced user exists.
- The notification service is called by activity/assignment flows, so one invalid actor can reject the parent operation when notification creation is awaited.
- The relevant schema and migration are `packages/db/prisma/schema.prisma`, `packages/db/prisma/migrations/20260509191500_add_notifications/migration.sql`, and later notification migrations.

### Possible root causes

- The caller passes an auth/Supabase user id that is not the application `users.id` referenced by the database FK.
- The actor user was deleted or not provisioned in the target production database.
- A system/background operation uses a synthetic actor id instead of `null`.
- Data migration or environment drift left notification rows/callers on incompatible identity semantics.

### Possible files affected

- `app/sentinel-api/src/modules/general/notification/data/create-notification.ts`
- `app/sentinel-api/src/modules/general/notification/notification.service.ts`
- `app/sentinel-api/src/modules/general/notification/services/activity/` and other callers that populate `actorUserId`
- `app/sentinel-api/src/modules/general/notification/services/activity/activity-notification-base.service.ts`
- `packages/db/prisma/schema.prisma`
- Notification migrations and notification tests

### Possible fix

Confirm the FK target and identity mapping in production. For user actors, resolve/validate the application user before insert and pass `null` for system actors or missing/deleted users. Notification creation should not make the primary assignment/exam operation fail unless notifications are explicitly transactional business data; prefer logging/observability plus a safe fallback for this secondary side effect. Do not remove or weaken the FK without proving the data model requires that change.

Add a regression test for:

- valid actor user;
- missing/deleted actor, which stores a null actor or follows the selected fallback;
- system notification with no actor;
- assignment/business operation continuing when notification persistence is unavailable, if that is the intended reliability policy.

### Acceptance and validation

- No `23503` occurs for valid assignment and exam activity flows.
- Actor display remains correct when a valid actor exists.
- System/missing actors do not create invalid FK values.
- Notification failure behavior is explicit, logged, and does not produce an unexplained client crash.
- Verify production identity data and migration state before any schema change.

## Cross-cutting investigation checklist

Before writing the implementation plan, capture:

- exact production URLs and user roles for each symptom;
- browser console stack traces and failed network requests for the assignment and grading issues;
- response payloads for grading students, attempt detail, assignment mutation, and export download;
- the production database schema/FK target for `notifications.actor_user_id`;
- whether the spreadsheet exporter exists in the deployed revision but not this checkout;
- mobile device/browser, video dimensions, MediaPipe face count over time, and whether the detector is recreated during recalibration;
- screenshots or recordings for the closed-attempt and loading states.

## Suggested implementation-plan deliverables

The later implementation plan should split this document into independent work items and include, for each item: exact confirmed files, API/schema contract changes, test cases, migration requirements (if any), rollout order, observability, and a production smoke-test script. Items with unresolved hypotheses—especially the spreadsheet exporter and MediaPipe false positives—should begin with a short reproduction/instrumentation phase.
