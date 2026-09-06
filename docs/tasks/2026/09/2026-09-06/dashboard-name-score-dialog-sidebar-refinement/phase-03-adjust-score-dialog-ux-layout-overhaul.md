---
title: "Phase 3: Adjust Score Dialog UX & Layout Overhaul"
type: phase
parent: "dashboard-name-score-dialog-sidebar-refinement"
phase: "03"
status: completed
created: "2026-09-06"
completed: "2026-09-06"
tags: [task, phase, dialog, score-override, essay-ux]
---

# Phase 3: Adjust Score Dialog UX & Layout Overhaul

## Objective

Overhaul the layout and user experience of `AttemptReportOverrideDialog` in `sentinel-web` to comfortably accommodate long-form student essay responses. Transition from a cramped `sm:max-w-3xl` container to a spacious, responsive asymmetric 2-column modal (`w-[92vw] max-w-5xl`, `max-h-[88vh]`) featuring an expansive reader panel with word/character counts and smooth vertical scrolling, paired with an ergonomic score adjustment panel and sticky actions.

## Dependencies & Prerequisites

- Requires `@sentinel/ui` primitives (`Dialog`, `Button`, `Input`, `Textarea`, `Label`, `Badge`).

## Impacted Files & Components

- `app/sentinel-web/src/features/exams/reports/_components/attempt-report-override-dialog.tsx`
- `app/sentinel-web/src/features/exams/reports/_components/attempt-report-override-dialog.test.tsx` (new)
- `app/sentinel-web/src/features/exams/reports/attempt-report-view.test.tsx`

## Implementation Tasks

- [x] Redesign Dialog Container & Framing:
  - Upgraded modal sizing to `w-[92vw] max-w-5xl` with `max-h-[88vh] flex flex-col p-0 overflow-hidden`.
  - Header: Sticky header containing DialogTitle (`Adjust Score`), DialogDescription (`Adjust score for Question X`), question metadata pills (Question Type e.g. `ESSAY`, Max Score `5 pts`), and close button.
- [x] Build Asymmetric 2-Column Body (`md:grid-cols-12 gap-6 p-6 overflow-y-auto flex-1`):
  - **Left Panel (`md:col-span-7 lg:col-span-8 space-y-4`): Reader Panel**
    - Question Prompt Card: Elevated subtle container (`bg-slate-50/70 dark:bg-slate-900/40 p-4 rounded-lg border text-sm font-medium leading-relaxed`).
    - Student Answer Section:
      - Header row with "STUDENT'S ANSWER" uppercase label and a chip showing word count & character count (`X words • Y chars`).
      - Answer scrollbox: Spacious container with smooth vertical scrolling (`max-h-[46vh]`), generous padding, readable sans-serif typography (`font-sans leading-relaxed text-sm text-slate-800 dark:text-slate-200`) replacing monospace font.
      - Graceful fallback for blank or unattempted questions (*"No answer provided by student"*).
  - **Right Panel (`md:col-span-5 lg:col-span-4 space-y-5`): Scoring & Adjustment Card**
    - Context card displaying current awarded score vs total points (`X / Y pts`).
    - Override Score Input:
      - Numeric input bounded to `[0, selectedReport.maxScore]` with `step="0.1"`.
      - Helper text showing permitted scoring range.
    - Override Reason:
      - Expanded Textarea with `min-h-[140px] resize-none text-sm leading-relaxed`.
      - Clear placeholder indicating purpose of score adjustment rationale.
- [x] Sticky Footer:
  - Fixed at modal bottom with border-t:
    - Secondary `Cancel` button (`DialogClose`).
    - Primary `Done` button (`bg-[#323d8f] text-white hover:bg-[#323d8f]/90`).
- [x] Update & expand test coverage:
  - Created `attempt-report-override-dialog.test.tsx` covering dialog rendering, word count metrics, score/reason change events, and blank answer fallback.
  - Verified existing `attempt-report-view.test.tsx` integration test suite passes completely.

## Verification & Testing

- `pnpm --filter sentinel-web test src/features/exams/reports/_components/attempt-report-override-dialog.test.tsx`
  - Output: 4 passed (4 tests)
- `pnpm --filter sentinel-web test src/features/exams/reports/`
  - Output: 4 test files passed, 15 passed (15 tests total)

## Risks & Rollback

- **Risk:** Extreme viewport height constraints (e.g., small laptop screen 768px height).
- **Mitigation:** The outer dialog uses `max-h-[88vh]` with internal `flex-col`, and the inner grid has `overflow-y-auto` so the dialog adapts gracefully to any viewport height without clipping.
- **Rollback:** Revert changes to `attempt-report-override-dialog.tsx` in git.
