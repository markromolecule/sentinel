---
title: "Phase 3: Physical Device Anomaly Alerts (Haptics & Banners)"
type: phase
status: planned
created: "2026-08-26"
parent: "./README.md"
---

# Phase 3: Physical Device Anomaly Alerts (Haptics & Banners)

## Objective

Provide real-time on-device feedback to students on physical mobile devices when anomalies (e.g. `GAZE_OFF_SCREEN`, `AUDIO_ANOMALY`, `APP_BACKGROUNDING`, `APP_PINNING_VIOLATION`) are triggered.

## Affected Files

- [`app/sentinel-mobile/features/exam/hooks/use-exam-session.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/features/exam/hooks/use-exam-session.ts)
- [`app/sentinel-mobile/features/exam/components/session/exam-session-screen.tsx`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/features/exam/components/session/exam-session-screen.tsx)

## Implementation Steps

1. Integrate `expo-haptics` (`Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)`) on telemetry emission.
2. In `ExamSessionScreen.tsx`: Render a prominent, high-contrast amber/red warning toast/banner displaying the active warning message.
3. Automatically clear warning banners after a brief cooldown once behavior is corrected.

## Verification

- Command: `pnpm --filter sentinel-mobile test`
- Verify session screen and telemetry tests.
