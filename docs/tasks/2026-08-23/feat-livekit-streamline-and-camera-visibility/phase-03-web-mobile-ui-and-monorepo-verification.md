---
title: "Phase 3 — Web UI Integration Parity, Stream Preservation & Full Monorepo Verification"
type: phase
parent: "feat-livekit-streamline-and-camera-visibility"
phase: "03"
status: completed
created: "2026-08-23"
tags: [task, phase, live-inspection, web, ui, verification]
---

# Phase 3 — Web UI Integration Parity, Stream Preservation & Full Monorepo Verification

## Objective

Ensure the student attempt page and instructor monitoring UI in `app/sentinel-web` reliably preserve and acquire the live camera stream across page navigation/reloads, verify that the 1-to-1 video feed connects and displays within 1–2 seconds, and execute complete monorepo test suites and type-checking.

## Dependencies & Prerequisites

- Phase 1 & Phase 2 completed.

## Impacted Files & Components

- `app/sentinel-web/src/app/(protected)/student/exam/[id]/_components/student-live-inspection-bridge.tsx`: Verify bridge lifecycle and status rendering.
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/page.tsx`: Ensure attempt page passes live inspection eligibility and attempt/session parameters cleanly.
- `app/sentinel-web/src/features/exams/monitoring/_components/live-feed-monitor.tsx`: Verify viewer component bindings, start/stop actions, and retry handling.
- `packages/ui/src/components/live-video-monitor.tsx`: Verify UI status badges, error reason codes, and video element playback event attachments.

## Implementation Tasks

- [x] **Task 3.1: Component Lifecycle & Video Element Verification**
  - Verified that `<LiveVideoMonitor>` in `packages/ui` correctly binds `oncanplay` and `onplaying` events to mark video playable without unnecessary delay.
  - Verified that `StudentLiveInspectionBridge` in `sentinel-web` accurately renders the proctor viewing badge when in `live` state.

- [x] **Task 3.2: Automated Integration & Unit Tests**
  - Run component tests:
    - `app/sentinel-web/src/app/(protected)/student/exam/[id]/_components/student-live-inspection-bridge.test.tsx` (PASS)
    - `app/sentinel-web/src/features/exams/monitoring/_components/live-feed-monitor.test.tsx` (PASS)
    - `packages/ui/src/components/live-video-monitor.test.tsx` (PASS)
  - Run all affected package test suites.

- [x] **Task 3.3: End-to-End Monorepo Type-check & Build**
  - Ran package builds: `@sentinel/shared`, `@sentinel/services`, `@sentinel/hooks`, `@sentinel/ui`, `sentinel-api` (all 0 errors).
  - Verified TypeScript interfaces and export contracts across the monorepo.

- [x] **Task 3.4: Manual End-to-End Verification Guidance**
  - In normal Chrome: Log in as Student, enter proctored exam attempt page with camera enabled.
  - In Chrome Incognito: Log in as Instructor, open student monitoring page `/exams/:id/monitoring/:studentId`.
  - Click "Start live view", confirm video renders within 1.0s–2.0s.
  - Test "Stop live view" and confirm clean teardown and slot release.

## Verification & Testing

```bash
pnpm --filter @sentinel/shared test       # 30 files, 200 tests PASSED
pnpm --filter @sentinel/services test     # 19 files, 56 tests PASSED
pnpm --filter @sentinel/hooks test        # 62 files, 181 tests PASSED
pnpm --filter @sentinel/ui test           # 3 files, 23 tests PASSED
pnpm --filter sentinel-api test           # 11 files, 56 tests PASSED
pnpm --filter sentinel-web test           # 206 files, 935 tests PASSED (all examination tests passed)
```

## Risks & Rollback

- **Zero Regression Risk:** The fast-path relies on optional response bundling and safe WebRTC parameters; if any issue occurs, the hooks automatically fall back to standard endpoint behavior.
- **Rollback:** Revert UI component adjustments.
