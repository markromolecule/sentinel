---
title: "Phase 4: Telemetry & Multi-Layer Security Verification"
type: phase
status: completed
created: "2026-09-05"
tags: [phase, mobile, telemetry, security]
---

# Phase 4: Telemetry & Multi-Layer Security Verification

## Goal

Verify all native security policies and telemetry event pipelines in mobile (`SCREENSHOT_ATTEMPT`, `APP_BACKGROUNDING`, `APP_PINNING_VIOLATION`, `NOTIFICATION_BLOCK_VIOLATION`, `GAZE_OFF_SCREEN`, `MULTIPLE_FACES`, `NO_FACE_DETECTED`).

## Tasks

1. Verify `ScreenCapture` hardware prevention and screenshot listener in `use-exam-session.ts`:
   - Android sets `FLAG_SECURE`.
   - Screenshot event triggers `SCREENSHOT_ATTEMPT` and alerts student.
   - 2000ms suppression ref prevents false-positive `APP_PINNING_VIOLATION`.
2. Verify `useMobileMediaPipeMonitoring.ts`:
   - Consecutive frame threshold (default 2 frames) and cooldown (10000ms) prevent telemetry spam.
   - Anomaly triggers evidence frame capture (`captureAndUploadEvidenceFrame`).
3. Add/update test coverage in `use-exam-session.test.ts` and `mobile-telemetry-client.test.ts`.

## Verification Criteria

- [x] Automated tests pass: `pnpm --filter sentinel-mobile test`
- [x] Telemetry events deliver properly formatted payloads matching `@sentinel/shared/schema`.
