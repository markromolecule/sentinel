---
title: "ADR: Multi-Layer Screenshot Defense & Native Hardware Blocking"
type: decision
status: accepted
date: "2026-08-31"
tags: [adr, proctoring, telemetry, security, screenshot, web, mobile]
---

# ADR: Multi-Layer Screenshot Defense & Native Hardware Blocking

## Context & Problem Statement

During proctored online examinations, students attempting to take screenshots or screen captures bypass standard detection:
1. **Web**: Operating systems (macOS WindowServer, Windows Snipping Tool) intercept global screenshot shortcuts (`Cmd+Shift+4`, `Win+Shift+S`) before browser DOM `keydown` events are dispatched, and Windows `PrintScreen` only fires on `keyup`.
2. **Mobile**: Android and iOS lacked hardware protection and native screenshot listeners, and any app backgrounding unconditionally emitted `APP_PINNING_VIOLATION` instead of `SCREENSHOT_ATTEMPT`.

## Decision

1. **Web Multi-Layer Defense (Option A):**
   - **Key Listeners:** Attach both `keydown` and `keyup` listeners on `window` and `document` to capture `PrintScreen`, `Alt+PrintScreen`, `Ctrl+PrintScreen`, `Cmd+Shift+3/4/5`, and `Win+Shift+S`.
   - **Heuristic Focus Loss:** Correlate recent modifier down state (`Meta+Shift`, `Win+Shift`, `PrintScreen`) with immediate window `blur` events (within 1500ms) to detect OS-level snipping overlays, logging `PRINT_SCREEN_ATTEMPT` (`incidentType: SCREENSHOT`) and locking the exam with `'screen-capture'`.
   - **Clipboard Sanitization:** Overwrite system clipboard upon screenshot detection or focus recovery.
   - **Visual Obscuration:** Apply CSS blur to the exam interface during focus loss.

2. **Mobile Native Hardware Blocking & Event Disambiguation:**
   - **Android Hardware Blocking:** Call `ScreenCapture.preventScreenCaptureAsync()` via `expo-screen-capture` on exam start to set `FLAG_SECURE`, preventing OS screenshots and screen recording.
   - **iOS/Android Screenshot Listener:** Register `ScreenCapture.addScreenshotListener` to emit `SCREENSHOT_ATTEMPT` (`incidentType: SCREENSHOT`).
   - **App Pinning Isolation:** Check a timestamp ref in `AppState` change listener to suppress `APP_PINNING_VIOLATION` when a screenshot occurred within 2000ms.

## Consequences

- **Positive:** Robust defense-in-depth across Web browsers without requiring a custom kiosk browser; hardware-enforced blocking on Android; accurate telemetry telemetry mapping (`SCREENSHOT`) on iOS and Web.
- **Negative / Trade-offs:** Web browsers still cannot physically intercept OS daemons, but clipboard sanitization and visual blurring protect question confidentiality.
