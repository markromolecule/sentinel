---
title: "Phase 2: Route Layout Flattening & Warning Elimination"
type: phase
parent: "fix-mobile-exam-rendering-routes-results-feedback"
phase: "2"
status: completed
created: "2026-08-25"
tags: [task, phase, mobile, expo-router, layout, routes]
---

# Phase 2: Route Layout Flattening & Warning Elimination

## Objective

Eliminate Expo Router layout route warnings (`No route named "session/[sessionId]/index" exists in nested children`) by removing the redundant nested `session/[sessionId]/_layout.tsx` file and flattening the routing hierarchy in `app/exam/[id]/`.

## Dependencies & Prerequisites

- Phase 1 completed.

## Impacted Files & Components

- `app/sentinel-mobile/app/exam/[id]/session/[sessionId]/_layout.tsx`: Redundant nested Stack Navigator (deleted).
- `app/sentinel-mobile/app/exam/[id]/_layout.tsx`: Direct parent layout matching `session/[sessionId]/index`.

## Implementation Tasks

- [x] Delete `app/sentinel-mobile/app/exam/[id]/session/[sessionId]/_layout.tsx`.
- [x] Confirm `app/sentinel-mobile/app/exam/[id]/_layout.tsx` retains `<Stack.Screen name="session/[sessionId]/index" options={{ headerLeft: () => null }} />`.
- [x] Verify that navigating to `/exam/[id]/session/[sessionId]` mounts `ExamSessionScreen` directly without nested Stack Navigator overhead or layout warnings.

## Verification & Testing

- Run test suite:
  ```bash
  pnpm --filter sentinel-mobile test
  ```
  - Result: Passed 31/31 test files, 151/151 tests passed in 1.29s.

## Risks & Rollback

- Re-creating `_layout.tsx` if any custom modal options were required (none are, all options are set in the parent layout).
