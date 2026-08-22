---
title: "Phase 01: Refactor Question Bank Selection & Modal Hooks"
type: phase
parent: "task-fix-react-error-185-max-update-depth"
phase: "01"
status: completed
created: "2026-08-22"
tags: [task, phase, react, bugfix, hooks]
---

# Phase 01: Refactor Question Bank Selection & Modal Hooks

## Objective

Eliminate infinite re-render loops in `useQuestionBankImportSelection` and `useQuestionBankImportModal` by removing circular and unstable object references from `useEffect` dependencies across `sentinel-web` and `sentinel-core`.

## Dependencies & Prerequisites

- Context Specification: [`docs/context/August/22/production-react-error-185-resolution.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/context/August/22/production-react-error-185-resolution.md)

## Impacted Files & Components

- `app/sentinel-web/src/features/exams/builder/_components/question-bank-import-modal/_hooks/use-question-bank-import-selection.ts`
- `app/sentinel-web/src/features/exams/builder/_components/question-bank-import-modal/_hooks/use-question-bank-import-modal.ts`
- `app/sentinel-core/src/features/exams/builder/_components/question-bank-import-modal/_hooks/use-question-bank-import-selection.ts`
- `app/sentinel-core/src/features/exams/builder/_components/question-bank-import-modal/_hooks/use-question-bank-import-modal.ts`

## Implementation Tasks

- [x] **Task 1 (`use-question-bank-import-selection.ts`):**
  - Accept optional `initialAlreadyAddedIds` in `useQuestionBankImportSelection`.
  - Maintain a ref for `selectedQuestionsById` (`selectedQuestionsByIdRef`).
  - Prune incompatible items in `useEffect` when `allowedQuestionType` changes without depending on `selectedQuestionsById`.
  - Return early from `setSelectedQuestionsById` if no changes occurred to prevent reference churn.
- [x] **Task 2 (`use-question-bank-import-modal.ts`):**
  - Pass `alreadyAddedIds` to `useQuestionBankImportSelection(allowedQuestionType, alreadyAddedIds)`.
  - Fix `useEffect` to avoid depending on the unstable `selection` object reference, using stable setter dispatcher `setAlreadyAddedIds`.
- [x] **Task 3 (Core Parity):**
  - Apply the exact same enhancements to `app/sentinel-core`.

## Verification & Testing

- `pnpm --filter sentinel-web test use-question-bank-import-selection.test.ts` (PASS: 2/2 tests in 9ms)
- `pnpm --filter sentinel-web test use-question-bank-import-modal.test.ts` (PASS: 1/1 test in 7ms)
- `pnpm --filter sentinel-core test use-question-bank-import-selection.test.ts` (PASS: 2/2 tests in 9ms)
- `pnpm --filter sentinel-core test use-question-bank-import-modal.test.ts` (PASS: 1/1 test in 8ms)

## Risks & Rollback

- Zero breaking API changes to consumer components (`QuestionBankImportModal`).
