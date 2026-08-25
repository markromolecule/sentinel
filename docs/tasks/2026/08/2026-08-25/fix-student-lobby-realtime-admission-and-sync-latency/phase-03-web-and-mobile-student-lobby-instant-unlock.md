---
title: "Phase 3: Web & Mobile Student Lobby Optimistic Instant Gating"
type: phase
parent: "fix-student-lobby-realtime-admission-and-sync-latency"
phase: "03"
status: completed
created: "2026-08-25"
tags: [task, phase, web, mobile, lobby, optimistic-ui]
---

# Phase 3: Web & Mobile Student Lobby Optimistic Instant Gating

## Objective

Fix the client-side state deadlock in `sentinel-web` and `sentinel-mobile` so that when a single student (or batch) is approved by the instructor, the "Continue to Attempt" / "Resume Exam" button instantly unlocks in `< 100ms` without waiting on secondary asynchronous `refetchExam()` HTTP roundtrips.

---

## Dependencies & Prerequisites

- Phase 1 and Phase 2 completed.

---

## Impacted Files & Components

- [`app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/_hooks/use-lobby-state.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/_hooks/use-lobby-state.ts) — Refactored `canEnterExam` logic to unlock immediately upon `admissionStatus === 'APPROVED'` when exam is open.
- [`app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/_components/lobby-footer-actions.tsx`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/_components/lobby-footer-actions.tsx) — Verified button labels and disabled states react instantly without waiting loops.
- [`app/sentinel-mobile/features/exam/hooks/use-exam-lobby.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/features/exam/hooks/use-exam-lobby.ts) — Aligned mobile lobby gating and realtime hooks with the instant unlock pattern.
- [`app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/_hooks/use-lobby-state.test.tsx`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/_hooks/use-lobby-state.test.tsx) — Updated unit tests for instant unlocking.

---

## Implementation Tasks

- [x] **Task 3.1: Eliminate Client State Deadlock in `use-lobby-state.ts`**
  - Simplified `hasApprovedInstructorAdmission`:
    ```ts
    const hasApprovedInstructorAdmission = admissionStatus === 'APPROVED' && !isHardRuntimeBlock;
    ```
  - Allowed `canEnterExam = true` when `hasApprovedInstructorAdmission` is true, without blocking on `isAdmissionPendingRefresh` or `runtimeAccess.state === 'lobby_approved'`.
  - Non-blockingly refresh `refetchExam()` in the background to update countdown timer and server details.
- [x] **Task 3.2: Align `LobbyFooterActions` State Labels**
  - Ensured `primaryDisabled` and label transitions (`'Waiting for Approval'` $\rightarrow$ `'Continue to Attempt'`) happen synchronously in memory the moment `admissionStatus === 'APPROVED'`.
- [x] **Task 3.3: Align Mobile Lobby `use-exam-lobby.ts`**
  - Connected mobile lobby to the updated `useLobbyRealtime` and `useExamLobbyAdmissionStatusQuery` with instant optimistic gating.
- [x] **Task 3.4: Execute Web and Mobile Test Suites**
  - Ran `pnpm --filter sentinel-web test src/app/(protected)/student/exam/[id]/lobby` (PASS: 7 test files, 38/38 passed).
  - Ran `pnpm --filter sentinel-web test src/app/(protected)/(instructor)/exams/[id]/lobby` (PASS: 4 test files, 23/23 passed).
  - Ran `pnpm --filter sentinel-mobile test` (PASS: 30 test files, 144/144 passed).
  - Ran `pnpm --filter @sentinel/hooks build && pnpm --filter sentinel-web build` (PASS: zero compilation/TypeScript errors).

---

## Verification & Testing

- `pnpm --filter sentinel-web test src/app/(protected)/student/exam/[id]/lobby` (PASS: 38/38 tests)
- `pnpm --filter sentinel-mobile test features/exam/hooks/use-exam-lobby.test.ts features/exam/lib/mobile-exam-lobby.test.ts` (PASS: 10/10 tests)
- End-to-end simulation test: Verified state transition from `WAITING` to `APPROVED` enables primary button with 0ms delay.
- Next.js production build: 58/58 static routes compiled without error.

---

## Risks & Rollback

- **Risk:** Student clicking attempt before server confirms admission.
- **Mitigation:** The `startExamSession` API endpoint on the backend strictly validates `exam_lobby_admissions` in the database, guaranteeing authorization security.
