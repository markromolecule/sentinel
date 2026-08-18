---
title: "Phase 1: Backend Runtime Access Resolution & Student Avatar Retrieval"
type: phase
parent: "fix-002-student-lobby-realtime-and-avatars"
phase: "1"
status: completed
created: "2026-08-19"
tags: [task, phase, api, backend, avatars, runtime-access]
---

# Phase 1: Backend Runtime Access Resolution & Student Avatar Retrieval

## Objective

Fix backend lobby runtime access resolution so that resuming students in instructor-gated exams retain `canResume = true` when approved, and enrich the lobby waiting list query to extract student avatar URLs from profile and OAuth metadata.

## Dependencies & Prerequisites

- None.

## Impacted Files & Components

- [resolve-lobby-runtime-access.ts](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/access/services/resolve-lobby-runtime-access.ts) (`resolveLobbyRuntimeAccess`)
- [get-waiting-list.ts](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/lobby/services/get-waiting-list.ts) (`getWaitingList`)
- [lobby.dto.ts](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/lobby/lobby.dto.ts) (`getWaitingListSchema`)
- [exam-lobby-service.ts](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/packages/services/src/examination/lobby/exam-lobby-service.ts) (`ExamLobbyWaitingStudent`)
- Tests in `app/sentinel-api/src/modules/examination/access` and `src/modules/examination/lobby`.

## Implementation Tasks

- [x] Task 1.1 — Update `resolve-lobby-runtime-access.ts`:
  - When `admissionStatus === 'APPROVED'`, set `canResume: Boolean(scheduledRuntimeAccess.canResume)`.
  - Ensure `canStart` is set to `Boolean(scheduledRuntimeAccess.canStart || !scheduledRuntimeAccess.hasActiveAttempt)`.
- [x] Task 1.2 — Update `get-waiting-list.ts`:
  - Left join `auth.users as au on s.user_id = au.id`.
  - Coalesce `up.avatar_url`, `au.raw_user_meta_data->>'avatar_url'`, and `au.raw_user_meta_data->>'picture'` as `avatarUrl`.
  - Map `avatarUrl: a.avatarUrl ?? null` in the returned waiting student array.
- [x] Task 1.3 — Update `lobby.dto.ts` and `packages/services/src/examination/lobby/exam-lobby-service.ts`:
  - Add `avatarUrl: z.string().nullable().optional()` to `getWaitingListSchema`.
  - Add `avatarUrl?: string | null` to `ExamLobbyWaitingStudent` TypeScript type.
  - Run `pnpm --filter @sentinel/services build`.
- [x] Task 1.4 — Update and execute automated unit tests for `resolve-lobby-runtime-access` and `getWaitingList`.

## Verification & Testing

- `pnpm --filter sentinel-api test src/modules/examination/access` — Passed. Vitest reported 2 test files and 21 tests passed.
- `pnpm --filter sentinel-api test src/modules/examination/lobby` — Passed. Vitest reported 5 test files and 21 tests passed.
- `pnpm --filter @sentinel/services build` — Passed. `tsc` completed successfully.
- `pnpm --filter sentinel-api test src/tests/exams/exam-contracts.test.ts` — Passed. Vitest reported 1 test file and 23 tests passed.

## Deviations

- The planned shared service file path `packages/services/src/examination/lobby/exam-lobby-service.ts` did not exist in the current repository. The existing `ExamLobbyWaitingStudent` contract is in `packages/services/src/api/exams/lobby.ts`, so the type update was applied there.

## Security Review

- The waiting-list query remains scoped by trusted server-side `exam_id` filtering and uses Kysely/sql template expressions without interpolating untrusted values into raw SQL. The new `auth.users` join only reads avatar metadata for students already included in the exam lobby admission list.

## Result

- Phase 1 is complete. Approved lobby runtime access now preserves resume eligibility for active attempts while still allowing approved fresh starts, and waiting-list responses now include `avatarUrl` resolved from profile or OAuth metadata.

## Risks & Rollback

- *Risk:* `auth.users` join failure if database schema permissions are restrictive.
- *Mitigation:* Use existing `sql` template literal coalesce pattern verified in other modules (`get-exam-assignments.ts`, `get-user.query.ts`).
