# Proctoring Recalibration and Real-Time Monitoring Implementation Plan

## Task Summary

Fix proctoring telemetry correctness by preventing duplicate first events, suppressing system-caused fullscreen flags after submission, restoring right-click flag visibility, calibrating severity from occurrence count, and making committed incidents visible to instructors within 2 seconds with warning toasts.

## Pre-Planning Findings

- Source task: `docs/context/July/reacalibrate-and-fix.md`.
- Related notes: `docs/todo/main/index.md` also mentions gaze/audio recalibration, occurrence count accuracy, instructor UX, and later exam lifecycle/retake control work.
- Student event capture currently lives in `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-monitoring/use-interaction-listeners.ts`.
- Student telemetry payload construction lives in `app/sentinel-web/src/app/(protected)/student/exam/[id]/_lib/web-telemetry-client/_utils/payloads.ts`.
- Server rule evaluation lives in `app/sentinel-api/src/modules/telemetry/ingestion/rules/web-rules.ts` and `app/sentinel-api/src/modules/telemetry/ingestion/rules/ai-rules.ts`.
- Incident persistence and occurrence counting live in `app/sentinel-api/src/modules/telemetry/storage/services/incident-persistence.service.ts`.
- Severity calibration already has a central resolver in `app/sentinel-api/src/modules/telemetry/storage/services/incident-severity-resolver.service.ts`, but current web thresholds still mark tab switches and clipboard attempts too aggressively.
- Instructor monitoring data is mapped through `app/sentinel-api/src/modules/examination/monitoring/services/map-monitoring-response.ts`.
- Instructor monitoring REST queries already poll every 5 seconds in `packages/hooks/src/query/exams/use-exam-monitoring-overview-query.ts`.
- Instructor incident log queries do not currently poll in `packages/hooks/src/query/exams/use-exam-incidents-query.ts`.
- Database table touched: `flagged_incidents`.
- Database table read for lifecycle suppression: `exam_attempts`.
- Prisma migration needed: **No** for this plan. `flagged_incidents.details`, `severity`, `rule_key`, `timestamp`, `status`, `dedupe_key`, `configuration_snapshot`, and `session_context` can store and expose the required occurrence/severity metadata. Add indexes only if load testing shows query latency issues.

## Three Viable Options

### Option 1: Minimal Patch on Existing Hooks and Polling

Fix the student event guards, tune server-side severity thresholds, and reduce React Query polling intervals for monitoring/logs to 2 seconds.

Tradeoff: Fastest and lowest risk, but "real-time" is implemented as short polling rather than push delivery.

### Option 2: Server-Authoritative Incidents With Push Notifications

Keep all correctness and severity logic server-side, then add a live event transport from the API to instructor pages so incident inserts/updates push immediately.

Tradeoff: Best real-time behavior, but higher backend/frontend complexity and requires careful auth/scoping for live subscriptions.

### Option 3: Client-Side Optimistic Instructor Feed

Have student clients publish incident hints to a shared live channel while the API persists canonical incidents, then reconcile the instructor feed after persistence.

Tradeoff: Very responsive UI, but risks showing events that fail persistence and splits integrity logic across clients.

## Best Option

Choose **Option 1 first, with server-side structure that does not block Option 2 later**.

Why: the current codebase already centralizes severity and occurrence logic in API services and already uses React Query polling on the monitoring page. A focused server-authoritative fix keeps academic-integrity decisions in one place, avoids new dependencies, satisfies the <2s requirement by changing polling cadence, and leaves a clean upgrade path to websocket/SSE/Supabase push if polling is not enough under production load.

## Concrete Next Steps

