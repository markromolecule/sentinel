---
title: "Phase 1: Question Rendering Fallbacks and Empty State Card"
type: phase
parent: "fix-mobile-questions-rendering-essay-grading-and-navigation-sheet"
phase: "01"
status: planned
created: "2026-08-26"
tags: [task, phase, mobile, question-rendering]
---

# Phase 1: Question Rendering Fallbacks and Empty State Card

## Objective

Ensure all question types on mobile render reliably with prompt text and choices, eliminate empty blank viewports when questions are unavailable or resolving, and provide clean fallbacks.

## Dependencies & Prerequisites

- Context Specification: [`docs/context/August/26/fix-mobile-questions-rendering-essay-grading-and-navigation-sheet.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/context/August/26/fix-mobile-questions-rendering-essay-grading-and-navigation-sheet.md)

## Impacted Files & Components

- [`app/sentinel-mobile/features/exam/components/session/question-card.tsx`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/features/exam/components/session/question-card.tsx): Add graceful fallback UI for unavailable or malformed question records.
- [`app/sentinel-mobile/features/exam/components/session/exam-session-screen.tsx`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/features/exam/components/session/exam-session-screen.tsx): Add empty state container when `questions.length === 0`.
- [`app/sentinel-mobile/features/exam/lib/mobile-exam-adapter.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/features/exam/lib/mobile-exam-adapter.ts): Enhance prompt and choice extraction for all question types.
- [`app/sentinel-mobile/features/exam/components/session/question-card.test.tsx`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/features/exam/components/session/question-card.test.tsx): Update unit tests covering fallbacks and question type variations.

## Implementation Tasks

- [ ] In `question-card.tsx`:
  - Replace `if (!question) return null;` with a styled, accessible container displaying an informative message ("Question details are currently unavailable.") rather than rendering empty blank space.
  - Ensure all normalized question types (`MULTIPLE_CHOICE`, `MULTIPLE_RESPONSE`, `TRUE_FALSE`, `IDENTIFICATION`, `ESSAY`, `FILL_BLANK`, `ENUMERATION`, `MATCHING`, `SHORT_ANSWER`) render cleanly.
- [ ] In `exam-session-screen.tsx`:
  - When `!isLoading && questions.length === 0`, render a centered empty-state card with icon and description ("No questions assigned to this exam yet.") instead of a blank screen.
- [ ] In `mobile-exam-adapter.ts`:
  - Defensively extract prompts across all possible properties (`prompt`, `question`, `text`, `title`) and fallback to generic text only if completely absent.
- [ ] In `question-card.test.tsx`:
  - Add test cases verifying fallback rendering when `question` is null/undefined or has missing prompt text.

## Verification & Testing

- Run test command:

  ```bash
  pnpm --filter sentinel-mobile test features/exam/components/session/question-card.test.tsx
  ```

## Risks & Rollback

- **Risk:** Styling regressions in question card padding.
- **Mitigation:** Retain existing `contentContainerStyle` with `paddingBottom: 140` to avoid footer overlaps.
- **Rollback:** Revert modifications to `question-card.tsx` and `mobile-exam-adapter.ts`.
