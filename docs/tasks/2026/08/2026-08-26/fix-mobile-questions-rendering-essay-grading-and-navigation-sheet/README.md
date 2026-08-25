---
title: "Fix Mobile Question Rendering, Parity for Essay Grading Lifecycle, and Question Navigator Sheet UX"
type: task
status: planned
created: "2026-08-26"
tags: [task, mobile, question-rendering, essay-grading, question-drawer, sheet-ux, result-parity]
---

# Fix Mobile Question Rendering, Parity for Essay Grading Lifecycle, and Question Navigator Sheet UX

## Outcome

A rock-solid mobile exam experience with complete question rendering, accurate essay manual-review pending states aligned with Sentinel Web, and a responsive, intuitive question navigator bottom sheet with clickable number badges and seamless open/close toggling.

---

## Pre-planning record

### Actors and goals

- **Student:** Taking an assessment on mobile; needs prompt clarity, clear status for essay grading, and fluid question navigation.
- **Instructor / Grader:** Reviews student essay responses on Sentinel Web with rubrics; expects complete essay answers to be saved.

### Domain language

- **Provisional Score / Pending Review:** State when an attempt contains essay questions requiring manual instructor review before a final score can be released.
- **Question Drawer / Sheet:** Floating bottom sheet navigator displaying all numbered question badges with answer and flag status indicators.
- **Rubric Weighted Score:** Calculation applied during instructor grading on Sentinel Web: `calculateEssayWeightedScore(scores, points, rubric.definition)`.

### Scenario coverage

| ID | Actor and situation | Preconditions | Expected outcome | Failure/recovery | Status |
|---|---|---|---|---|---|
| SC-01 | Student enters exam session | Questions loaded from API | Question prompt, choices, and inputs render cleanly | Fallback card if question has missing fields | Planned |
| SC-02 | Student with empty questions | Exam has no questions assigned | Clean empty state card displayed | Shows message and retry option | Planned |
| SC-03 | Student submits exam with essay questions | Attempt includes essay questions | Result view displays "PENDING REVIEW" banner with provisional notice | Avoids false "DID NOT PASS" failure banner | Planned |
| SC-04 | Student taps question number in sheet | Question drawer is open | Active question updates and drawer closes | Touch event fires without responder interception | Planned |
| SC-05 | Student taps footer grid button or backdrop | Drawer open/closed | Drawer toggles open or closed cleanly | Backdrop tap closes drawer immediately | Planned |

### Decision ledger

| ID | Question | Decision | Evidence or rationale | Alternatives rejected | Artifact |
|---|---|---|---|---|---|
| DEC-01 | How to present unfinalized essay exam results on mobile? | Display "PENDING REVIEW" banner and provisional copy | Matches Sentinel Web result UX; avoids false fails | Showing 0 score or evaluating pass/fail naively | `result-view.tsx` |
| DEC-02 | How to fix unclickable question badges in `QuestionDrawer`? | Remove `onStartShouldSetResponder` and outer `TouchableWithoutFeedback` | React Native ScrollView responder theft blocked child touch events | Replacing ScrollView with custom FlatList without fixing responder | `question-drawer.tsx` |
| DEC-03 | How to toggle question drawer from footer? | Pass `setIsDrawerOpen((prev) => !prev)` | Allows single-button toggle open and close | Only setting `setIsDrawerOpen(true)` | `exam-session-screen.tsx` |

---

## Acceptance criteria

| ID | Source goal/scenario/decision | Criterion | Implementation | Verification | Status |
|---|---|---|---|---|---|
| AC-01 | SC-01, SC-02 | Question card and session screen render prompts, choices, and empty states without blank viewports | `question-card.tsx`, `exam-session-screen.tsx`, `mobile-exam-adapter.ts` | Vitest unit tests in `question-card.test.tsx` | Planned |
| AC-02 | SC-03, DEC-01 | Result view displays "PENDING REVIEW" for essay exams and does not re-invoke `completeExamSession` | `result-view.tsx`, `use-exam-result.ts` | Vitest unit tests in `result-view.test.tsx` | Planned |
| AC-03 | SC-04, SC-05, DEC-02, DEC-03 | Question badges in drawer are clickable, footer button toggles drawer, and backdrop tap closes drawer | `question-drawer.tsx`, `exam-session-screen.tsx`, `session-footer.tsx` | Vitest unit tests in `question-drawer.test.tsx` | Planned |

---

## Scope

- Fixing question card rendering fallbacks and empty question list display on mobile.
- Updating mobile result view and turn-in hook to support the essay grading lifecycle and provisional result state.
- Fixing touch responder theft in `QuestionDrawer`, wiring toggle controls in `SessionFooter`, and adding a full-screen dismiss overlay.
- Comprehensive automated test coverage for all modified mobile components.

## Non-goals

- Building an instructor grading interface inside the mobile app (remains on Sentinel Web).
- Changing database schemas, ORM queries, or scoring algorithms in `@sentinel/shared`.

---

## Phases

- [ ] [`phase-01-question-rendering-and-empty-fallbacks.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/tasks/2026/08/2026-08-26/fix-mobile-questions-rendering-essay-grading-and-navigation-sheet/phase-01-question-rendering-and-empty-fallbacks.md) — Phase 1: Question rendering fallbacks and empty state card
- [ ] [`phase-02-essay-grading-parity-and-result-lifecycle.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/tasks/2026/08/2026-08-26/fix-mobile-questions-rendering-essay-grading-and-navigation-sheet/phase-02-essay-grading-parity-and-result-lifecycle.md) — Phase 2: Essay grading parity, pending review banner, and turn-in hook cleanup
- [ ] [`phase-03-question-navigator-sheet-ux-and-touch-controls.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/tasks/2026/08/2026-08-26/fix-mobile-questions-rendering-essay-grading-and-navigation-sheet/phase-03-question-navigator-sheet-ux-and-touch-controls.md) — Phase 3: Question navigator sheet touch responder fix, backdrop overlay, and toggle controls

---

## Verification

- `pnpm --filter sentinel-mobile test`: Runs Vitest test suite for mobile app components and hooks.
- Type check: `pnpm --filter sentinel-mobile exec tsc --noEmit`.
