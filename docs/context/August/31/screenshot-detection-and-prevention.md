---
title: "Context: Screenshot Detection, Prevention, and Telemetry Remediation (Web & Mobile)"
type: context
status: ready
created: "2026-08-31"
tags: [context, grill, proctoring, telemetry, screenshot, web, mobile]
---

# Context: Screenshot Detection, Prevention, and Telemetry Remediation (Web & Mobile)

## 1. Overview & Objective

During active exam sessions, screenshot attempts are not being detected or prevented reliably:
1. **Web**: Screen capture shortcuts (`Cmd+Shift+3`, `Cmd+Shift+4`, `Cmd+Shift+5` on macOS; `Win+Shift+S`, `PrintScreen`, `Alt+PrintScreen` on Windows) do not reliably trigger the `PRINT_SCREEN_ATTEMPT` telemetry event or exam security lock.
2. **Mobile**: When a student takes a screenshot or leaves the app, the system erroneously logs `APP_PINNING_VIOLATION` instead of `SCREENSHOT_ATTEMPT`, and hardware-level screenshot prevention (`FLAG_SECURE` on Android via `expo-screen-capture`) is not implemented.

The objective is to:
- Establish robust detection and defense-in-depth mitigation for desktop web browsers (`Option A`).
- Implement hardware screenshot blocking (`FLAG_SECURE` on Android via `preventScreenCaptureAsync`) and native screenshot listener (`addScreenshotListener`) on iOS to return `SCREENSHOT_ATTEMPT`.
- Fix event misattribution so mobile screenshot attempts correctly emit `SCREENSHOT_ATTEMPT` (`incidentType: SCREENSHOT`) instead of `APP_PINNING_VIOLATION`.

---

## 2. Root Cause Analysis

### Web Root Causes
1. **Missing `keyup` Event Listeners:** In Chromium/Edge on Windows, `PrintScreen` and `Alt+PrintScreen` are dispatched via `keyup`, but `useKeyboardListener` only listened to `keydown`.
2. **OS Shortcut Interception:** Global shortcuts like `Cmd+Shift+4` (macOS) and `Win+Shift+S` (Windows) are intercepted by the OS screenshot daemon before browser DOM keydown events. The browser receives modifier keys (`Cmd+Shift` / `Win+Shift`) followed by an immediate `blur` event, which was previously misclassified as a generic `TAB_SWITCH` or ignored.
3. **No Clipboard Cleansing or Visual Blurring:** Standard web pages cannot hook OS kernel screen grabbers, but they can clear the clipboard on detection and blur the exam view when focus is lost.

### Mobile Root Causes
1. **No Native Screen Capture Module:** `sentinel-mobile` lacks `expo-screen-capture`, so `preventScreenCaptureAsync()` is never called, and `ScreenCapture.addScreenshotListener` is not registered.
2. **Unconditional `APP_PINNING_VIOLATION` on Backgrounding:** In `use-exam-session.ts`, any background transition automatically triggers `emitSessionTelemetry('APP_PINNING_VIOLATION')`, replacing or masking screenshot detection.

---

## 3. Technical & Architectural Specification

### Web Architecture (`sentinel-web` & `sentinel-core`)
- **Key Event Listeners:** Listen to both `keydown` and `keyup` on `window` and `document` for:
  - `PrintScreen`, `Alt + PrintScreen`, `Ctrl + PrintScreen`
  - `Meta + Shift + 3 / 4 / 5` (macOS)
  - `Meta + Shift + S` (Windows Snipping Tool)
- **Heuristic Focus Loss Tracking (Option A):** If `window.blur` or `visibilitychange` occurs within 1500ms of `Meta+Shift` or `PrintScreen` modifier activity, classify the incident as `PRINT_SCREEN_ATTEMPT` (`incidentType: SCREENSHOT`) and lock the exam with `'screen-capture'`.
- **Clipboard Sanitization:** On screenshot shortcut detection or window blur/focus recovery, overwrite the clipboard with empty text (`navigator.clipboard.writeText('')`) if clipboard permissions permit.
- **Visual Obscuration:** Apply CSS blur / overlay when window focus is lost so background OS screenshots capture an obscured view.

