---
title: "Phase 2: Instructor Lobby Realtime Broadcast Fix and Presence Resiliency"
type: phase
parent: "Fix: Exam Lobby Synchronization, Admission State, and Attempt Anomaly Remediation"
phase: "2"
status: completed
created: "2026-09-01"
tags: [task, phase, api, hooks, lobby, realtime]
---

# Phase 2: Instructor Lobby Realtime Broadcast Fix and Presence Resiliency

## Objective
Fix Supabase Realtime broadcast topic formatting so student check-ins and admission updates stream immediately (<50ms) to the instructor lobby with **zero background polling**, and eliminate presence count inflation in the student lobby:
1. In `broadcast-lobby-event.ts`, format the broadcast topic as `realtime:lobby:${examId}` to match `@supabase/supabase-js` WebSocket client channel subscriptions.
2. Disable presence tracking for instructors so instructor connections do not increment student lobby counters.
3. Clean up student lobby presence subscription to prevent multi-channel tracking.

## Impacted Files & Components
- `app/sentinel-api/src/modules/examination/lobby/services/broadcast-lobby-event.ts`
- `app/sentinel-api/src/modules/examination/lobby/services/broadcast-lobby-event.test.ts`
- `packages/hooks/src/use-lobby-realtime.ts`
- `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/lobby/_hooks/use-instructor-lobby.ts`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/_hooks/use-lobby-state.ts`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/page.tsx`

## Implementation Tasks
- [x] In `broadcast-lobby-event.ts`, set `topic: phoenixTopic` (`realtime:${channelTopic}`) in the REST POST payload so messages are routed to client Phoenix WebSocket channels.
- [x] In `use-instructor-lobby.ts`, invoke `useLobbyRealtime({ examId, trackPresence: false })`.
- [x] In `StudentExamLobbyPage` and `useLobbyState`, consume presence from the single unified Realtime channel without duplicate channel allocations.
- [x] Update and execute test suites.

## Verification & Testing
- Command: `pnpm --dir app/sentinel-api test src/modules/examination/lobby/services/broadcast-lobby-event.test.ts` (PASS: 4/4 tests passed)
- Command: `pnpm --dir packages/hooks test src/use-lobby-realtime.test.ts` (PASS: 191/191 tests passed across 64 test files)
- Command: `pnpm --dir app/sentinel-web test src/app/(protected)/(instructor)/exams/[id]/lobby` (PASS: 24/24 tests passed)
- Command: `pnpm --dir app/sentinel-web test src/app/(protected)/student/exam/[id]/lobby` (PASS: 38/38 tests passed)

## Risks & Rollback
- Zero database load or query regressions. Preserves scale concurrency guarantees.
