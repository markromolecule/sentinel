---
title: "Phase 2: Instant Mobile Lobby Checkup & Readiness Initialization"
type: phase
parent: "docs/tasks/2026/08/2026-08-25/fix-mobile-session-crash-and-lobby-realtime/README.md"
phase: "2"
status: completed
created: "2026-08-25"
tags: [task, phase, mobile, lobby, readiness]
---

# Phase 2: Instant Mobile Lobby Checkup & Readiness Initialization

## Objective

Eliminate the 1-second delay when entering the lobby by evaluating calibration and microphone readiness immediately on mount in `useExamLobby`.

## Dependencies & Prerequisites

- Phase 1 completed.

## Impacted Files & Components

- [`app/sentinel-mobile/features/exam/hooks/use-exam-lobby.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/features/exam/hooks/use-exam-lobby.ts):
  - Trigger `checkReadiness` immediately on mount.
  - Optimize the interval cleanup so no unnecessary timer runs once readiness is established.
- [`app/sentinel-mobile/features/exam/hooks/use-exam-checkup.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/features/exam/hooks/use-exam-checkup.ts): Ensure audio readiness key is written prior to navigation.

## Implementation Tasks

- [x] Task 2.1 — Refactor readiness evaluation in `use-exam-lobby.ts` to execute immediately on mount.
- [x] Task 2.2 — Parallelize initial check-in operations to eliminate sequential request waterfall.
- [x] Task 2.3 — Run mobile test suite to verify instant readiness state transition.

## Verification & Testing

- `pnpm --filter sentinel-mobile test features/exam/hooks/use-exam-lobby.test.ts` (PASS: 4/4 tests passed)

## Risks & Rollback

- **Risk:** Fast navigation might run before AsyncStorage write completes.
- **Mitigation:** Ensure `handleStartExam` in checkup awaits the write before `router.push`.