1. Fix student-side event lifecycle guards and right-click capture tests.
2. Normalize server-side dedupe and occurrence counting so first events produce exactly one reviewable incident with `occurrenceCount: 1`.
3. Recalibrate severity ladders to `1-2 LOW`, `3-5 MEDIUM`, and `6+ HIGH` unless an explicitly documented immediate-security rule must remain high.
4. Update monitoring and incident-log queries to refresh within 2 seconds while instructor pages are open.
5. Add instructor toast detection for newly seen incident IDs and updated occurrence counts.
6. Validate parity between attempt-page emitted events and instructor-visible incidents.

## Phase 1: Student Event Capture Correctness

**Goal:** Ensure monitored browser actions emit exactly one telemetry event when the student causes them during an active attempt.

- [x] Update `useInteractionListeners()` in `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-monitoring/use-interaction-listeners.ts` so `RIGHT_CLICK_ATTEMPT` shows the same student-facing warning pattern as clipboard/print-screen and never depends on lock state before telemetry emission.
- [x] Update `handleFullscreenChange()` in `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-monitoring/use-interaction-listeners.ts` to ignore fullscreen exits when `isMonitoringSuspended.current` is true, when the attempt is redirecting/submitting, or when the exit was triggered by system navigation after completion.
- [x] Audit `suspendSecurityMonitoring()` call sites in `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/index.ts` and `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/use-attempt-monitoring.ts` to ensure submission calls suspend monitoring before route changes or fullscreen teardown.
- [x] Write tests in `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-monitoring.test.ts` for right-click telemetry, right-click toast, right-click disabled config, right-click burst dedupe, active fullscreen exit, and suspended fullscreen exit after submission.
- [x] Write a regression test in `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/index.test.tsx` or nearest existing attempt hook test to verify turn-in calls `suspendSecurityMonitoring()` before redirect/completion side effects.

**Migration required:** No - this phase only changes browser event handling and tests.
**Migration applied:** No - no database changes are required for Phase 1.
**Breaking changes:** No - browser telemetry behavior remains backward compatible.
<!-- NOTE: Phase 1 validation passed with `pnpm --dir app/sentinel-web exec vitest run --passWithNoTests 'src/app/(protected)/student/exam/[id]/_hooks/use-exam-monitoring.test.ts' 'src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/index.test.tsx'` (2 files, 25 tests). Earlier `pnpm --dir app/sentinel-web test -- ...` attempts collected unrelated app tests because the package script adds an extra `--`; those unrelated failures were not modified because they are outside this plan. -->

## Phase 2: Server Dedupe and Occurrence Count Accuracy

**Goal:** Make persisted incidents accurately represent one first occurrence and then increment occurrence counts predictably.

- [x] Update `buildTelemetryDedupeKey()` in `app/sentinel-api/src/modules/telemetry/storage/mappers/insert-incident.mapper.ts` if needed so it represents the rule/event stream key only, while `IncidentPersistenceService.appendEvent()` controls time-window dedupe through `dedupeWindowSeconds`.
- [x] Update `IncidentPersistenceService.appendEvent()` in `app/sentinel-api/src/modules/telemetry/storage/services/incident-persistence.service.ts` so first-occurrence inserts always write `details.occurrenceCount = 1`, `previousSeverity = null`, and no duplicate-like label metadata.
- [x] Update `IncidentPersistenceService.appendEvent()` so deduplicated updates increment `details.occurrenceCount` by exactly 1 per accepted event and preserve `lastEvent.eventType`, `lastEvent.timestamp`, and `lastEvent.metadata`.
- [x] Update `IncidentPersistenceService.appendBatch()` in `app/sentinel-api/src/modules/telemetry/storage/services/incident-persistence.service.ts` to keep sequential persistence but remove unused configuration resolution if it remains unused after implementation.
- [x] Write tests in `app/sentinel-api/src/modules/telemetry/storage/services/incident-persistence.service.test.ts` for first `RIGHT_CLICK_ATTEMPT`, first `CLIPBOARD_ATTEMPT`, first `TAB_SWITCH`, and first `FULL_SCREEN_EXIT` producing one row each with `occurrenceCount: 1`.
- [x] Write tests in `app/sentinel-api/src/modules/telemetry/storage/services/incident-persistence.service.test.ts` for repeated same-rule events within the dedupe window updating one row to `occurrenceCount: 2`, and repeated events outside the dedupe window creating a new row.

