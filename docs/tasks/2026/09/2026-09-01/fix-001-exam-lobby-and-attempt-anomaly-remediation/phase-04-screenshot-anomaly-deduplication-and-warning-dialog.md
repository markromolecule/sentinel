---
title: "Phase 4: Screenshot Anomaly Deduplication and Warning Dialog"
type: phase
parent: "Fix: Exam Lobby Synchronization, Admission State, and Attempt Anomaly Remediation"
phase: "4"
status: completed
created: "2026-09-01"
tags: [task, phase, telemetry, attempt, monitoring]
---

# Phase 4: Screenshot Anomaly Deduplication and Warning Dialog

## Objective
Fix screenshot incident telemetry deduplication so a single screenshot action emits exactly one event (instead of 2) across keyboard shortcut and focus loss, and display a prominent in-attempt security warning dialog for screenshot attempts.

## Impacted Files & Components
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-monitoring/use-interaction-listeners.ts`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-monitoring/use-interaction-listeners/use-keyboard-listener.ts`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-monitoring/use-interaction-listeners/use-focus-listener.ts`
- `app/sentinel-web/src/features/exams/_components/engine/attempt/runtime/exam-attempt-runtime-security.tsx`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-monitoring.test.ts`

## Implementation Tasks
- [x] In `use-interaction-listeners.ts`, share `lastPrintScreenIncidentAtRef` across `useKeyboardListener` and `useFocusListener`.
- [x] In `use-keyboard-listener.ts`, evaluate action burst against the shared ref with a 1500ms window, and eliminate duplicate window listeners.
- [x] In `use-focus-listener.ts`, check the shared `lastPrintScreenIncidentAtRef` before emitting `PRINT_SCREEN_ATTEMPT` on focus loss following modifier combos.
- [x] In `exam-attempt-runtime-security.tsx`, verify the security lock dialog displays the in-fullscreen warning for `screen-capture` with resume controls.
- [x] Add regression unit tests verifying single event emission when keydown is followed immediately by window blur.

## Verification & Testing
- Command: `pnpm --dir app/sentinel-web test src/app/(protected)/student/exam/[id]/_hooks/use-exam-monitoring.test.ts` (PASS: 45/45 tests passed)
- Command: `pnpm --dir app/sentinel-web test src/app/(protected)/student/exam/[id]/attempt` (PASS: 74/74 tests passed across 8 test files)

## Risks & Rollback
- Burst deduplication is bounded to 1500ms, preventing duplicate emission without suppressing legitimate subsequent capture attempts.
