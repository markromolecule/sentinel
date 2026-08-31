---
title: "Phase 2: Web Focus Loss Heuristics, Clipboard Cleansing & Visual Defense"
type: phase
parent: "docs/tasks/2026/08/2026-08-31/task-screenshot-prevention-and-detection/README.md"
phase: "02"
status: completed
created: "2026-08-31"
tags: [task, phase, web, proctoring, blur, clipboard, ui]
---

# Phase 2: Web Focus Loss Heuristics, Clipboard Cleansing & Visual Defense

## Objective

Implement the Option A defense-in-depth architecture on Web: correlate modifier states (`Meta+Shift`, `PrintScreen`) with immediate window `blur` events to catch OS-level screenshot overlays, cleanse the system clipboard upon screenshot triggers, and visually obscure the exam container during focus loss.

## Dependencies & Prerequisites

- Phase 1 completed (modifier tracking in place).

## Impacted Files & Components

- `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-monitoring/use-interaction-listeners/use-focus-listener.ts`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-monitoring/use-interaction-listeners.ts`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_components/attempt-view.tsx`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-monitoring.test.ts`
- `app/sentinel-core/src/features/exams/_components/engine/attempt/runtime/exam-attempt-runtime-security.tsx`

## Implementation Tasks

- [x] Task 1: Update `use-focus-listener.ts`:
  - Accepted `lastCaptureModifierAtRef` from interaction listeners.
  - When `handleWindowBlur` or `handleVisibilityChange` triggers within 1500ms of capture modifier activity (`Meta+Shift` or `PrintScreen`), classified the incident as `PRINT_SCREEN_ATTEMPT` (`incidentType: SCREENSHOT`), invoked `lockExam('screen-capture')`, and displayed the screenshot security lock modal.
- [x] Task 2: Implement clipboard cleansing:
  - When a screenshot event or capture-correlated blur is detected, executed `navigator.clipboard.writeText('')` with safe error catching.
  - On window focus recovery following a capture incident (`handleWindowFocus`), re-purged the clipboard.
- [x] Task 3: Implement CSS visual obscuration / blur:
  - Applied `blur-md select-none pointer-events-none` on the exam container in `attempt-view.tsx` when `Boolean(securityLockReason)` is active, preventing readable screenshots of exam questions.
- [x] Task 4: Verified compatibility with `sentinel-core` `ExamAttemptRuntimeSecurity` component (`securityLockReason === 'screen-capture'`).

## Verification & Testing

- `npm run test -- src/app/(protected)/student/exam/[id]/_hooks/use-exam-monitoring.test.ts` in `app/sentinel-web` (PASS: 1/1 test file, 44/44 tests).
- Verified: Modifier-correlated window blur emits `PRINT_SCREEN_ATTEMPT` and locks with `'screen-capture'`, clipboard is cleared, and attempt view applies blur defense.

## Risks & Rollback

- Low risk: Regular window blur and tab switching without capture modifiers continue triggering standard focus loss/tab switch behavior.

