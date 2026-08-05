# Task 1 — Phase 3: Attempt Control Layout

**Goal:** Fit the mobile attempt timer, progress controls, passage action, and turn-in action into no more than two rows without changing examination behavior.

- [ ] Update `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_components/attempt-view.tsx` and `app/sentinel-web/src/features/exams/_components/engine/attempt/runtime/exam-attempt-runtime-header.tsx` as one mobile header layout: the timer and runtime controls must participate in the same two-row layout at small widths.
- [ ] Define explicit mobile wrapping/order classes for the timer, answered count, flagged count, **Show passage**, and **Turn In**. Keep the current tablet/desktop passage-panel behavior and the existing submit callback/disabled state unchanged.
- [ ] Extend `app/sentinel-web/src/features/exams/_components/engine/attempt/runtime/exam-attempt-runtime-header.test.tsx` to assert all mobile controls render, the passage action still invokes `onToggleCompactPassage`, and turn-in still invokes `onSubmit`/honors `isSubmitting`.
- [ ] Extend `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/page.test.tsx` to verify the timer and runtime-header receive their existing values and handlers after the layout integration.
- [ ] Manually verify `IMG_3515.PNG` at the reported mobile viewport with and without a passage, including long timer/progress values and disabled turn-in state; confirm no third control row is created.

**Migration required:** No — this phase changes rendering and tests only.
