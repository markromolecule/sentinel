---
title: "Phase 1: Question Rendering & Query Normalization"
type: phase
parent: "Fix Mobile Exam Questions, Evidence Upload, Feedback Screen, and LiveKit Streaming"
phase: "1"
status: completed
created: "2026-08-25"
tags: [task, phase, mobile, questions]
---

# Phase 1: Question Rendering & Query Normalization

## Objective

Ensure that all exam questions, prompts, points, and answer choices render reliably on Sentinel Mobile's exam session screen without blank views or layout breakages.

---

## Dependencies & Prerequisites

- Context specification approved: `docs/context/August/25/fix-mobile-exam-questions-evidence-feedback-livekit.md`.

---

## Impacted Files & Components

- [`app/sentinel-mobile/features/exam/hooks/use-exam-session.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/features/exam/hooks/use-exam-session.ts)
- [`app/sentinel-mobile/features/exam/lib/mobile-exam-adapter.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/features/exam/lib/mobile-exam-adapter.ts)
- [`app/sentinel-mobile/features/exam/lib/mobile-exam-adapter.test.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/features/exam/lib/mobile-exam-adapter.test.ts)
- [`app/sentinel-mobile/features/exam/components/session/question-card.tsx`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/features/exam/components/session/question-card.tsx)

---

## Implementation Tasks

- [x] Update `use-exam-session.ts` to call `useExamQuery(id, { viewer: 'student' })` to receive sanitized questions consistently.
- [x] Enhance `adaptExamQuestionsForMobile` in `mobile-exam-adapter.ts`:
  - Extract prompt defensively: `content?.prompt || (content as any)?.question || (content as any)?.text || question.passageContent || ''`.
  - Enhance `getChoiceOptions`: support string arrays `['Option 1', 'Option 2']` as well as object arrays `[{ id: '1', text: 'Option 1' }]` and `{ label: 'Option 1', value: '1' }`.
  - Handle JSON parsed content if `content` is passed as a string.
- [x] Ensure `QuestionCard` gracefully renders empty prompts with a descriptive fallback and handles all question types.
- [x] Add unit tests in `mobile-exam-adapter.test.ts` covering missing fields, object choices, and sanitized student attempt questions.

---

## Verification & Testing

- Run mobile unit tests:

  ```bash
  pnpm --filter sentinel-mobile test
  ```

  - **Result**: 30/30 test files passed (147 tests passed).
  - `mobile-exam-adapter.test.ts` passed 18/18 test cases.

---

## Risks & Rollback

- **Risk**: Choice IDs changed in adapter could affect answers submission mapping.
- **Mitigation**: `buildSessionAnswerPayload` in `mobile-exam-adapter.ts` preserves existing option text resolution.