**Migration required:** No - occurrence counts and severity metadata already live in `flagged_incidents.details`.
**Migration applied:** No - `flagged_incidents.details` already stores occurrence and severity metadata.
**Breaking changes:** No - persistence behavior remains compatible and only removes an unused batch lookup.
<!-- NOTE: Phase 2 validation passed with `pnpm --dir app/sentinel-api exec vitest run --passWithNoTests src/modules/telemetry/storage/services/incident-persistence.service.test.ts` after escalation for the configured Supabase test database (1 file, 5 tests). The same test failed without escalation because the sandbox could not reach `aws-1-ap-northeast-1.pooler.supabase.com`. -->

## Phase 3: Calibrated Severity Model

**Goal:** Make severity scale with occurrence count and documented thresholds instead of defaulting sensitive events to high severity too early.

- [x] Update `SEVERITY_STRATEGIES` in `app/sentinel-api/src/modules/telemetry/storage/services/incident-severity-resolver.service.ts` so `webSecurity.tab_switching_monitor`, `webSecurity.full_screen_required`, `webSecurity.clipboard_control`, `webSecurity.right_click_disable`, `aiRules.gaze_tracking`, and `aiRules.audio_anomaly_detection` use `LOW` for counts 1-2, `MEDIUM` for counts 3-5, and `HIGH` for counts 6+.
- [x] Decide and document in `incident-severity-resolver.service.ts` whether `aiRules.face_detection`, `aiRules.multiple_faces_detection`, `webSecurity.print_screen_disable`, and mobile security rules remain immediate/fixed high or move to the same ladder; default to the same ladder unless product/security explicitly requires immediate high.
- [x] Update `SILENCE_AUDIO_SEVERITY_STRATEGY` in `app/sentinel-api/src/modules/telemetry/storage/services/incident-severity-resolver.service.ts` to remain no more aggressive than the shared audio ladder.
- [x] Ensure `resolveSeverity()` stores `severityInputs.matchingCount`, `matchingWindowSeconds`, `repeatThreshold`, and `ladder` values that instructors can interpret.
- [x] Write tests in `app/sentinel-api/src/modules/telemetry/storage/services/incident-severity-resolver.service.test.ts` covering counts 1, 2, 3, 5, and 6 for clipboard, tab switch, right-click, gaze, and audio anomaly.
- [x] Write tests in `app/sentinel-api/src/modules/telemetry/storage/services/incident-persistence.service.test.ts` proving severity escalates on deduplicated occurrence counts and does not jump to high at count 1 or 2.

**Migration required:** No - severity enum values already support `LOW`, `MEDIUM`, and `HIGH`.
**Migration applied:** No - severity calibration only changes resolver thresholds and metadata.
**Breaking changes:** No API shape changes; instructor-visible severity values become less aggressive for low-count events by design.
<!-- NOTE: Phase 3 validation passed with `pnpm --dir app/sentinel-api exec vitest run --passWithNoTests src/modules/telemetry/storage/services/incident-severity-resolver.service.test.ts` (1 file, 10 tests) and `pnpm --dir app/sentinel-api exec vitest run --passWithNoTests src/modules/telemetry/storage/services/incident-persistence.service.test.ts` with DB escalation (1 file, 6 tests). -->

## Phase 4: Fullscreen Submission Suppression

**Goal:** Prevent `full_screen_required` flags caused by normal submission, completion, or system-initiated minimization.

