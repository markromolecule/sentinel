# Task 1 — Phase 1: Owned-Session Status Contract

**Status:** Not started  
**Parent plan:** `../../fix-001-implementation-plan-attempt-lifecycle-progress-turn-in-evidence.md`

## Goal

Expose a small, authenticated status response for the currently owned attempt without refetching
questions, answers, scores, or configuration.

## Implementation Checklist

- [ ] Add `sessionStatusSchema` and exported request/response types in
      `app/sentinel-api/src/modules/examination/flow/flow.dto.ts` with `sessionId`, `attemptId`,
      `examId`, `status`, `lifecycleState`, `completedAt`, `closedReason`, and a server-resolved
      terminal message.
- [ ] Extend `findOwnedAttempt()` in
      `app/sentinel-api/src/modules/examination/flow/data/_queries/attempt-queries.ts` to select the
      additional lifecycle fields without exposing score or answer snapshots.
- [ ] Add exported `getSessionStatusService()` with JSDoc in
      `app/sentinel-api/src/modules/examination/flow/services/get-session-status.service.ts`; reuse
      `SessionRepository.getOwnedSessionAttempt()` and return `404` for missing/cross-student
      sessions.
- [ ] Add `FlowService.getSessionStatus()` with JSDoc in
      `app/sentinel-api/src/modules/examination/flow/flow.service.ts`.
- [ ] Add `GET /sessions/:sessionId/status` in
      `app/sentinel-api/src/modules/examination/flow/controllers/get-session-status.controller.ts`
      and register it in `app/sentinel-api/src/modules/examination/flow/flow.routes.ts` after auth.
- [ ] Add `ExamSessionStatusResult` and supporting unions to
      `packages/services/src/api/exams/types.ts`; add exported `getExamSessionStatus()` with JSDoc to
      `packages/services/src/api/exams/flow.ts`.
- [ ] Add `EXAM_QUERY_KEYS.sessionStatus(sessionId)` to
      `packages/shared/src/constants/exams/exam-constants.ts`.
- [ ] Create `packages/hooks/src/query/exams/use-exam-session-status-query.ts` with a two-second
      interval enabled only while a session exists and the caller marks the attempt active; export
      it from `packages/hooks/src/query/exams/index.ts`.

## Tests and Verification

- [ ] Create
      `app/sentinel-api/src/modules/examination/flow/services/get-session-status.service.test.ts`
      and
      `app/sentinel-api/src/modules/examination/flow/controllers/get-session-status.controller.test.ts`
      covering owned `IN_PROGRESS`, `LOCKED`, `CLOSED`, `SUBMITTED`, `SUPERSEDED`, completed,
      missing, and cross-student sessions.
- [ ] Create `packages/services/src/api/exams/flow.test.ts` and
      `packages/hooks/src/query/exams/use-exam-session-status-query.test.ts` covering URL/response
      behavior, enablement, two-second polling, and background polling.
- [ ] Run the focused `sentinel-api`, `packages/services`, and `packages/hooks` suites and their
      typechecks.

## Migration Decision

**Migration required:** No — this phase reads existing `exam_attempts` columns.

## Completion Gate

- [ ] Record focused command results here during implementation.
- [ ] Confirm the response contains no answers, scores, configuration, or question content.
- [ ] Confirm cross-student access returns `404` without revealing attempt existence.
- [ ] Mark this phase complete only after tests pass.
