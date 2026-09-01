---
title: "Phase 3: Student Reconnect Count Synchronization"
type: phase
parent: "Fix: Exam Lobby Synchronization, Admission State, and Attempt Anomaly Remediation"
phase: "3"
status: completed
created: "2026-09-01"
tags: [task, phase, api, web, reconnect]
---

# Phase 3: Student Reconnect Count Synchronization

## Objective
Synchronize the reconnect count between the student lobby and instructor lobby so the student sees the exact remaining reconnect attempts on the badge and info panel.

## Impacted Files & Components
- `app/sentinel-api/src/modules/examination/access/services/evaluate-student-exam-eligibility.service.ts`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/_utils/index.ts`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/_utils/index.test.ts`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/_hooks/use-lobby-state.ts`

## Implementation Tasks
- [x] In `evaluate-student-exam-eligibility.service.ts`, verify `reconnectAttemptCount` is extracted from `latestAttempt` and passed directly to `resolveExamRuntimeAccess`.
- [x] In `_utils/index.ts`, audit `resolveReconnectDisplay` to ensure valid `reconnectAttemptsRemaining` and `totalReconnectAttempts` are parsed and formatted without falling back to placeholder 0 when `runtimeAccess` is provided.
- [x] In `use-lobby-state.ts`, ensure `refetchExam` triggers clean recalculation when admission status updates.
- [x] Add and execute unit tests for `resolveReconnectDisplay` and eligibility calculations.

## Verification & Testing
- Command: `pnpm --dir app/sentinel-api test src/modules/examination/access` (PASS: 21/21 tests passed across 2 test files)
- Command: `pnpm --dir app/sentinel-web test src/app/(protected)/student/exam/[id]/lobby/_utils/index.test.ts` (PASS: 9/9 tests passed)
- Command: `pnpm --dir app/sentinel-web test src/app/(protected)/student/exam/[id]/lobby` (PASS: 38/38 tests passed across 7 test files)

## Risks & Rollback
- Reconnect display calculation is isolated in utility helpers with comprehensive test coverage.
