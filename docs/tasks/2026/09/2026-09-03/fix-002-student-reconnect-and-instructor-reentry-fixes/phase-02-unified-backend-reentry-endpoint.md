---
title: "Phase 2: Unified Backend Re-Entry Endpoint & Counter Reset"
type: phase
parent: "docs/tasks/2026/09/2026-09-03/fix-002-student-reconnect-and-instructor-reentry-fixes/README.md"
phase: "2"
status: completed
created: "2026-09-03"
tags: [task, phase, examination, api, student-overrides, re-entry]
---

# Phase 2: Unified Backend Re-Entry Endpoint & Counter Reset

## Objective

Implement an atomic backend endpoint `POST /exams/:id/student-overrides/authorize-reentry/:studentId` that clears attempt lifecycle locks (`lifecycle_state = 'IN_PROGRESS'`), resets `reconnect_attempt_count = 0` directly in the database, sets lobby admission to `APPROVED`, records an audit event, and broadcasts a real-time event.

## Dependencies & Prerequisites

- Phase 1 complete (session logic & reconnect decoupling).

## Impacted Files & Components

- `app/sentinel-api/src/modules/examination/student-overrides/student-overrides.service.ts`:
  - Added `authorizeStudentReentry` service method.
- `app/sentinel-api/src/modules/examination/student-overrides/student-overrides.dto.ts`:
  - Defined `authorizeStudentReentrySchema` parameters and response DTO.
- `app/sentinel-api/src/modules/examination/student-overrides/controllers/authorize-student-reentry.controller.ts`:
  - Created OpenAPI route and handler for the unified re-entry action with RBAC checks.
- `app/sentinel-api/src/modules/examination/student-overrides/student-overrides.routes.ts`:
  - Registered `authorizeStudentReentryRoute`.
- `packages/services/src/api/exams/`:
  - Added `authorizeStudentReentry` API client function and types.
- `packages/hooks/src/query/exams/`:
  - Added `useAuthorizeStudentReentryMutation` hook and exported from index.

## Implementation Tasks

- [x] **Task 2.1 — Service Implementation (`StudentOverridesService.authorizeStudentReentry`):**
  - Queries latest attempt and lobby admission for the student and exam.
  - Resets `reconnect_attempt_count = 0`, sets `lifecycle_state = 'IN_PROGRESS'`, sets `reopened_until`, clears closed timestamps.
  - Sets `exam_lobby_admissions` to `APPROVED`.
  - Appends `REOPENED` lifecycle event and audit record.
  - Dispatches `broadcastLobbyEvent(examId, 'admission:updated', { ... })`.
- [x] **Task 2.2 — Route & Controller:**
  - Created `authorize-student-reentry.controller.ts` with assessment access and student enrollment verification.
  - Registered route in `student-overrides.routes.ts`.
- [x] **Task 2.3 — Shared Client SDK & Hook:**
  - Added `authorizeStudentReentry` in `@sentinel/services`.
  - Added `useAuthorizeStudentReentryMutation` in `@sentinel/hooks` invalidating monitoring, lobbyWaitingList, and lobbyCount query keys on success.
- [x] **Task 2.4 — Automated Tests:**
  - Added unit tests in `student-overrides.service.test.ts` and `use-authorize-student-reentry-mutation.test.ts`.

## Verification & Testing

```bash
pnpm --filter sentinel-api test src/modules/examination/student-overrides/
pnpm --filter @sentinel/hooks exec vitest run src/query/exams/use-authorize-student-reentry-mutation.test.ts
pnpm --filter @sentinel/services build && pnpm --filter @sentinel/hooks build
```
**Output:**
```
✓ src/modules/examination/student-overrides/student-overrides.service.test.ts (4 tests) 41ms
Test Files  1 passed (1)
     Tests  4 passed (4)

✓ src/query/exams/use-authorize-student-reentry-mutation.test.ts (1 test) 8ms
Test Files  1 passed (1)
     Tests  1 passed (1)

@sentinel/services build: tsc (exited with code 0)
@sentinel/hooks build: tsc (exited with code 0)
```

## Risks & Rollback

- **Risk:** Reopening a student whose exam duration has fully elapsed.
- **Mitigation:** Ensure re-entry respects exam overall `end_date_time` or sets a sensible bounded extension window.
