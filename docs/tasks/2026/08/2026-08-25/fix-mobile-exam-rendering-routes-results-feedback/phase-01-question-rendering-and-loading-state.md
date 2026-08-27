---
title: "Phase 1: Question Rendering, ScrollView Flex Layout, and Loading Skeleton"
type: phase
parent: "fix-mobile-exam-rendering-routes-results-feedback"
phase: "1"
status: completed
created: "2026-08-25"
tags: [task, phase, mobile, question-card, flex, layout, loading]
---

# Phase 1: Question Rendering, ScrollView Flex Layout, and Loading Skeleton

## Objective

Fix the blank question viewport by enforcing explicit React Native `style={{ flex: 1 }}` on the session screen container and `QuestionCard` `ScrollView`. Add a centered loading indicator while the exam query is in flight to eliminate premature "Exam not found" text flashes.

## Dependencies & Prerequisites

- Existing `sentinel-mobile` session screen components and hooks.

## Impacted Files & Components

- `app/sentinel-mobile/features/exam/components/session/exam-session-screen.tsx`: Add `style={{ flex: 1, backgroundColor: colors.background }}` to root container. Render centered `ActivityIndicator` when `isLoading` is true.
- `app/sentinel-mobile/features/exam/components/session/question-card.tsx`: Add `style={{ flex: 1 }}` to `<ScrollView>`.
- `app/sentinel-mobile/features/exam/hooks/use-exam-session.ts`: Return `isLoading: isExamLoading` from `useExamQuery`.

## Implementation Tasks

- [x] In `use-exam-session.ts`, destructure `isLoading: isExamLoading` from `useExamQuery` and return `isLoading: isExamLoading` in the hook output.
- [x] In `exam-session-screen.tsx`, check `if (isLoading)` and render a centered `ActivityIndicator` with "Loading exam session..." before evaluating `if (!exam)`.
- [x] In `exam-session-screen.tsx`, ensure the root `<View>` has `style={{ flex: 1, backgroundColor: colors.background }}`.
- [x] In `question-card.tsx`, ensure `<ScrollView>` has `style={{ flex: 1 }}` alongside `contentContainerStyle={{ padding: 20, paddingBottom: 120 }}`.

## Verification & Testing

- Run unit tests:
  ```bash
  pnpm --filter sentinel-mobile test features/exam/hooks/use-exam-session.test.ts
  ```
  - Result: Passed 3/3 tests (31 passed across entire mobile test suite, 151 tests passed in 1.41s).

## Risks & Rollback

- Low risk: only affects presentation styles and loading states without modifying business logic.
