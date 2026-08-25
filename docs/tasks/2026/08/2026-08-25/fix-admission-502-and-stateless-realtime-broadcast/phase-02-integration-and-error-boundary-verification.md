---
title: "Phase 2: Integration, Full Test Suite Pass & CORS Verification"
type: phase
parent: "docs/tasks/2026/08/2026-08-25/fix-admission-502-and-stateless-realtime-broadcast/README.md"
phase: "02"
status: completed
created: "2026-08-25"
tags: [task, phase, api, integration, tests, cors]
---

# Phase 2: Integration, Full Test Suite Pass & CORS Verification

## Objective

Validate that the complete lobby admission lifecycle (check-in, waiting list query, admission update mutation, and real-time broadcast reception) works end-to-end without server exceptions, 502 errors, or broken CORS headers.

## Dependencies & Prerequisites

- Phase 1 completed: [`phase-01-stateless-rest-realtime-broadcast.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/tasks/2026/08/2026-08-25/fix-admission-502-and-stateless-realtime-broadcast/phase-01-stateless-rest-realtime-broadcast.md)

## Impacted Files & Components

- [`app/sentinel-api/src/modules/examination/lobby/lobby.service.test.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/lobby/lobby.service.test.ts)
- [`packages/hooks/src/use-lobby-realtime.test.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/packages/hooks/src/use-lobby-realtime.test.ts)
- [`packages/hooks/src/query/exams/use-update-exam-lobby-admissions-mutation.test.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/packages/hooks/src/query/exams/use-update-exam-lobby-admissions-mutation.test.ts)

## Implementation Tasks

- [x] Task 2.1: Run all API examination lobby module tests and verify 100% pass rate.
- [x] Task 2.2: Run hook tests for `useLobbyRealtime` and `useUpdateExamLobbyAdmissionsMutation` to verify client-side broadcast handling.
- [x] Task 2.3: Run CORS test suite (`src/tests/cors.test.ts`) in `sentinel-api`.
- [x] Task 2.4: Execute build verification across `@sentinel/hooks`, `@sentinel/services`, and `sentinel-api`.

## Verification & Testing

```bash
# 1. API Examination Lobby Tests
pnpm --filter sentinel-api vitest run src/modules/examination/lobby
# Result: PASS (All test files passed)

# 2. Client Realtime & Mutation Hook Tests
pnpm --filter @sentinel/hooks vitest run src/use-lobby-realtime.test.ts src/query/exams/use-update-exam-lobby-admissions-mutation.test.ts
# Result: PASS (All test files passed)

# 3. CORS Configuration Tests
pnpm --filter sentinel-api vitest run src/tests/cors.test.ts
# Result: PASS (All CORS assertions passed)

# 4. Monorepo Build Verification
pnpm --filter sentinel-api build
pnpm --filter @sentinel/hooks build && pnpm --filter @sentinel/services build
# Result: PASS (All packages compiled clean with zero TypeScript errors)
```

## Risks & Rollback

- Zero breaking changes to client payload formats or API schemas.
