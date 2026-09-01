---
title: "Phase 1: Backend Lobby Queries and Status Partitioning"
type: phase
parent: "Fix: Exam Lobby Synchronization, Admission State, and Attempt Anomaly Remediation"
phase: "1"
status: completed
created: "2026-09-01"
tags: [task, phase, api, lobby]
---

# Phase 1: Backend Lobby Queries and Status Partitioning

## Objective
Fix backend lobby query logic so:
1. `getLobbyCount` excludes students who have submitted/completed their attempts.
2. `getWaitingList` selects `lifecycle_state` from `exam_attempts` and normalizes `attemptStatus` to `'SUBMITTED'` for completed attempts.
3. `lobby-admission-filters.ts` partitions completed/submitted attempts strictly into `submittedStudents` and never `approvedStudents`.

## Impacted Files & Components
- `app/sentinel-api/src/modules/examination/lobby/services/get-lobby-count.ts`
- `app/sentinel-api/src/modules/examination/lobby/services/get-lobby-count.test.ts`
- `app/sentinel-api/src/modules/examination/lobby/services/get-waiting-list.ts`
- `app/sentinel-api/src/modules/examination/lobby/services/get-waiting-list.test.ts`
- `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/lobby/_lib/lobby-admission-filters.ts`
- `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/lobby/_lib/lobby-admission-filters.test.ts`
- `app/sentinel-core/src/app/(protected)/exams/[id]/lobby/_lib/lobby-admission-filters.ts`
- `app/sentinel-core/src/app/(protected)/exams/[id]/lobby/_lib/lobby-admission-filters.test.ts`

## Implementation Tasks
- [x] In `get-lobby-count.ts`, update the query to select `COUNT(DISTINCT ela.student_id)` and join against latest attempt status, filtering out rows where latest attempt is `'COMPLETED'` or `lifecycle_state = 'SUBMITTED'`.
- [x] In `get-waiting-list.ts`, select `lifecycle_state` and normalize `attemptStatus` so both `'COMPLETED'` and `'SUBMITTED'` map to `'SUBMITTED'`.
- [x] In `lobby-admission-filters.ts`, ensure `getLobbyAdmissionGroups` and `filterLobbyAdmissions` handle both `'SUBMITTED'` and `'COMPLETED'` attempt statuses.
- [x] Update and run unit test suites in `get-lobby-count.test.ts`, `get-waiting-list.test.ts`, and `lobby-admission-filters.test.ts`.

## Verification & Testing
- Command: `pnpm --dir app/sentinel-api test src/modules/examination/lobby` (PASS: 33/33 tests passed across 7 test files)
- Command: `pnpm --dir app/sentinel-web test src/app/(protected)/(instructor)/exams/[id]/lobby` (PASS: 24/24 tests passed across 4 test files)
- Command: `pnpm --dir app/sentinel-core test src/app/(protected)/exams/[id]/lobby/_lib/lobby-admission-filters.test.ts` (PASS: 9/9 tests passed)

## Risks & Rollback
- Clean and backward-compatible status normalization. Rollback is standard git revert.
