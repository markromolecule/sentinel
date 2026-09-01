---
title: "Phase 3: Mobile expo-screen-capture Integration & Android FLAG_SECURE Blocking"
type: phase
parent: "docs/tasks/2026/08/2026-08-31/task-screenshot-prevention-and-detection/README.md"
phase: "03"
status: completed
created: "2026-08-31"
tags: [task, phase, mobile, expo, android, flag-secure, screenshot]
---

# Phase 3: Mobile expo-screen-capture Integration & Android FLAG_SECURE Blocking

## Objective

Integrate `expo-screen-capture` into `sentinel-mobile` to enforce hardware-level screenshot and screen recording blocking on Android using `FLAG_SECURE` (`preventScreenCaptureAsync`) during active exam sessions.

## Dependencies & Prerequisites

- Context specification: `docs/context/August/31/screenshot-detection-and-prevention.md` (ready)
- Phase 1 and 2 completed.

## Impacted Files & Components

- `app/sentinel-mobile/package.json`
- `app/sentinel-mobile/features/exam/hooks/use-exam-session.ts`
- `app/sentinel-mobile/features/exam/hooks/use-exam-session.test.ts`

## Implementation Tasks

- [x] Task 1: Added `expo-screen-capture` dependency in `app/sentinel-mobile/package.json`.
- [x] Task 2: In `use-exam-session.ts`:
  - Enforced `ScreenCapture.preventScreenCaptureAsync()` on exam mount when `configuration?.mobileSecurity.screenshot_block` is enabled (or true by default).
  - Ensured `ScreenCapture.allowScreenCaptureAsync()` is called on unmount so the device's normal screenshot capability is restored.
- [x] Task 3: Added unit tests in `use-exam-session.test.ts` verifying `preventScreenCaptureAsync` and `allowScreenCaptureAsync` lifecycle calls based on exam configuration.

## Verification & Testing

- `npm run test` in `app/sentinel-mobile` (PASS: 32/32 test files, 183/183 tests).
- Verified: Android hardware screenshot & screen recording blocking lifecycle is active.

## Risks & Rollback

- Clean lifecycle: `allowScreenCaptureAsync()` ensures student's device exits `FLAG_SECURE` mode on exam exit or unmount.

