---
title: "Phase 2: Question Engine Display & Type Parity"
type: phase
status: completed
created: "2026-09-05"
tags: [phase, mobile, questions, ui-parity]
---

# Phase 2: Question Engine Display & Type Parity

## Goal

Ensure all 8 question types (`MULTIPLE_CHOICE`, `MULTIPLE_RESPONSE`, `TRUE_FALSE`, `IDENTIFICATION`, `ESSAY`, `ENUMERATION`, `MATCHING`, `FILL_BLANK`) display properly with clear option labels, points, and accurate value selection.

## Tasks

1. Update `question-card.tsx`:
   - Add point indicators (`{points} pt` / `{points} pts`) in the header next to question count.
   - For `MULTIPLE_CHOICE` and `MULTIPLE_RESPONSE`: Add option letter pills (`A.`, `B.`, `C.`, `D.`) beside each choice text.
   - For `TRUE_FALSE`: Support boolean `true`/`false` as well as string `'true'`/`'false'` in `selectedSingleId` so selections remain properly highlighted.
   - For `ENUMERATION`: Render multiple numbered item inputs (`Item 1`, `Item 2`, `Item 3`) with minimum default fallback.
2. Update `question-card.test.tsx`:
   - Add assertions for option letter badges and points display across all question types.

## Verification Criteria

- [x] Automated tests pass: `pnpm --filter sentinel-mobile test`
- [x] QuestionCard renders all 8 question types cleanly in light and dark mode.
