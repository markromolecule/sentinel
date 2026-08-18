---
title: "Phase 4: Granular Per-Student State and Optimistic UI in Instructor Web Lobby"
type: phase
parent: "opt-001-lobby-production-performance"
phase: "4"
status: completed
created: "2026-08-18"
tags: [task, phase, frontend, instructor, ui, performance]
---

# Phase 4: Granular Per-Student State and Optimistic UI in Instructor Web Lobby

## Objective

Refactor the instructor lobby hook and admission panel to use granular per-student updating states (`updatingStudentIds: Set<string>`), eliminate the global UI freeze, remove the 5-second polling interval, and leverage TanStack Query optimistic transitions.

## Dependencies & Prerequisites

- Phase 3 (React Query & Realtime Hooks).

## Impacted Files & Components

- [use-instructor-lobby.ts](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/%28protected%29/%28instructor%29/exams/%5Bid%5D/lobby/_hooks/use-instructor-lobby.ts) (`useInstructorLobby`)
- [instructor-lobby-admission-panel.tsx](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/%28protected%29/%28instructor%29/exams/%5Bid%5D/lobby/_components/instructor-lobby-admission-panel.tsx) (`InstructorLobbyAdmissionPanel`)
- [use-instructor-lobby.test.tsx](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/%28protected%29/%28instructor%29/exams/%5Bid%5D/lobby/_hooks/use-instructor-lobby.test.tsx)
- [instructor-lobby-admission-panel.test.tsx](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/%28protected%29/%28instructor%29/exams/%5Bid%5D/lobby/_components/instructor-lobby-admission-panel.test.tsx)

## Implementation Tasks

- [x] Task 4.1 — Refactor `use-instructor-lobby.ts`:
  - Replaced raw `useState` list storage with `useExamLobbyWaitingListQuery(examId)`.
  - Connected `useLobbyRealtime({ examId })` to invalidate queries in real-time.
  - Replaced `isUpdatingLobbyAdmissions` boolean lock with `updatingStudentIds: Set<string>`.
  - Removed `window.setInterval(..., 5000)` polling interval.
  - Implemented non-blocking `handleUpdateLobbyAdmissions` using `useUpdateExamLobbyAdmissionsMutation`.
- [x] Task 4.2 — Refactor `instructor-lobby-admission-panel.tsx`:
  - Updated `InstructorLobbyAdmissionPanelProps` to accept `updatingStudentIds?: Set<string>`.
  - Updated Admit and Reject buttons on individual student cards to only disable when `updatingStudentIds.has(student.studentId)`.
  - Maintained full responsiveness across the board during multi-click admission workflows.
- [x] Task 4.3 — Update and run tests for `use-instructor-lobby.test.tsx` and `instructor-lobby-admission-panel.test.tsx`.

## Verification & Testing

- `pnpm --filter sentinel-web test "src/app/(protected)/(instructor)/exams/[id]/lobby"`: 4 test files, 22 tests passed cleanly.
- Confirmed rapid multi-student click handling, optimistic updates, and per-row state tracking.

## Risks & Rollback

- *Risk:* Visual glitch if optimistic card relocation happens before search filtering.
- *Mitigation:* Ensure filtered groups derive directly from the optimistically updated query cache.
