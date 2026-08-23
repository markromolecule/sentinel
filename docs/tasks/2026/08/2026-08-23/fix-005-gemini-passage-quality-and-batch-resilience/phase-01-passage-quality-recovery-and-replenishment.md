---
title: "Phase 1: Question Replacement & Replenishment on Persistent Passage Leaks"
type: phase
parent: "fix-005-gemini-passage-quality-and-batch-resilience"
phase: "1"
status: completed
created: "2026-08-23"
tags: [task, phase, ai, gemini, quality, replenishment]
---

# Phase 1: Question Replacement & Replenishment on Persistent Passage Leaks

## Objective

Prevent single unrepairable passage leaks from aborting the entire multi-question preview with a 502 error. Instead of throwing `PassageQualityValidationError`, discard the flawed question slot, mark it as a deficit, and trigger targeted question replenishment to replace it with a fresh question of the same type.

## Dependencies & Prerequisites

- Context Specification: `docs/context/August/23/fix-005-gemini-batch-size-and-network-stability.md`

## Impacted Files & Components

- `app/sentinel-api/src/lib/gemini/services/question-generator/orchestrator.ts`:
  - Update post-repair handling: If blocking passage failures remain after `MAX_PASSAGE_REPAIR_ROUNDS`, filter out the compromised slots from `reconciliation.slots`, calculate the deficit, and invoke `replenishQuestionDeficits` to generate clean replacements.
  - Re-run passage quality check on the replenished replacement questions.

## Implementation Tasks

- [x] **Task 1.1:** In `orchestrator.ts`, refactor the post-repair logic:
  - Identify any remaining `blockingFailures`.
  - If blocking failures exist, remove those flawed questions from `reconciliation.slots`.
  - Calculate the replacement deficits by type.
  - Call `replenishQuestionDeficits` for the replacement questions.
  - Re-validate the newly replenished questions through `assessPassageQuality`.
- [x] **Task 1.2:** Only throw `PassageQualityValidationError` if replenishment itself also repeatedly fails after max rounds.

## Verification & Testing

- `pnpm --dir app/sentinel-api test orchestrator.test.ts` (PASS: 4/4 tests)
- Assert that when 1 slot in a 40-question batch fails passage repair, it is replaced and the final response contains 40 valid questions.

## Risks & Rollback

- **Risk:** Infinite replenishment loop if every question leaks.
- **Mitigation:** Bounded by `MAX_DEFICIT_REPLENISHMENT_ROUNDS = 2`.

