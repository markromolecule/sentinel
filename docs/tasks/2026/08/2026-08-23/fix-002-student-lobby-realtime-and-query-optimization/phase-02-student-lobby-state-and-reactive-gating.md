---
title: "Phase 2: Student Lobby State & Reactive Gating Migration"
type: phase
parent: "fix-002-student-lobby-realtime-and-query-optimization"
phase: "2"
status: completed
created: "2026-08-23"
tags: [task, phase, sentinel-web, student-lobby, ui]
---

# Phase 2: Student Lobby State & Reactive Gating Migration

## Objective

Refactor `use-lobby-state.ts` in `sentinel-web` to consume `useExamLobbyAdmissionStatusQuery` as the single reactive source of truth for admission status, eliminate the 45-second manual interval timer, trigger toast feedback when admitted, and dynamically unlock the entry button in `< 500ms`.

## Dependencies & Prerequisites

- Phase 1 completed (`@sentinel/hooks` query & realtime improvements).

## Impacted Files & Components

- `app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/_hooks/use-lobby-state.ts`: Connect to `useExamLobbyAdmissionStatusQuery`, remove 45s interval, handle check-in on mount.
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/_hooks/use-lobby-actions.ts`: Guarantee instant entry handling.
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/_components/lobby-footer-actions.tsx`: Dynamic button state.
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/page.tsx`: Page integration.

## Implementation Tasks

- [x] Task 2.1 — Refactor `use-lobby-state.ts`:
  - Integrate `const { data: admissionData } = useExamLobbyAdmissionStatusQuery(examId)`.
  - Resolve `admissionStatus = admissionData?.status ?? null`.
  - Handle initial check-in via `useEffect` on mount without setting up redundant 45-second intervals.
  - Connect `useLobbyRealtime` to invalidate queries and trigger instant refresh.
- [x] Task 2.2 — Add Student Feedback Toast:
  - Track previous admission status using a ref (`prevStatusRef`).
  - When `admissionStatus` transitions from `WAITING` to `APPROVED`, display `toast.success('Instructor approval received! You may now continue to the exam attempt.')` and trigger `refetchExam()`.
- [x] Task 2.3 — Verify dynamic unlock in `LobbyFooterActions`:
  - Ensure `primaryDisabled` becomes `false` and label becomes `"Continue to Attempt"` (or `"Resume Exam"` if reconnecting).
- [x] Task 2.4 — Update tests in `sentinel-web`:
  - Updated `use-lobby-state.test.tsx` and verified all 7 test files pass.

## Verification & Testing

- `pnpm --filter sentinel-web test src/app/(protected)/student/exam/[id]/lobby` (**PASS**: 7/7 test files, 38/38 tests passed)

## Risks & Rollback

- *Risk:* Multiple toast notifications if query re-renders frequently.
- *Mitigation:* `prevStatusRef` tracks status transitions and only fires once on edge transition from non-APPROVED to APPROVED.

