---
title: "Phase 2: Student Web & Mobile Lobby Entry Gating and Realtime Dynamic Unlock"
type: phase
parent: "fix-002-student-lobby-realtime-and-avatars"
phase: "2"
status: completed
created: "2026-08-19"
tags: [task, phase, frontend, student, web, mobile, gating, realtime]
---

# Phase 2: Student Web & Mobile Lobby Entry Gating and Realtime Dynamic Unlock

## Objective

Fix the entry gating calculation in student web and mobile lobby hooks so approved students (both first-time attempts and in-progress reconnects) immediately have the entry button enabled, and dynamically update the button label and state upon Realtime instructor approval.

## Dependencies & Prerequisites

- Phase 1 (Backend access resolution).

## Impacted Files & Components

- [use-lobby-state.ts](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/%28protected%29/student/exam/%5Bid%5D/lobby/_hooks/use-lobby-state.ts) (`useLobbyState`)
- [lobby-footer-actions.tsx](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/%28protected%29/student/exam/%5Bid%5D/lobby/_components/lobby-footer-actions.tsx) (`LobbyFooterActions`)
- [use-exam-lobby.ts](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/features/exam/hooks/use-exam-lobby.ts) (`useExamLobby`)
- Tests in `sentinel-web` and `sentinel-mobile`.

## Implementation Tasks

- [x] Task 2.1 — Refactor `use-lobby-state.ts` (`sentinel-web`):
  - Update `hasApprovedInstructorAdmission`:
    `admissionStatus === 'APPROVED' && (isApprovedRuntimeAccess || Boolean(runtimeAccess?.canStart) || Boolean(runtimeAccess?.canResume))`
  - Update `canEnterExam`:
    Include `runtimeAccess?.canResume` alongside `canStart` and `isApprovedRuntimeAccess`.
  - In `useLobbyRealtime` event handler, ensure optimistic setting of `admissionStatus = 'APPROVED'` and immediate call to `syncAdmission(true)`.
- [x] Task 2.2 — Update `lobby-footer-actions.tsx` (`sentinel-web`):
  - Ensure `getPrimaryLabel` correctly returns `"Resume Exam"` when `storedSession` exists or `runtimeAccess?.canResume` is true, and `"Continue to Attempt"` for fresh approved starts.
  - Verify that `primaryDisabled` enables immediately once `canEnterExam` is true and `admissionStatus === 'APPROVED'`.
- [x] Task 2.3 — Refactor `use-exam-lobby.ts` (`sentinel-mobile`):
  - Ensure `canEnterExam` and `hasApprovedInstructorAdmission` account for `canResume` so mobile students reconnecting through instructor-gated lobbies can proceed seamlessly.
- [x] Task 2.4 — Update and execute automated test suites for web and mobile student lobby hooks.

## Verification & Testing

- `pnpm --filter sentinel-web test 'src/app/(protected)/student/exam/[id]/lobby'` — Passed. Vitest reported 6 test files and 35 tests passed.
- `pnpm --filter sentinel-mobile test features/exam/hooks` — Passed. Vitest reported 3 test files and 10 tests passed.
- Realtime unlock behavior is covered by `use-lobby-state.test.tsx`, which invokes `useLobbyRealtime`'s admission-change callback, verifies optimistic `APPROVED` state, refetch, and approved resume entry when refreshed runtime access has `canResume: true`.

## Deviations

- `lobby-footer-actions.tsx` already returned `"Resume Exam"` for `runtimeAccess.canResume` and enabled the primary action through `canEnterExam`; no production footer change was needed. Added `lobby-footer-actions.test.tsx` regression coverage to verify the planned behavior.

## Result

- Phase 2 is complete. Web and mobile lobby gating now include approved resume access, web realtime admission events optimistically set approved status before refreshing access, and tests cover fresh approved entry, approved resume entry, and footer labels.

## Risks & Rollback

- *Risk:* Premature entry before student completes device checkup.
- *Mitigation:* `hasCompletedFlow` check remains strictly enforced across both web and mobile lobbies.
