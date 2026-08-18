---
title: "Phase 5: Student Web & Mobile Realtime Admission Flow & Polling Elimination"
type: phase
parent: "opt-001-lobby-production-performance"
phase: "5"
status: completed
created: "2026-08-18"
tags: [task, phase, realtime, student, web, mobile]
---

# Phase 5: Student Web & Mobile Realtime Admission Flow & Polling Elimination

## Objective

Migrate both the Student Web Lobby (`sentinel-web`) and Student Mobile Lobby (`sentinel-mobile`) from aggressive short-interval polling (2s / 5s) to event-driven Supabase Realtime subscriptions with a fallback 45-second heartbeat.

## Dependencies & Prerequisites

- Phase 1, Phase 2, Phase 3, and Phase 4.

## Impacted Files & Components

- [use-lobby-state.ts](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/%28protected%29/student/exam/%5Bid%5D/lobby/_hooks/use-lobby-state.ts) (`useLobbyState`)
- [use-exam-lobby.ts](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/features/exam/hooks/use-exam-lobby.ts) (`useExamLobby`)
- [use-lobby-state.test.tsx](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/%28protected%29/student/exam/%5Bid%5D/lobby/_hooks/use-lobby-state.test.tsx)
- [use-exam-lobby.test.ts](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/features/exam/hooks/use-exam-lobby.test.ts)

## Implementation Tasks

- [x] Task 5.1 — Refactor `use-lobby-state.ts` (`sentinel-web`):
  - Connected `useLobbyRealtime({ examId, onAdmissionChange })` for sub-second admission unlocking.
  - Eliminated the 5-second polling interval and replaced it with a 45-second safety fallback heartbeat.
- [x] Task 5.2 — Refactor `use-exam-lobby.ts` (`sentinel-mobile`):
  - Subscribed to `postgres_changes` on `exam_lobby_admissions` for `exam_id = ${id}`.
  - Eliminated the 2-second admission polling and 5-second lobby count polling intervals.
  - Added a 45-second fallback heartbeat.
- [x] Task 5.3 — Update and execute automated test suites for web and mobile lobbies.

## Verification & Testing

- `pnpm --filter sentinel-web test lobby`: 10 test files, 60 tests passed.
- `pnpm --filter sentinel-mobile test features/exam`: 19 test files, 97 tests passed.
- `pnpm --filter sentinel-api test src/modules/examination/lobby`: 5 test files, 21 tests passed.

## Risks & Rollback

- *Risk:* Student misses admission update if WebSocket is interrupted during mobile lock/sleep.
- *Mitigation:* App state / focus change listener on mobile and window focus listener on web re-check admission status upon app resume.