- [x] Update the attempt submission flow in `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/index.ts` so monitoring suspension happens before the completion request and before any route transition.
- [x] Update `useTelemetry()` in `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-monitoring/use-telemetry.ts` to ignore emissions after `isMonitoringSuspended.current` becomes true, even if a listener fires late.
- [x] Update `IncidentPersistenceService.appendEvent()` in `app/sentinel-api/src/modules/telemetry/storage/services/incident-persistence.service.ts` to reject or ignore `FULL_SCREEN_EXIT` events when `exam_attempts.status = 'COMPLETED'` or `completed_at` is set, while preserving the existing grace period for non-fullscreen final telemetry batches if still required.
- [x] Write tests in `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-monitoring.test.ts` proving fullscreen exit after `suspendSecurityMonitoring()` emits no telemetry and no lock.
- [x] Write tests in `app/sentinel-api/src/modules/telemetry/storage/services/incident-persistence.service.test.ts` proving completed attempts do not persist `FULL_SCREEN_EXIT`, while active attempts still persist student-caused fullscreen exits.

**Migration required:** No - completion state already exists on `exam_attempts.status` and `exam_attempts.completed_at`.
**Migration applied:** No - fullscreen suppression uses existing `exam_attempts` completion columns.
**Breaking changes:** No - completed-attempt fullscreen telemetry is ignored server-side instead of creating a false flag.
<!-- NOTE: Phase 4 validation passed with `pnpm --dir app/sentinel-web exec vitest run --passWithNoTests 'src/app/(protected)/student/exam/[id]/_hooks/use-exam-monitoring.test.ts' 'src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/index.test.tsx'` (2 files, 25 tests) and `pnpm --dir app/sentinel-api exec vitest run --passWithNoTests src/modules/telemetry/storage/services/incident-persistence.service.test.ts` with DB escalation (1 file, 8 tests). -->

## Phase 5: Instructor Monitoring Visibility and Toasts

**Goal:** Make every committed incident visible to instructors within 2 seconds and toast each new event while the instructor page is open.

- [x] Update `useExamMonitoringOverviewQuery()` in `packages/hooks/src/query/exams/use-exam-monitoring-overview-query.ts` to use a 2000 ms `refetchInterval` and preserve background behavior only if it is acceptable for instructor monitoring load.
- [x] Update `useExamIncidentsQuery()` in `packages/hooks/src/query/exams/use-exam-incidents-query.ts` to accept an optional polling interval or default the incident logs page to a 2000 ms `refetchInterval`.
- [x] Update `useMonitoring()` in `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/monitoring/_hooks/use-monitoring.ts` to track previously seen `latestIncidentType`, `incidentCount`, and `openIncidentCount` per `attemptId`, and call `toast.warning()` when a student receives a new incident.
- [x] Update `useIncidentLogs()` in `app/sentinel-web/src/features/exams/logs/hooks/use-incident-logs.ts` to track newly seen `incidentId` values and occurrence-count increases from `details.occurrenceCount`, then call `toast.warning()` once per new incident/update while the page is mounted.
- [x] Update `mapMonitoringIncident()` in `app/sentinel-api/src/modules/examination/monitoring/services/map-monitoring-response.ts` only if needed so the instructor UI receives enough data to distinguish new incidents from occurrence updates.
- [x] Write tests in `packages/hooks/src/query/exams/use-exam-incidents-query.test.ts` and a new or existing `packages/hooks/src/query/exams/use-exam-monitoring-overview-query.test.ts` verifying 2000 ms refetch configuration.
- [x] Write tests in `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/monitoring/_hooks/use-monitoring.test.tsx` proving `toast.warning()` fires only when incident counts increase after the initial load.
- [x] Write tests in `app/sentinel-web/src/features/exams/logs/hooks/use-incident-logs.test.ts` proving `toast.warning()` fires for newly fetched incident IDs and does not fire repeatedly for the same incident.

