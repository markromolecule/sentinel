---
title: "Phase 3: Live Inspection Quiet 404 Directive Handling"
type: phase
parent: "fix-mobile-exam-rendering-routes-results-feedback"
phase: "3"
status: completed
created: "2026-08-25"
tags: [task, phase, mobile, livekit, live-inspection, logging]
---

# Phase 3: Live Inspection Quiet 404 Directive Handling

## Objective

Suppress misleading `WARN Live inspection directive reconciliation failed: [ApiError: Live inspection is not available.]` console logs in `mobile-live-inspection-bridge.tsx` by treating standard 404 responses as normal `idle` state while keeping live video streaming responsive when a proctor initiates inspection.

## Dependencies & Prerequisites

- Phase 1 & 2 completed.

## Impacted Files & Components

- `app/sentinel-mobile/features/exam/components/session/mobile-live-inspection-bridge.tsx`: Differentiate 404 status codes from actual unexpected errors in `reconcileDirective`.
- `app/sentinel-mobile/features/exam/components/session/mobile-live-inspection-bridge.test.tsx`: Added unit test coverage for quiet 404 suppression and non-404 warning logging.

## Implementation Tasks

- [x] In `mobile-live-inspection-bridge.tsx`, inspect caught errors in `reconcileDirective`:
  - Check if `err.status === 404` or `err.message?.includes('Live inspection is not available')`.
  - If 404, quietly call `stopPublication()`, set `isLive(false)`, and avoid logging `console.warn`.
  - If non-404 (e.g. 500 error or network disconnect), log `console.warn('Live inspection directive reconciliation failed:', err)`.

## Verification & Testing

- Run unit test suite:
  ```bash
  pnpm --filter sentinel-mobile test features/exam/components/session/mobile-live-inspection-bridge.test.tsx
  ```
  - Result: Passed 6/6 tests (AC-4 verified).

## Risks & Rollback

- Zero risk to live streaming functionality since 404 only occurs when no directive exists.
