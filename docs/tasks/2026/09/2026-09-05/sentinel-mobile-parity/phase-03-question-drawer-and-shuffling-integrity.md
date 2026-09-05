---
title: "Phase 3: Question Drawer & Navigation Integrity"
type: phase
status: completed
created: "2026-09-05"
tags: [phase, mobile, navigation, shuffling]
---

# Phase 3: Question Drawer & Navigation Integrity

## Goal

Fix question answered-state calculation in `QuestionDrawer` and maintain server-presented randomized order when `shuffleQuestions` is enabled.

## Tasks

1. Update `question-drawer.tsx`:
   - Replace brittle `!!answers[q.id]` check with robust `isQuestionAnswered(answers[q.id])`.
   - Update `answers` prop type to `Record<string, any>` to accurately reflect polymorphic answer values.
2. Update `mobile-exam-adapter.ts`:
   - Check `exam.settings?.shuffleQuestions || exam.configuration?.shuffleQuestions`.
   - When shuffle is enabled, preserve incoming question array order without sorting by `orderIndex`.
3. Update `question-drawer.test.tsx` and `mobile-exam-adapter.test.ts`:
   - Add tests verifying boolean `false`, empty array `[]`, and non-empty array `['A']` in drawer status.
   - Add test verifying shuffled order preservation.

## Verification Criteria

- [x] Automated tests pass: `pnpm --filter sentinel-mobile test`
- [x] Question drawer correctly shows green "Answered" indicator for boolean False, and grey "Unanswered" for empty array/object.