**Migration required:** No - this phase changes query behavior and client notification logic only.
**Migration applied:** No - instructor polling and toast state use existing API fields and client state only.
**Breaking changes:** No - REST response shapes remain unchanged and polling interval changes are client-side only.
<!-- NOTE: `mapMonitoringIncident()` already exposes `occurrenceCount`, `severityReason`, and matching-window metadata, so no Phase 5 backend mapper change was needed. Phase 5 validation passed with `pnpm --dir packages/hooks exec vitest run --passWithNoTests src/query/exams/use-exam-incidents-query.test.ts src/query/exams/use-exam-monitoring-overview-query.test.ts` (2 files, 4 tests), `pnpm --dir app/sentinel-web exec vitest run --passWithNoTests 'src/app/(protected)/(instructor)/exams/[id]/monitoring/_hooks/use-monitoring.test.tsx' src/features/exams/logs/hooks/use-incident-logs.test.ts` (2 files, 11 tests), and `pnpm exec prettier --check ...` over the Phase 5 touched files. -->

## Phase 6: Instructor Incident Log Parity and UX Finalization

**Goal:** Ensure the instructor sees the same committed incidents and interprets occurrence/severity consistently.

- [x] Update `getExamMonitoringOverview()` in `app/sentinel-api/src/modules/examination/monitoring/services/get-exam-monitoring-overview.ts` so incident summaries count committed `flagged_incidents` rows consistently with the incident log endpoint.
- [x] Update `getExamMonitoringStudentDetail()` in `app/sentinel-api/src/modules/examination/monitoring/services/get-exam-monitoring-student-detail.ts` so `flags` include the latest occurrence count and calibrated severity for each incident.
- [x] Update `app/sentinel-web/src/features/exams/monitoring/_components/flagging-timeline.tsx` to display occurrence count and calibrated severity from the existing `Flag` model without adding duplicate labels for first occurrences.
- [x] Update `app/sentinel-web/src/features/exams/logs/components/columns.tsx` and `app/sentinel-web/src/features/exams/logs/components/incident-drawer.tsx` to show `details.occurrenceCount`, `details.severityReason`, and severity ladder context when present.
- [x] Write tests in `app/sentinel-api/src/modules/examination/monitoring/services/map-monitoring-response.test.ts` for occurrence count, severity reason, and first-event display data.
- [x] Write tests in `app/sentinel-web/src/features/exams/monitoring/_components/flagging-timeline.test.tsx` to ensure first events do not render a duplicate label and repeated events show occurrence count.
- [x] Write tests in `app/sentinel-web/src/features/exams/logs/components/incident-drawer.test.tsx` or the nearest existing logs component test for calibrated severity details.

**Migration required:** No - existing DTO details carry occurrence/severity metadata.
**Migration applied:** No - Phase 6 uses existing monitoring DTO and telemetry details fields.
**Breaking changes:** No - response shapes remain backward compatible; the UI now displays existing occurrence and severity metadata.
<!-- NOTE: Phase 6 validation passed with `pnpm --dir app/sentinel-api exec vitest run --passWithNoTests src/modules/examination/monitoring/services/map-monitoring-response.test.ts` (1 file, 8 tests), `pnpm --dir app/sentinel-web exec vitest run --passWithNoTests src/features/exams/monitoring/_components/flagging-timeline.test.tsx src/features/exams/logs/components/incident-drawer.test.tsx` (2 files, 5 tests), and `pnpm exec prettier --check ...` over the Phase 6 touched files. -->

## Phase 7: Validation and Release Readiness

**Goal:** Verify the full flow from student event emission to instructor visibility before implementation is considered done.

