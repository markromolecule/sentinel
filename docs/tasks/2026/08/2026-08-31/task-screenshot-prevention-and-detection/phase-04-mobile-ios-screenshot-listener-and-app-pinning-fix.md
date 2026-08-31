---
title: "Phase 4: Mobile iOS Screenshot Listener & App Pinning Disambiguation"
type: phase
parent: "docs/tasks/2026/08/2026-08-31/task-screenshot-prevention-and-detection/README.md"
phase: "04"
status: completed
created: "2026-08-31"
tags: [task, phase, mobile, ios, telemetry, app-pinning, screenshot]
---

# Phase 4: Mobile iOS Screenshot Listener & App Pinning Disambiguation

## Objective

Register the native `ScreenCapture.addScreenshotListener` on iOS (and Android) in `sentinel-mobile` to ensure screenshots emit `SCREENSHOT_ATTEMPT` (`incidentType: SCREENSHOT`), and disambiguate `AppState` background handling so screenshot triggers do not falsely emit `APP_PINNING_VIOLATION`.

## Dependencies & Prerequisites

- Phase 3 completed (`expo-screen-capture` integrated).

## Impacted Files & Components

- `app/sentinel-mobile/features/exam/hooks/use-exam-session.ts`
- `app/sentinel-mobile/features/exam/hooks/use-exam-session.test.ts`
- `app/sentinel-mobile/features/exam/lib/mobile-telemetry-client.ts`

## Implementation Tasks

- [x] Task 1: In `use-exam-session.ts`:
  - Registered `ScreenCapture.addScreenshotListener` during active exam sessions.
  - When triggered:
    - Emitted `SCREENSHOT_ATTEMPT` (`incidentType: SCREENSHOT`).
    - Recorded `lastScreenshotAtRef.current = Date.now()`.
    - Alerted the student with the 'Screenshot Detected' modal.
- [x] Task 2: In `AppState.addEventListener('change')` in `use-exam-session.ts`:
  - Checked if a screenshot occurred recently (`Date.now() - lastScreenshotAtRef.current < 2000`).
  - When a screenshot just occurred, suppressed `APP_PINNING_VIOLATION` (and `APP_BACKGROUNDING`), preventing duplicate and misleading telemetry.
- [x] Task 3: Added unit tests in `use-exam-session.test.ts` verifying native screenshot listener emission and app pinning suppression.

## Verification & Testing

- `npm run test` in `app/sentinel-mobile` (PASS: 32/32 test files, 186/186 tests).
- Verified: Taking a screenshot triggers `SCREENSHOT_ATTEMPT` and does NOT log `APP_PINNING_VIOLATION`.

## Risks & Rollback

- Genuine app backgrounding without screenshot continue to log `APP_BACKGROUNDING` and `APP_PINNING_VIOLATION` as expected.

