---
title: "Phase 3: Question Navigator Sheet Touch Controls, Backdrop Dismissal, and Toggle UX"
type: phase
parent: "fix-mobile-questions-rendering-essay-grading-and-navigation-sheet"
phase: "03"
status: completed
created: "2026-08-26"
tags: [task, phase, mobile, question-drawer, sheet-ux, touch-controls]
---

# Phase 3: Question Navigator Sheet Touch Controls, Backdrop Dismissal, and Toggle UX

## Objective

Fix the question navigator bottom sheet so all question number badges are immediately clickable, the footer grid button toggles the sheet open and closed, and tapping anywhere outside dismisses the sheet.

## Dependencies & Prerequisites

- Phase 1: Question Rendering Fallbacks and Empty State Card

## Impacted Files & Components

- [`app/sentinel-mobile/features/exam/components/session/question-drawer.tsx`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/features/exam/components/session/question-drawer.tsx): Remove responder interceptors (`onStartShouldSetResponder` and `TouchableWithoutFeedback`).
- [`app/sentinel-mobile/features/exam/components/session/session-footer.tsx`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/features/exam/components/session/session-footer.tsx): Ensure grid button calls `onToggleDrawer`.
- [`app/sentinel-mobile/features/exam/components/session/exam-session-screen.tsx`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/features/exam/components/session/exam-session-screen.tsx): Connect toggle handler and full-screen backdrop overlay.
- [`app/sentinel-mobile/features/exam/components/session/question-drawer.test.tsx`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/features/exam/components/session/question-drawer.test.tsx): Add unit tests verifying question selection and close handlers.

## Implementation Tasks

- [x] In `question-drawer.tsx`:
  - Removed `onStartShouldSetResponder={() => true}` from the horizontal `ScrollView`.
  - Removed outer `TouchableWithoutFeedback onPress={() => {}}` wrapper that blocked touch events from propagating to child buttons.
  - Verified question badges invoke `onSelectQuestion(index)` and `onClose()` on tap.
  - Verified close icon button calls `onClose()`.
- [x] In `exam-session-screen.tsx`:
  - Updated `SessionFooter` prop to `onToggleDrawer={() => setIsDrawerOpen((prev) => !prev)}`.
  - Added explicit backdrop overlay when `isDrawerOpen` is true with `StyleSheet.absoluteFillObject` and `zIndex: 10`.
- [x] In `question-drawer.test.tsx`:
  - Created 9 comprehensive tests verifying question badge rendering, selection handler invocation, close button, absence of touch blockers, active question badge styling, answered status, flagged status, and legend labels.

## Verification & Testing

- Run test command:

  ```bash
  pnpm --filter sentinel-mobile test features/exam/components/session/question-drawer.test.tsx features/exam/components/session/exam-session-screen.tsx
  ```

## Risks & Rollback

- **Risk:** Backdrop intercepting taps intended for the drawer content.
- **Mitigation:** Position backdrop behind `QuestionDrawer` in visual/DOM order with lower `zIndex`.
- **Rollback:** Revert changes in `question-drawer.tsx` and `exam-session-screen.tsx`.