- [ ] Run `pnpm --dir app/sentinel-web test -- use-exam-monitoring`.
- [ ] Run `pnpm --dir app/sentinel-web test -- use-monitoring`.
- [ ] Run `pnpm --dir app/sentinel-web test -- use-incident-logs`.
- [ ] Run `pnpm --dir app/sentinel-api test -- incident-severity-resolver`.
- [ ] Run `pnpm --dir app/sentinel-api test -- incident-persistence`.
- [ ] Run `pnpm --dir app/sentinel-api test -- map-monitoring-response`.
- [ ] Run `pnpm lint`.
- [ ] Manually verify one local exam attempt: first right click, first clipboard attempt, first tab switch, and active fullscreen exit each appear once on the instructor page/logs.
- [ ] Manually verify submission: submit an exam with fullscreen enabled and confirm no post-submit `FULL_SCREEN_EXIT` incident is created.
- [ ] Manually verify real-time target: instructor monitoring/logs update within 2 seconds and fire one `toast.warning()` per new committed incident.

**Migration required:** No - validation only.
**Migration applied:** No - validation only.
**Breaking changes:** No - Phase 7 did not introduce code changes.
<!-- NOTE: Phase 7 validation is not complete. The exact package-script commands `pnpm --dir app/sentinel-web test -- use-exam-monitoring`, `pnpm --dir app/sentinel-web test -- use-monitoring`, and `pnpm --dir app/sentinel-web test -- use-incident-logs` began broad unrelated web test collection and surfaced unrelated failures in announcement, question-bank, exam builder, grading, feedback, and reports suites before being interrupted to avoid runaway sessions. The exact package-script commands `pnpm --dir app/sentinel-api test -- incident-severity-resolver`, `pnpm --dir app/sentinel-api test -- incident-persistence`, and `pnpm --dir app/sentinel-api test -- map-monitoring-response` also began broad unrelated API test collection and surfaced sandbox-blocked database/Redis failures before being interrupted. Focused validation for the implemented scope passed with `pnpm --dir app/sentinel-web exec vitest run --passWithNoTests 'src/app/(protected)/student/exam/[id]/_hooks/use-exam-monitoring.test.ts'` (1 file, 18 tests), `pnpm --dir app/sentinel-web exec vitest run --passWithNoTests 'src/app/(protected)/(instructor)/exams/[id]/monitoring/_hooks/use-monitoring.test.tsx'` (1 file, 4 tests), `pnpm --dir app/sentinel-web exec vitest run --passWithNoTests src/features/exams/logs/hooks/use-incident-logs.test.ts` (1 file, 7 tests), `pnpm --dir app/sentinel-api exec vitest run --passWithNoTests src/modules/telemetry/storage/services/incident-severity-resolver.service.test.ts src/modules/examination/monitoring/services/map-monitoring-response.test.ts` (2 files, 18 tests), and `pnpm --dir app/sentinel-api exec vitest run --passWithNoTests src/modules/telemetry/storage/services/incident-persistence.service.test.ts` with DB escalation (1 file, 8 tests). `pnpm lint` failed before linting this change because `@sentinel/db` could not find `eslint` (`sh: eslint: command not found`). Manual browser verification remains unchecked because the automated Phase 7 gate is failing and no authenticated local exam attempt/test account was provided in this session. -->

## Breaking API Changes

- None planned. Existing telemetry and monitoring response shapes should remain backward compatible.
- If a new live transport endpoint is later chosen instead of polling, add it as an additive endpoint and keep current REST endpoints.

## Environment Changes

- None planned for Option 1.
- If the later implementation switches to SSE/websocket/Supabase channels, document any required URL, auth, or realtime service variables before coding.

## Rollback Notes

- No Prisma migration rollback is required for this plan.
- If severity thresholds need rollback, revert only `SEVERITY_STRATEGIES` and related tests in `incident-severity-resolver.service.ts`.
- If 2-second polling causes production load issues, increase the polling interval in `useExamMonitoringOverviewQuery()` and `useExamIncidentsQuery()` while keeping server-side correctness changes.

## Out of Scope for This Plan

- Automatic exam closure after multiple high-severity events and instructor retake approval controls from `docs/todo/main/index.md`. That work likely needs a separate plan because it may touch `exam_attempts`, `exam_lobby_admissions`, access overrides, instructor controls, student navigation, and possibly a Prisma migration depending on final retake-state requirements.