### Mobile Architecture (`sentinel-mobile`)
- **Integration:** Install and configure `expo-screen-capture`.
- **Android Prevention:** Call `ScreenCapture.preventScreenCaptureAsync()` when `configuration.mobileSecurity.screenshot_block` is enabled (sets native `FLAG_SECURE`, physically blocking screenshot capture and screen recording).
- **iOS/Android Detection:** Register `ScreenCapture.addScreenshotListener(() => { ... })`:
  - Emits `SCREENSHOT_ATTEMPT` (`incidentType: SCREENSHOT`).
  - Sets a recent screenshot timestamp ref (`lastScreenshotAtRef.current = Date.now()`).
  - Displays a warning alert / modal to the student.
- **Disambiguate App Pinning:** In `AppState` change listener, suppress `APP_PINNING_VIOLATION` if a screenshot was detected within the last 2000ms.

---

## 4. Scenario Coverage

| ID | Platform & Situation | Preconditions | Expected Outcome | Failure / Recovery |
|---|---|---|---|---|
| SC-01 | Windows user presses `PrintScreen` or `Alt+PrintScreen` | Active exam in Chrome/Edge | `keyup` listener intercepts key, emits `PRINT_SCREEN_ATTEMPT` (`incidentType: SCREENSHOT`), locks exam with 'screen-capture' modal. | If key swallowed, blur heuristic catches focus shift. |
| SC-02 | macOS user triggers `Cmd+Shift+4` | Active exam in Safari/Chrome | Modifier ref notes `Meta+Shift`; window `blur` fires; system logs `PRINT_SCREEN_ATTEMPT`, locks exam, clears clipboard, and blurs view. | Student must click "Resume Exam" to dismiss security lock. |
| SC-03 | Windows user triggers `Win+Shift+S` | Active exam in Chrome/Edge | Modifier ref notes `Meta+Shift`; Snipping Tool blurs window; system logs `PRINT_SCREEN_ATTEMPT` and locks exam. | Security lock modal blocks exam until student dismisses. |
| SC-04 | Android student attempts screenshot (Power + VolDown) | Active mobile exam with screenshot blocking enabled | Android `FLAG_SECURE` blocks screenshot directly (black screenshot / error prompt). Listener fires `SCREENSHOT_ATTEMPT`. | Screenshot content never saved to student gallery. |
| SC-05 | iOS student attempts screenshot | Active mobile exam with screenshot monitoring enabled | `ScreenCapture.addScreenshotListener` fires on iOS, emits `SCREENSHOT_ATTEMPT` (`incidentType: SCREENSHOT`). `AppState` background listener does NOT fire `APP_PINNING_VIOLATION`. | Student warned; incident correctly recorded as `SCREENSHOT`. |

---

## 5. Scope & Boundaries

### In Scope
- Web keyboard & blur listener enhancements in `sentinel-web` and `sentinel-core`.
- Screenshot event mapping and security lock modal triggers.
- Mobile `expo-screen-capture` integration and screenshot listener in `sentinel-mobile`.
- Disambiguation of `APP_PINNING_VIOLATION` vs `SCREENSHOT_ATTEMPT` in `sentinel-mobile`.
- Unit and integration tests for web shortcut detection and mobile telemetry.

### Non-Goals
- Modifying backend telemetry ingestion rules in `sentinel-api` (rules already support `PRINT_SCREEN_ATTEMPT` and `SCREENSHOT_ATTEMPT` -> `incidentType: SCREENSHOT`).
- Replacing standard web browsers with a custom Electron kiosk app.

---

## 6. Decision Ledger

| ID | Decision Question | Selected Option | Rationale |
|---|---|---|---|
| D-01 | How should Web handle OS-level screenshot shortcuts that bypass DOM key events? | **Option A:** Multi-layer defense: `keydown` + `keyup` listeners + modifier-correlated `blur` detection + clipboard wiping + visual blur. | Confirmed by user. Web standards cannot block OS kernels, so defense-in-depth maximizes detection and protects exam questions. |
| D-02 | How should Mobile enforce screenshot protection? | **FLAG_SECURE on Android + `addScreenshotListener` on iOS** via `expo-screen-capture`. | Confirmed by user. Uses native OS capabilities (`FLAG_SECURE`) to physically block screenshots on Android and reliably return `SCREENSHOT` on iOS. |
| D-03 | How should Mobile distinguish between Backgrounding, App Pinning, and Screenshots? | Dedicated `ScreenCapture.addScreenshotListener` emits `SCREENSHOT_ATTEMPT`; `AppState` background transitions check screenshot debounce ref. | Prevents transient screenshot HUDs/overlays from falsely logging app pinning violations. |
