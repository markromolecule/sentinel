---
title: "Phase 2: Safe iOS Audio Configuration & Live Session Metering"
type: phase
status: planned
created: "2026-08-26"
parent: "./README.md"
---

# Phase 2: Safe iOS Audio Configuration & Live Session Metering

## Objective

Fix iOS native audio session activation exceptions (`Failed to configure audio session: Session activation failed`) during checkup and integrate active background audio level metering during `ExamSessionScreen`.

## Affected Files

- [`app/sentinel-mobile/features/exam/hooks/use-exam-checkup.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/features/exam/hooks/use-exam-checkup.ts)
- [`app/sentinel-mobile/features/exam/lib/mobile-audio-anomaly.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/features/exam/lib/mobile-audio-anomaly.ts)
- [`app/sentinel-mobile/features/exam/hooks/use-exam-session.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/features/exam/hooks/use-exam-session.ts)

## Implementation Steps

1. In `use-exam-checkup.ts`: Configure `AudioModule.setAudioModeAsync` with safe options (`playsInSilentMode: true`, `allowsRecording: true`, `interruptionMode: 'doNotMix'`) and wrap audio preparation in a resilient retry/fallback handler.
2. In `use-exam-session.ts`: Initialize background audio monitoring utilizing `evaluateMobileAudioLevel` when microphone proctoring is required, emitting `AUDIO_ANOMALY` telemetry when room volume/speech exceeds threshold.

## Verification

- Command: `pnpm --filter sentinel-mobile test`
- Check `mobile-audio-anomaly.test.ts` passes.
