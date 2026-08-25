---
title: "Phase 1: Fix Exam Session Render Loop Crash"
type: phase
parent: "docs/tasks/2026/08/2026-08-25/fix-mobile-session-crash-and-lobby-realtime/README.md"
phase: "1"
status: completed
created: "2026-08-25"
tags: [task, phase, mobile, session, mediapipe]
---

# Phase 1: Fix Exam Session Render Loop Crash

## Objective

Prevent the `Maximum update depth exceeded` crash on `ExamSessionScreen` by stabilizing callback references and guarding state setters against redundant updates in `useMobileMediaPipeMonitoring`.

## Dependencies & Prerequisites

- Context Specification: [`docs/context/August/25/fix-exam-session-render-loop-and-lobby-sync-latency.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/context/August/25/fix-exam-session-render-loop-and-lobby-sync-latency.md)

## Impacted Files & Components

- [`app/sentinel-mobile/features/exam/components/session/exam-session-screen.tsx`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/features/exam/components/session/exam-session-screen.tsx): Wrap `handleAnomaly` in `useCallback`.
- [`app/sentinel-mobile/features/exam/hooks/use-mobile-mediapipe-monitoring.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/features/exam/hooks/use-mobile-mediapipe-monitoring.ts):
  - Store `onAnomalyDetected` in a ref (`onAnomalyDetectedRef.current = onAnomalyDetected`) so changing callback reference doesn't restart the frame processing effect.
  - Guard `setWarningStatus((prev) => (prev === activeWarning ? prev : activeWarning))` to avoid re-render cycles.
  - Guard `setAnalysis` to only update when necessary or compare status.
- [`app/sentinel-mobile/features/exam/hooks/use-mobile-mediapipe-monitoring.test.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/features/exam/hooks/use-mobile-mediapipe-monitoring.test.ts): Verify state stability under rapid re-renders.

## Implementation Tasks

- [x] Task 1.1 — Wrap `handleAnomaly` with `useCallback` in `ExamSessionScreen`.
- [x] Task 1.2 — Refactor `useMobileMediaPipeMonitoring` to store `onAnomalyDetected` in a ref and decouple it from `useEffect` dependencies.
- [x] Task 1.3 — Guard `setWarningStatus` and `setAnalysis` calls in `useMobileMediaPipeMonitoring` to prevent redundant React re-renders.
- [x] Task 1.4 — Run `use-mobile-mediapipe-monitoring.test.ts` to verify stability and regression safety.

## Verification & Testing

- `pnpm --filter sentinel-mobile test features/exam/hooks/use-mobile-mediapipe-monitoring.test.ts` (PASS: 3/3 tests passed)
- `pnpm --filter sentinel-mobile test features/exam/` (PASS: 19/19 files, 98/98 tests passed)

## Risks & Rollback

- **Risk:** Anomaly events might not invoke the latest callback if ref isn't kept updated.
- **Mitigation:** Update `onAnomalyDetectedRef.current = onAnomalyDetected` synchronously during render.
