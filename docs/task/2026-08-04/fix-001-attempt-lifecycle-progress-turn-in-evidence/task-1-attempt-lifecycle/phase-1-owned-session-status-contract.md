# Task 1 — Phase 1: Owned-Session Status Contract

**Status:** Complete  
**Parent plan:** `../../fix-001-implementation-plan-attempt-lifecycle-progress-turn-in-evidence.md`

## Goal

Expose a small, authenticated status response for the currently owned attempt without refetching
questions, answers, scores, or configuration.

## Implementation Checklist

- [x] Add `sessionStatusSchema` and exported request/response types in
      `app/sentinel-api/src/modules/examination/flow/flow.dto.ts` with `sessionId`, `attemptId`,
      `examId`, `status`, `lifecycleState`, `completedAt`, `closedReason`, and a server-resolved
      terminal message.
- [x] Extend `findOwnedAttempt()` in
      `app/sentinel-api/src/modules/examination/flow/data/_queries/attempt-queries.ts` to select the
      additional lifecycle fields without exposing score or answer snapshots.
- [x] Add exported `getSessionStatusService()` with JSDoc in
      `app/sentinel-api/src/modules/examination/flow/services/get-session-status.service.ts`; reuse
      `SessionRepository.getOwnedSessionAttempt()` and return `404` for missing/cross-student
      sessions.
- [x] Add `FlowService.getSessionStatus()` with JSDoc in
      `app/sentinel-api/src/modules/examination/flow/flow.service.ts`.
- [x] Add `GET /sessions/:sessionId/status` in
      `app/sentinel-api/src/modules/examination/flow/controllers/get-session-status.controller.ts`
      and register it in `app/sentinel-api/src/modules/examination/flow/flow.routes.ts` after auth.
- [x] Add `ExamSessionStatusResult` and supporting unions to
      `packages/services/src/api/exams/types.ts`; add exported `getExamSessionStatus()` with JSDoc to
      `packages/services/src/api/exams/flow.ts`.
- [x] Add `EXAM_QUERY_KEYS.sessionStatus(sessionId)` to
      `packages/shared/src/constants/exams/exam-constants.ts`.
- [x] Create `packages/hooks/src/query/exams/use-exam-session-status-query.ts` with a two-second
      interval enabled only while a session exists and the caller marks the attempt active; export
      it from `packages/hooks/src/query/exams/index.ts`.

## Tests and Verification

- [x] Create
      `app/sentinel-api/src/modules/examination/flow/services/get-session-status.service.test.ts`
      and
      `app/sentinel-api/src/modules/examination/flow/controllers/get-session-status.controller.test.ts`
      covering owned `IN_PROGRESS`, `LOCKED`, `CLOSED`, `SUBMITTED`, `SUPERSEDED`, completed,
      missing, and cross-student sessions.
- [x] Create `packages/services/src/api/exams/flow.test.ts` and
      `packages/hooks/src/query/exams/use-exam-session-status-query.test.ts` covering URL/response
      behavior, enablement, two-second polling, and background polling.
- [x] Run the focused `sentinel-api`, `packages/services`, and `packages/hooks` suites and their
      typechecks.

## Migration Decision

**Migration required:** No — this phase reads existing `exam_attempts` columns.

## Completion Gate

- [x] Record focused command results here during implementation.
      - `pnpm --dir app/sentinel-api exec vitest run src/modules/examination/flow/services/get-session-status.service.test.ts src/modules/examination/flow/controllers/get-session-status.controller.test.ts` — passed (2 files, 9 tests).
      - `pnpm --dir packages/services exec vitest run src/api/exams/flow.test.ts` — passed (1 file, 1 test).
      - `pnpm --dir packages/hooks exec vitest run src/query/exams/use-exam-session-status-query.test.ts` — passed (1 file, 3 tests).
      - `pnpm --dir packages/shared build` — passed; refreshed the package export used by hook tests.
      - `pnpm --dir packages/services build` — passed.
      - `pnpm --dir packages/hooks build` — passed.
      - `pnpm --dir app/sentinel-api typecheck` — failed with Node heap out-of-memory at the script's 4096 MB limit before TypeScript diagnostics.
      - `NODE_OPTIONS="--max-old-space-size=8192" pnpm --dir app/sentinel-api exec tsc --noEmit` — stopped after an extended no-output run; no diagnostics were emitted before interruption.
- [x] Confirm the response contains no answers, scores, configuration, or question content.
- [x] Confirm cross-student access returns `404` without revealing attempt existence.
- [x] Mark this phase complete only after tests pass.
